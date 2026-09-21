/**
 * YouTube & Native Audio Player Manager - Default YouTube Mobile Edition
 * Uses YouTube's official native player controls (controls: 1) for on-screen playback,
 * and seamlessly powers unbroken background audio via the host streaming server (/api/stream?v=...).
 */
class YouTubePlayerManager {
  constructor() {
    this.player = null;
    this.isReady = false;
    this.currentVideoId = null;
    this.currentVideoInfo = null;
    this.isAudioOnlyMode = false;
    this.isNativeAudioActive = false;

    this.nativeAudio = null;

    this.initNativeAudio();
    this.initYouTubeAPI();
    this.connectBackgroundAudio();
    this.setupVisibilityHandoff();
  }

  /**
   * Initialize native HTML5 <audio> element for host streaming
   */
  initNativeAudio() {
    this.nativeAudio = document.getElementById('native-audio');
    if (!this.nativeAudio) {
      this.nativeAudio = document.createElement('audio');
      this.nativeAudio.id = 'native-audio';
      this.nativeAudio.preload = 'auto';
      this.nativeAudio.setAttribute('playsinline', '');
      this.nativeAudio.style.display = 'none';
      document.body.appendChild(this.nativeAudio);
    }

    this.nativeAudio.addEventListener('play', () => {
      if (window.backgroundAudio) {
        window.backgroundAudio.updatePlaybackState(
          true,
          this.nativeAudio.currentTime,
          this.nativeAudio.duration
        );
      }
    });

    this.nativeAudio.addEventListener('pause', () => {
      if (window.backgroundAudio) {
        window.backgroundAudio.updatePlaybackState(
          false,
          this.nativeAudio.currentTime,
          this.nativeAudio.duration
        );
      }
    });

    this.nativeAudio.addEventListener('timeupdate', () => {
      if (!this.isNativeAudioActive) return;
      const current = this.nativeAudio.currentTime || 0;
      const duration = this.nativeAudio.duration || (this.currentVideoInfo ? this.currentVideoInfo.duration : 0) || 0;

      if (window.backgroundAudio) {
        window.backgroundAudio.updatePlaybackState(true, current, duration);
      }
    });

    this.nativeAudio.addEventListener('ended', () => {
      if (window.app && window.app.playNextTrack) {
        window.app.playNextTrack();
      }
    });

    this.nativeAudio.addEventListener('error', (e) => {
      console.warn('[NativeAudio] Stream error, falling back to iframe:', e);
      if (this.isAudioOnlyMode) {
        this.toggleAudioOnlyMode();
      }
    });
  }

  /**
   * Automatic background handoff:
   * When user locks the screen or switches apps, ensure native audio keeps playing
   */
  setupVisibilityHandoff() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        if (this.isPlaying() && !this.isNativeAudioActive && this.currentVideoId) {
          console.log('[PlayerManager] Background detected: switching to native stream');
          const currentSec = this.getCurrentTime();
          this.switchToNativeAudio(currentSec, true);
        }
      }
    });
  }

  /**
   * Load YouTube IFrame API script asynchronously
   */
  initYouTubeAPI() {
    if (window.YT && window.YT.Player) {
      this.onAPIReady();
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode.insertBefore(tag, firstScript);

    window.onYouTubeIframeAPIReady = () => {
      this.onAPIReady();
    };
  }

  onAPIReady() {
    this.isReady = true;
    console.log('[PlayerManager] YouTube IFrame API Ready.');
    if (this.currentVideoId && !this.player && !this.isAudioOnlyMode) {
      this.createPlayer(this.currentVideoId);
    }
  }

  connectBackgroundAudio() {
    if (!window.backgroundAudio) return;

    window.backgroundAudio.setPlayerCallbacks({
      onPlay: () => this.play(),
      onPause: () => this.pause(),
      onSeek: (seconds, isRelative = false) => {
        const current = this.getCurrentTime();
        const target = isRelative ? current + seconds : seconds;
        this.seekTo(target);
      },
      onNext: () => {
        if (window.app && window.app.playNextTrack) {
          window.app.playNextTrack();
        }
      },
      onPrev: () => {
        if (window.app && window.app.playPrevTrack) {
          window.app.playPrevTrack();
        }
      }
    });
  }

  extractVideoId(input) {
    if (!input) return null;
    const clean = input.trim();

    if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
      return clean;
    }

    const patterns = [
      /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
      const match = clean.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  loadVideo(videoIdOrUrl, customInfo = null) {
    const videoId = this.extractVideoId(videoIdOrUrl);
    if (!videoId) {
      alert('Invalid YouTube URL or Video ID. Please check and try again.');
      return false;
    }

    this.currentVideoId = videoId;
    this.currentVideoInfo = customInfo || {
      id: videoId,
      title: 'YouTube Video',
      channel: 'YouTube',
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      duration: 0
    };

    this.updatePlayerUI();
    this.fetchServerMetadata(videoId);

    if (this.isAudioOnlyMode) {
      this.switchToNativeAudio(0, true);
      return true;
    }

    this.isNativeAudioActive = false;
    if (this.nativeAudio) {
      this.nativeAudio.pause();
    }

    if (!this.isReady) {
      console.log('[PlayerManager] API not ready yet, queuing video:', videoId);
      return true;
    }

    if (!this.player) {
      this.createPlayer(videoId);
    } else {
      this.player.loadVideoById({
        videoId: videoId,
        suggestedQuality: 'hd720'
      });
    }

    return true;
  }

  async fetchServerMetadata(videoId) {
    try {
      const res = await fetch(`/api/info?v=${videoId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.title && this.currentVideoId === videoId) {
          this.currentVideoInfo = {
            ...this.currentVideoInfo,
            title: data.title,
            channel: data.channel,
            thumbnail: data.thumbnail,
            duration: data.duration
          };
          this.updatePlayerUI();
          if (window.backgroundAudio) {
            window.backgroundAudio.updateMetadata({
              title: data.title,
              artist: data.channel,
              thumbnail: data.thumbnail,
              duration: data.duration
            });
          }
        }
      }
    } catch (e) {}
  }

  createPlayer(videoId) {
    const container = document.getElementById('yt-player-container');
    if (!container) return;

    // Notice: controls: 1 activates YouTube's official native player controls
    this.player = new YT.Player('yt-player-container', {
      height: '100%',
      width: '100%',
      videoId: videoId,
      host: 'https://www.youtube-nocookie.com',
      playerVars: {
        autoplay: 1,
        playsinline: 1,
        controls: 1,           // DEFAULT NATIVE YOUTUBE CONTROLS (red bar, gear, fullscreen)
        rel: 0,
        fs: 1,
        enablejsapi: 1,
        origin: window.location.origin
      },
      events: {
        onReady: (event) => this.onPlayerReady(event),
        onStateChange: (event) => this.onPlayerStateChange(event),
        onError: (event) => this.onPlayerError(event)
      }
    });
  }

  onPlayerReady(event) {
    console.log('[PlayerManager] YouTube Native Player ready, playing...');
    if (!this.isAudioOnlyMode) {
      event.target.playVideo();
    }
    this.updatePlayerUI();
  }

  onPlayerStateChange(event) {
    if (this.isNativeAudioActive) return;

    const state = event.data;
    const isPlaying = state === 1;

    const currentTime = this.getCurrentTime();
    const duration = this.getDuration();

    if (window.backgroundAudio) {
      window.backgroundAudio.updatePlaybackState(isPlaying, currentTime, duration);

      if (this.currentVideoInfo) {
        window.backgroundAudio.updateMetadata({
          title: this.currentVideoInfo.title,
          artist: this.currentVideoInfo.channel,
          thumbnail: this.currentVideoInfo.thumbnail,
          duration: duration
        });
      }
    }

    if (state === 0 && window.app && window.app.playNextTrack) {
      window.app.playNextTrack();
    }
  }

  onPlayerError(event) {
    console.error('[PlayerManager] IFrame error code:', event.data);
    this.switchToNativeAudio(0, true);
  }

  switchToNativeAudio(startTime = 0, autoplay = true) {
    if (!this.currentVideoId || !this.nativeAudio) return;

    this.isNativeAudioActive = true;

    if (this.player && this.player.pauseVideo) {
      try {
        this.player.pauseVideo();
      } catch (e) {}
    }

    const streamUrl = `/api/stream?v=${this.currentVideoId}`;
    if (this.nativeAudio.src !== window.location.origin + streamUrl) {
      this.nativeAudio.src = streamUrl;
    }

    if (startTime > 0) {
      this.nativeAudio.currentTime = startTime;
    }

    if (autoplay) {
      this.nativeAudio.play().catch(() => {});
    }

    if (window.backgroundAudio && this.currentVideoInfo) {
      window.backgroundAudio.updateMetadata({
        title: this.currentVideoInfo.title,
        artist: this.currentVideoInfo.channel,
        thumbnail: this.currentVideoInfo.thumbnail,
        duration: this.currentVideoInfo.duration || 0
      });
    }
  }

  switchToIframe(startTime = 0, autoplay = true) {
    this.isNativeAudioActive = false;

    if (this.nativeAudio) {
      this.nativeAudio.pause();
    }

    if (this.player) {
      if (startTime > 0) {
        this.player.seekTo(startTime, true);
      }
      if (autoplay) {
        this.player.playVideo();
      }
    } else if (this.currentVideoId) {
      this.createPlayer(this.currentVideoId);
    }
  }

  toggleAudioOnlyMode() {
    this.isAudioOnlyMode = !this.isAudioOnlyMode;
    const watchSection = document.getElementById('yt-watch-section');
    const toggleBtn = document.getElementById('btn-audio-only');
    const label = document.getElementById('audio-mode-label');

    if (watchSection) {
      watchSection.classList.toggle('audio-only-mode', this.isAudioOnlyMode);
    }
    if (toggleBtn) {
      toggleBtn.classList.toggle('active', this.isAudioOnlyMode);
    }
    if (label) {
      label.textContent = this.isAudioOnlyMode ? 'Audio Stream (Active)' : 'Background Audio';
    }

    const currentTime = this.getCurrentTime();
    const isCurrentlyPlaying = this.isPlaying();

    if (this.isAudioOnlyMode) {
      this.switchToNativeAudio(currentTime, isCurrentlyPlaying);
    } else {
      this.switchToIframe(currentTime, isCurrentlyPlaying);
    }
  }

  isPlaying() {
    if (this.isNativeAudioActive && this.nativeAudio) {
      return !this.nativeAudio.paused && !this.nativeAudio.ended;
    }
    if (this.player && this.player.getPlayerState) {
      return this.player.getPlayerState() === 1;
    }
    return false;
  }

  getCurrentTime() {
    if (this.isNativeAudioActive && this.nativeAudio) {
      return this.nativeAudio.currentTime || 0;
    }
    if (this.player && this.player.getCurrentTime) {
      return this.player.getCurrentTime() || 0;
    }
    return 0;
  }

  getDuration() {
    if (this.isNativeAudioActive && this.nativeAudio && this.nativeAudio.duration) {
      return this.nativeAudio.duration;
    }
    if (this.player && this.player.getDuration) {
      return this.player.getDuration() || 0;
    }
    return (this.currentVideoInfo && this.currentVideoInfo.duration) || 0;
  }

  play() {
    if (this.isNativeAudioActive && this.nativeAudio) {
      this.nativeAudio.play().catch(() => {});
    } else if (this.player && this.player.playVideo) {
      this.player.playVideo();
    }
  }

  pause() {
    if (this.isNativeAudioActive && this.nativeAudio) {
      this.nativeAudio.pause();
    } else if (this.player && this.player.pauseVideo) {
      this.player.pauseVideo();
    }
  }

  seekTo(seconds) {
    const target = Math.max(0, seconds);
    if (this.isNativeAudioActive && this.nativeAudio) {
      this.nativeAudio.currentTime = target;
    } else if (this.player && this.player.seekTo) {
      this.player.seekTo(target, true);
    }
  }

  updatePlayerUI() {
    if (!this.currentVideoInfo) return;

    const watchSection = document.getElementById('yt-watch-section');
    const titleEl = document.getElementById('yt-video-title');
    const channelNameEl = document.getElementById('yt-channel-name');
    const avatarEl = document.getElementById('yt-channel-avatar');
    const metaEl = document.getElementById('yt-video-views-date');

    if (titleEl) titleEl.textContent = this.currentVideoInfo.title;
    if (channelNameEl) channelNameEl.textContent = this.currentVideoInfo.channel;
    if (avatarEl) {
      const initial = (this.currentVideoInfo.channel || 'Y').charAt(0).toUpperCase();
      avatarEl.textContent = initial;
    }
    if (metaEl) {
      metaEl.textContent = `1.4M views • Ad-Free Background Playback`;
    }

    if (watchSection) {
      watchSection.style.display = 'block';
    }
  }

  formatTime(seconds) {
    const sec = Math.floor(seconds);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }
}

window.playerManager = new YouTubePlayerManager();
