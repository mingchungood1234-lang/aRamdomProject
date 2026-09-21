/**
 * YouTube & Native Audio Player Manager
 * Supports:
 * - YouTube IFrame player for visual video playback
 * - Native HTML5 <audio> player (/api/stream?v=...) for 100% reliable iOS/mobile background playback
 * - Seamless handoff and synchronization with MediaSession Lock Screen controls
 */
class YouTubePlayerManager {
  constructor() {
    this.player = null;
    this.isReady = false;
    this.currentVideoId = null;
    this.currentVideoInfo = null;
    this.playbackInterval = null;
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

    // Native audio event listeners
    this.nativeAudio.addEventListener('play', () => {
      this.updatePlayButtonIcon(true);
      if (window.backgroundAudio) {
        window.backgroundAudio.updatePlaybackState(
          true,
          this.nativeAudio.currentTime,
          this.nativeAudio.duration
        );
      }
    });

    this.nativeAudio.addEventListener('pause', () => {
      this.updatePlayButtonIcon(false);
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

      const scrubber = document.getElementById('player-scrubber');
      const timeCurrent = document.getElementById('time-current');
      const timeDuration = document.getElementById('time-duration');

      if (duration > 0 && scrubber && !scrubber.matches(':active')) {
        scrubber.value = (current / duration) * 100;
      }
      if (timeCurrent) timeCurrent.textContent = this.formatTime(current);
      if (timeDuration && duration > 0) timeDuration.textContent = this.formatTime(duration);

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
        this.toggleAudioOnlyMode(); // revert to iframe mode
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
        // Tab went to background or phone was locked
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

  /**
   * Connect with Lock Screen & MediaSession Controller
   */
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

  /**
   * Extract 11-char YouTube Video ID from any URL format or raw ID
   */
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

  /**
   * Load and play video
   */
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

    // Fetch rich metadata & warm up audio stream on server
    this.fetchServerMetadata(videoId);

    // If Audio-Only Mode is enabled: play via native audio stream immediately
    if (this.isAudioOnlyMode) {
      this.switchToNativeAudio(0, true);
      return true;
    }

    // Otherwise play visual video via YouTube IFrame
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
    } catch (e) {
      // Backend not available or running in standalone static mode
    }
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
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3,
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
    console.log('[PlayerManager] Player ready, starting playback...');
    if (!this.isAudioOnlyMode) {
      event.target.playVideo();
    }
    this.updatePlayerUI();
    this.startTracking();
  }

  onPlayerStateChange(event) {
    if (this.isNativeAudioActive) return;

    const state = event.data;
    const isPlaying = state === 1;

    this.updatePlayButtonIcon(isPlaying);

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
    // Automatically fallback to host native audio stream
    console.log('[PlayerManager] Attempting fallback to host audio stream...');
    this.switchToNativeAudio(0, true);
  }

  /**
   * Switch playback engine to native HTML5 <audio> element (/api/stream)
   * This is what gives 100% unbroken background audio on iOS Safari!
   */
  switchToNativeAudio(startTime = 0, autoplay = true) {
    if (!this.currentVideoId || !this.nativeAudio) return;

    this.isNativeAudioActive = true;

    // Pause YouTube iframe
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
      this.nativeAudio.play().catch((err) => {
        console.warn('[NativeAudio] Play was blocked or failed:', err);
      });
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

  /**
   * Switch playback engine back to YouTube IFrame player
   */
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

  /**
   * Toggle between Visual Mode and Audio-Only Background Stream Mode
   */
  toggleAudioOnlyMode() {
    this.isAudioOnlyMode = !this.isAudioOnlyMode;
    const playerCard = document.getElementById('player-card');
    const toggleBtn = document.getElementById('btn-audio-only');

    if (playerCard) {
      playerCard.classList.toggle('audio-only-mode', this.isAudioOnlyMode);
    }
    if (toggleBtn) {
      toggleBtn.classList.toggle('active', this.isAudioOnlyMode);
      const span = toggleBtn.querySelector('span');
      if (span) {
        span.textContent = this.isAudioOnlyMode ? 'Audio Stream Active' : 'Audio Only';
      }
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
  }

  seekRelative(offsetSeconds) {
    const target = this.getCurrentTime() + offsetSeconds;
    this.seekTo(target);
  }

  startTracking() {
    if (this.playbackInterval) clearInterval(this.playbackInterval);

    this.playbackInterval = setInterval(() => {
      if (this.isNativeAudioActive) return; // Native audio uses 'timeupdate' event

      if (!this.player || !this.player.getCurrentTime) return;

      const current = this.player.getCurrentTime() || 0;
      const duration = this.player.getDuration() || 0;
      const state = this.player.getPlayerState ? this.player.getPlayerState() : -1;
      const isPlaying = state === 1;

      const scrubber = document.getElementById('player-scrubber');
      const timeCurrent = document.getElementById('time-current');
      const timeDuration = document.getElementById('time-duration');

      if (duration > 0 && scrubber && !scrubber.matches(':active')) {
        scrubber.value = (current / duration) * 100;
      }
      if (timeCurrent) timeCurrent.textContent = this.formatTime(current);
      if (timeDuration && duration > 0) timeDuration.textContent = this.formatTime(duration);

      if (window.backgroundAudio && isPlaying) {
        window.backgroundAudio.updatePlaybackState(true, current, duration);
      }
    }, 1000);
  }

  updatePlayerUI() {
    if (!this.currentVideoInfo) return;

    const titleEl = document.getElementById('current-video-title');
    const channelEl = document.getElementById('current-video-channel');
    const miniTitleEl = document.getElementById('mini-player-title');
    const miniChannelEl = document.getElementById('mini-player-channel');
    const miniThumbEl = document.getElementById('mini-player-thumb');

    if (titleEl) titleEl.textContent = this.currentVideoInfo.title;
    if (channelEl) channelEl.textContent = this.currentVideoInfo.channel;
    if (miniTitleEl) miniTitleEl.textContent = this.currentVideoInfo.title;
    if (miniChannelEl) miniChannelEl.textContent = this.currentVideoInfo.channel;
    if (miniThumbEl) miniThumbEl.src = this.currentVideoInfo.thumbnail;

    const playerDock = document.getElementById('player-dock');
    if (playerDock) playerDock.classList.add('active');
  }

  updatePlayButtonIcon(isPlaying) {
    const playIcons = document.querySelectorAll('.icon-play-toggle');
    playIcons.forEach((btn) => {
      if (isPlaying) {
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
      } else {
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
      }
    });
  }

  formatTime(seconds) {
    const sec = Math.floor(seconds);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }
}

window.playerManager = new YouTubePlayerManager();
