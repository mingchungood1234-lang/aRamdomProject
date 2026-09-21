/**
 * YouTube IFrame Player Manager
 * Manages player lifecycle, video loading, playback state, and background audio synchronization
 */
class YouTubePlayerManager {
  constructor() {
    this.player = null;
    this.isReady = false;
    this.currentVideoId = null;
    this.currentVideoInfo = null;
    this.playbackInterval = null;
    this.isAudioOnlyMode = false;

    this.initYouTubeAPI();
    this.connectBackgroundAudio();
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
    // If a video was queued before API loaded, play it now
    if (this.currentVideoId && !this.player) {
      this.createPlayer(this.currentVideoId);
    }
  }

  /**
   * Connect with Background Audio Controller
   */
  connectBackgroundAudio() {
    if (!window.backgroundAudio) return;

    window.backgroundAudio.setPlayerCallbacks({
      onPlay: () => this.play(),
      onPause: () => this.pause(),
      onSeek: (seconds, isRelative = false) => {
        if (!this.player || !this.player.getCurrentTime) return;
        const current = this.player.getCurrentTime();
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

    // Raw 11-char ID check
    if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
      return clean;
    }

    // Standard URL patterns
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
   * Initialize or replace the YouTube Player
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
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    };

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
      this.updatePlayerUI();
    }

    return true;
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
    event.target.playVideo();
    this.updatePlayerUI();
    this.startTracking();
  }

  onPlayerStateChange(event) {
    const state = event.data;
    // YT.PlayerState: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
    const isPlaying = state === 1;

    this.updatePlayButtonIcon(isPlaying);

    const currentTime = this.player.getCurrentTime ? this.player.getCurrentTime() : 0;
    const duration = this.player.getDuration ? this.player.getDuration() : 0;

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
    console.error('[PlayerManager] Player error code:', event.data);
    alert('This video cannot be embedded or is restricted by the creator.');
  }

  /**
   * Continuous tracking for time scrubber & lock screen updates
   */
  startTracking() {
    if (this.playbackInterval) clearInterval(this.playbackInterval);

    this.playbackInterval = setInterval(() => {
      if (!this.player || !this.player.getCurrentTime) return;

      const current = this.player.getCurrentTime() || 0;
      const duration = this.player.getDuration() || 0;
      const state = this.player.getPlayerState ? this.player.getPlayerState() : -1;
      const isPlaying = state === 1;

      // Update seek slider & time badges
      const scrubber = document.getElementById('player-scrubber');
      const timeCurrent = document.getElementById('time-current');
      const timeDuration = document.getElementById('time-duration');

      if (duration > 0 && scrubber && !scrubber.matches(':active')) {
        scrubber.value = (current / duration) * 100;
      }
      if (timeCurrent) timeCurrent.textContent = this.formatTime(current);
      if (timeDuration) timeDuration.textContent = this.formatTime(duration);

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

    // Show player wrapper
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

  play() {
    if (this.player && this.player.playVideo) this.player.playVideo();
  }

  pause() {
    if (this.player && this.player.pauseVideo) this.player.pauseVideo();
  }

  togglePlay() {
    if (!this.player || !this.player.getPlayerState) return;
    const state = this.player.getPlayerState();
    if (state === 1) {
      this.pause();
    } else {
      this.play();
    }
  }

  seekTo(seconds) {
    if (this.player && this.player.seekTo) {
      this.player.seekTo(Math.max(0, seconds), true);
    }
  }

  seekRelative(offsetSeconds) {
    if (!this.player || !this.player.getCurrentTime) return;
    const target = this.player.getCurrentTime() + offsetSeconds;
    this.seekTo(target);
  }

  toggleAudioOnlyMode() {
    this.isAudioOnlyMode = !this.isAudioOnlyMode;
    const playerCard = document.getElementById('player-card');
    const toggleBtn = document.getElementById('btn-audio-only');

    if (playerCard) {
      playerCard.classList.toggle('audio-only-mode', this.isAudioOnlyMode);
    }
    if (toggleBtn) {
      toggleBtn.classList.toggle('active', this.isAudioOnlyMode);
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

