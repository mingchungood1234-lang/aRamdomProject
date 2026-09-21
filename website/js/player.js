/**
 * YouTube & Native Audio Player Manager - Default YouTube Mobile Edition
 * Supports YouTube native controls and dual-engine progress bar for both video and audio.
 */
class YouTubePlayerManager {
  constructor() {
    this.player = null;
    this.isReady = false;
    this.currentVideoId = null;
    this.currentVideoInfo = null;
    this.isAudioOnlyMode = false;
    this.isNativeAudioActive = false;
    this.isDraggingProgress = false;
    this.trackingInterval = null;

    this.nativeAudio = null;

    this.initNativeAudio();
    this.initYouTubeAPI();
    this.initProgressControls();
    this.connectBackgroundAudio();
    this.setupVisibilityHandoff();
    this.startContinuousTracking();
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
      this.updateAudioControlsUI(true);
      if (window.backgroundAudio) {
        window.backgroundAudio.updatePlaybackState(
          true,
          this.nativeAudio.currentTime,
          this.nativeAudio.duration
        );
      }
    });

    this.nativeAudio.addEventListener('pause', () => {
      this.updateAudioControlsUI(false);
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

      this.updateProgress(current, duration);

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
   * Initialize interactive scrubber progress bar for both video and audio
   */
  initProgressControls() {
    const slider = document.getElementById('yt-progress-slider');
    const bar = document.getElementById('yt-progress-bar');
    const timeCurrent = document.getElementById('yt-time-current');

    if (slider) {
      slider.addEventListener('input', (e) => {
        this.isDraggingProgress = true;
        const percent = parseFloat(e.target.value);
        if (bar) bar.style.width = `${percent}%`;

        const duration = this.getDuration();
        if (duration > 0 && timeCurrent) {
          const seekSec = (percent / 100) * duration;
          timeCurrent.textContent = this.formatTime(seekSec);
        }
      });

      slider.addEventListener('change', (e) => {
        this.isDraggingProgress = false;
        const percent = parseFloat(e.target.value);
        const duration = this.getDuration();
        if (duration > 0) {
          const seekSec = (percent / 100) * duration;
          this.seekTo(seekSec);
        }
      });
    }
  }

  /**
   * Real-time progress bar updater
   */
  updateProgress(current, duration) {
    if (this.isDraggingProgress) return;

    const bar = document.getElementById('yt-progress-bar');
    const slider = document.getElementById('yt-progress-slider');
    const timeCurrent = document.getElementById('yt-time-current');
    const timeDuration = document.getElementById('yt-time-duration');

    const percent = duration > 0 ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0;

    if (bar) bar.style.width = `${percent}%`;
    if (slider) slider.value = percent;
    if (timeCurrent) timeCurrent.textContent = this.formatTime(current);
    if (timeDuration && duration > 0) timeDuration.textContent = this.formatTime(duration);
  }

  /**
   * Continuous tracking loop for iframe video playback
   */
  startContinuousTracking() {
    if (this.trackingInterval) clearInterval(this.trackingInterval);

    this.trackingInterval = setInterval(() => {
      if (this.isNativeAudioActive) return; // Native audio uses 'timeupdate' event

      if (this.isPlaying()) {
        const current = this.getCurrentTime();
        const duration = this.getDuration();
        this.updateProgress(current, duration);

        if (window.backgroundAudio) {
          window.backgroundAudio.updatePlaybackState(true, current, duration);
        }
      }
    }, 250);
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

    this.player = new YT.Player('yt-player-container', {
      height: '100%',
      width: '100%',
      videoId: videoId,
      host: 'https://www.youtube-nocookie.com',
      playerVars: {
        autoplay: 1,
        playsinline: 1,
        controls: 1,           // Native YouTube controls
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

    this.updateProgress(currentTime, duration);

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

    this.updateAudioControlsUI(true);

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

    this.updatePlayerUI();

    if (this.isAudioOnlyMode) {
      this.switchToNativeAudio(currentTime, isCurrentlyPlaying);
    } else {
      this.switchToIframe(currentTime, isCurrentlyPlaying);
    }
  }

  updateAudioControlsUI(isPlaying) {
    const btn = document.getElementById('btn-audio-play-toggle');
    if (!btn) return;

    if (isPlaying) {
      btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
    } else {
      btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
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

  togglePlay() {
    if (this.isPlaying()) {
      this.pause();
    } else {
      this.play();
    }
  }

  seekTo(seconds) {
    const target = Math.max(0, seconds);
    if (this.isNativeAudioActive && this.nativeAudio) {
      this.nativeAudio.currentTime = target;
    } else if (this.player && this.player.seekTo) {
      this.player.seekTo(target, true);
    }
    this.updateProgress(target, this.getDuration());
  }

  seekRelative(offsetSeconds) {
    const target = this.getCurrentTime() + offsetSeconds;
    this.seekTo(target);
  }

  updatePlayerUI() {
    if (!this.currentVideoInfo) return;

    const watchSection = document.getElementById('yt-watch-section');
    const titleEl = document.getElementById('yt-video-title');
    const channelNameEl = document.getElementById('yt-channel-name');
    const avatarEl = document.getElementById('yt-channel-avatar');
    const metaEl = document.getElementById('yt-video-views-date');

    // Audio Mode Banner Elements
    const audioThumbEl = document.getElementById('yt-audio-banner-thumb');
    const audioTitleEl = document.getElementById('yt-audio-banner-title');
    const audioChannelEl = document.getElementById('yt-audio-banner-channel');

    if (titleEl) titleEl.textContent = this.currentVideoInfo.title;
    if (channelNameEl) channelNameEl.textContent = this.currentVideoInfo.channel;
    if (avatarEl) {
      const initial = (this.currentVideoInfo.channel || 'Y').charAt(0).toUpperCase();
      avatarEl.textContent = initial;
    }
    if (metaEl) {
      metaEl.textContent = `1.4M views • Ad-Free Background Playback`;
    }

    if (audioThumbEl) audioThumbEl.src = this.currentVideoInfo.thumbnail;
    if (audioTitleEl) audioTitleEl.textContent = this.currentVideoInfo.title;
    if (audioChannelEl) audioChannelEl.textContent = this.currentVideoInfo.channel;

    if (watchSection) {
      watchSection.style.display = 'block';
    }

    const current = this.getCurrentTime();
    const duration = this.getDuration();
    this.updateProgress(current, duration);
  }

  formatTime(seconds) {
    const sec = Math.floor(seconds);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }
}

window.playerManager = new YouTubePlayerManager();
