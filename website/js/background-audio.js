/**
 * Background Audio & Media Session Controller
 * Enables iOS Lock Screen / Control Center playback controls and audio keep-alive
 */
class BackgroundAudioController {
  constructor() {
    this.silentAudio = null;
    this.isPlaying = false;
    this.currentMetadata = null;
    this.playerCallbacks = {
      onPlay: () => {},
      onPause: () => {},
      onSeek: (seconds) => {},
      onNext: () => {},
      onPrev: () => {}
    };

    this.initAudioKeepAlive();
    this.initMediaSession();
  }

  /**
   * Initializes a tiny silent audio element to keep iOS Safari media pipeline awake
   */
  initAudioKeepAlive() {
    // 1-second silent WAV data URI
    const silentWavBase64 =
      'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    this.silentAudio = new Audio(silentWavBase64);
    this.silentAudio.loop = true;
    this.silentAudio.volume = 0.01; // minimal volume so it doesn't interrupt music
  }

  /**
   * Register player action listeners for Lock Screen & Control Center
   */
  setPlayerCallbacks(callbacks) {
    this.playerCallbacks = { ...this.playerCallbacks, ...callbacks };
  }

  /**
   * Initializes the HTML5 Media Session API
   */
  initMediaSession() {
    if (!('mediaSession' in navigator)) {
      console.log('[MediaSession] API not supported in this browser.');
      return;
    }

    const actions = [
      ['play', () => this.playerCallbacks.onPlay()],
      ['pause', () => this.playerCallbacks.onPause()],
      ['seekto', (details) => {
        if (details.seekTime !== undefined) {
          this.playerCallbacks.onSeek(details.seekTime);
        }
      }],
      ['seekforward', (details) => {
        const offset = details.seekOffset || 10;
        this.playerCallbacks.onSeek(offset, true);
      }],
      ['seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        this.playerCallbacks.onSeek(-offset, true);
      }],
      ['previoustrack', () => this.playerCallbacks.onPrev()],
      ['nexttrack', () => this.playerCallbacks.onNext()]
    ];

    for (const [action, handler] of actions) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (err) {
        console.warn(`[MediaSession] Action "${action}" not supported.`, err);
      }
    }
  }

  /**
   * Updates Lock Screen / Control Center with video details
   */
  updateMetadata({ title, artist, album, thumbnail, duration }) {
    if (!('mediaSession' in navigator)) return;

    this.currentMetadata = { title, artist, album, thumbnail, duration };

    const artworkList = [];
    if (thumbnail) {
      artworkList.push(
        { src: thumbnail, sizes: '128x128', type: 'image/jpeg' },
        { src: thumbnail, sizes: '256x256', type: 'image/jpeg' },
        { src: thumbnail, sizes: '512x512', type: 'image/jpeg' }
      );
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: title || 'YouTube Video',
      artist: artist || 'YouTube AdFree Web',
      album: album || 'Ad-Free Background Audio',
      artwork: artworkList
    });
  }

  /**
   * Updates playback position and state in iOS Control Center
   */
  updatePlaybackState(isPlaying, currentTime = 0, duration = 0) {
    this.isPlaying = isPlaying;

    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      if (duration > 0 && isFinite(duration) && 'setPositionState' in navigator.mediaSession) {
        try {
          navigator.mediaSession.setPositionState({
            duration: Math.max(0, duration),
            playbackRate: 1.0,
            position: Math.min(Math.max(0, currentTime), duration)
          });
        } catch (e) {
          // ignore position update errors
        }
      }
    }

    // Synchronize silent audio keep-alive for iOS background playback
    if (this.silentAudio) {
      if (isPlaying) {
        this.silentAudio.play().catch(() => {});
      } else {
        this.silentAudio.pause();
      }
    }
  }
}

window.backgroundAudio = new BackgroundAudioController();
