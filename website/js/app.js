/**
 * Main Web App Controller
 * Handles UI views, search/URL submission, curated feed, favorites, and history
 */

// Curated high-quality audio streams & videos known to support embedding
const CURATED_FEEDS = [
  {
    id: 'jfKfPfyJRdk',
    title: 'Lofi Girl - Relaxing Beats to Study/Chill to',
    channel: 'Lofi Girl',
    category: 'Music',
    thumbnail: 'https://img.youtube.com/vi/jfKfPfyJRdk/hqdefault.jpg'
  },
  {
    id: '4xDzrJKXOOY',
    title: 'Synthwave Radio - Chill synth / retro beats',
    channel: 'Lofi Girl Synthwave',
    category: 'Music',
    thumbnail: 'https://img.youtube.com/vi/4xDzrJKXOOY/hqdefault.jpg'
  },
  {
    id: '5qap5aO4i9A',
    title: 'Lofi Hip Hop Radio - Beats to Sleep/Chill to',
    channel: 'ChilledCow',
    category: 'Chill',
    thumbnail: 'https://img.youtube.com/vi/5qap5aO4i9A/hqdefault.jpg'
  },
  {
    id: '1fueZCTYkpA',
    title: 'Coffee Shop Ambience & Smooth Bossa Nova Jazz',
    channel: 'Coffee Music Hub',
    category: 'Ambience',
    thumbnail: 'https://img.youtube.com/vi/1fueZCTYkpA/hqdefault.jpg'
  },
  {
    id: 'DWcJFNfaw9c',
    title: 'Relaxing Piano Music for Stress Relief',
    channel: 'Relax Music Therapy',
    category: 'Focus',
    thumbnail: 'https://img.youtube.com/vi/DWcJFNfaw9c/hqdefault.jpg'
  },
  {
    id: 'dQw4w9WgXcQ',
    title: 'Rick Astley - Never Gonna Give You Up (Official Music Video)',
    channel: 'Rick Astley',
    category: 'Classic',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
  }
];

class WebAppController {
  constructor() {
    this.history = this.loadStorage('yt_adfree_history') || [];
    this.favorites = this.loadStorage('yt_adfree_favorites') || [];
    this.currentPlaylist = [...CURATED_FEEDS];
    this.currentIndex = 0;

    this.initUI();
    this.renderFeeds();
    this.renderFavorites();
  }

  initUI() {
    // URL or Search form
    const form = document.getElementById('search-form');
    const input = document.getElementById('input-url');

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = input.value.trim();
        if (!query) return;

        // Check if it's a URL or ID
        const videoId = window.playerManager.extractVideoId(query);
        if (videoId) {
          const videoInfo = {
            id: videoId,
            title: `Video (${videoId})`,
            channel: 'YouTube',
            thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
          };
          this.playVideo(videoInfo);
          input.value = '';
        } else {
          // Fallback search link
          window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, '_blank');
        }
      });
    }

    // Scrubber interaction
    const scrubber = document.getElementById('player-scrubber');
    if (scrubber) {
      scrubber.addEventListener('change', (e) => {
        const percent = parseFloat(e.target.value);
        if (window.playerManager && window.playerManager.player) {
          const duration = window.playerManager.player.getDuration() || 0;
          window.playerManager.seekTo((percent / 100) * duration);
        }
      });
    }

    // Floating Back Button
    const backBtn = document.getElementById('floating-back-btn');
    if (backBtn) {
      let pressTimer = null;
      let isLong = false;

      const start = () => {
        isLong = false;
        pressTimer = setTimeout(() => {
          isLong = true;
          backBtn.style.transform = 'scale(1.2)';
          setTimeout(() => window.location.reload(), 150);
        }, 600);
      };

      const end = (e) => {
        clearTimeout(pressTimer);
        backBtn.style.transform = '';
        if (!isLong) {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            this.switchView('home');
          }
        }
      };

      backBtn.addEventListener('touchstart', start, { passive: true });
      backBtn.addEventListener('touchend', end);
      backBtn.addEventListener('mousedown', start);
      backBtn.addEventListener('mouseup', end);
    }

    // Bottom Navigation Tabs
    const navButtons = document.querySelectorAll('.nav-tab-btn');
    navButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        this.switchView(view);
      });
    });

    // Favorite Button toggle
    const favBtn = document.getElementById('btn-favorite');
    if (favBtn) {
      favBtn.addEventListener('click', () => this.toggleFavoriteCurrentVideo());
    }

    // Audio-only mode button
    const audioBtn = document.getElementById('btn-audio-only');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        window.playerManager.toggleAudioOnlyMode();
      });
    }
  }

  switchView(viewName) {
    document.querySelectorAll('.app-view').forEach((el) => el.classList.remove('active'));
    document.querySelectorAll('.nav-tab-btn').forEach((btn) => btn.classList.remove('active'));

    const targetView = document.getElementById(`view-${viewName}`);
    const targetNav = document.querySelector(`.nav-tab-btn[data-view="${viewName}"]`);

    if (targetView) targetView.classList.add('active');
    if (targetNav) targetNav.classList.add('active');

    if (viewName === 'library') {
      this.renderFavorites();
      this.renderHistory();
    }
  }

  playVideo(videoInfo) {
    window.playerManager.loadVideo(videoInfo.id, videoInfo);

    // Save to history
    this.addToHistory(videoInfo);

    // Update favorite button state
    this.updateFavButtonState(videoInfo.id);

    // Scroll to player smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  playNextTrack() {
    this.currentIndex = (this.currentIndex + 1) % this.currentPlaylist.length;
    this.playVideo(this.currentPlaylist[this.currentIndex]);
  }

  playPrevTrack() {
    this.currentIndex = (this.currentIndex - 1 + this.currentPlaylist.length) % this.currentPlaylist.length;
    this.playVideo(this.currentPlaylist[this.currentIndex]);
  }

  renderFeeds() {
    const grid = document.getElementById('feeds-grid');
    if (!grid) return;

    grid.innerHTML = CURATED_FEEDS.map(
      (item, idx) => `
      <div class="video-card" onclick="window.app.selectFeedItem(${idx})">
        <div class="thumbnail-wrapper">
          <img src="${item.thumbnail}" alt="${item.title}" loading="lazy" />
          <span class="badge-category">${item.category}</span>
          <div class="play-overlay">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="#ffffff"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
        <div class="card-details">
          <h4 class="card-title">${item.title}</h4>
          <p class="card-channel">${item.channel}</p>
        </div>
      </div>
    `
    ).join('');
  }

  selectFeedItem(index) {
    this.currentIndex = index;
    this.playVideo(CURATED_FEEDS[index]);
  }

  toggleFavoriteCurrentVideo() {
    const current = window.playerManager.currentVideoInfo;
    if (!current) return;

    const existsIndex = this.favorites.findIndex((f) => f.id === current.id);
    if (existsIndex > -1) {
      this.favorites.splice(existsIndex, 1);
    } else {
      this.favorites.unshift(current);
    }

    this.saveStorage('yt_adfree_favorites', this.favorites);
    this.updateFavButtonState(current.id);
    this.renderFavorites();
  }

  updateFavButtonState(videoId) {
    const favBtn = document.getElementById('btn-favorite');
    if (!favBtn) return;
    const isFav = this.favorites.some((f) => f.id === videoId);
    favBtn.classList.toggle('favorited', isFav);
  }

  addToHistory(videoInfo) {
    this.history = this.history.filter((h) => h.id !== videoInfo.id);
    this.history.unshift(videoInfo);
    if (this.history.length > 30) this.history.pop();
    this.saveStorage('yt_adfree_history', this.history);
  }

  renderFavorites() {
    const container = document.getElementById('favorites-list');
    if (!container) return;

    if (this.favorites.length === 0) {
      container.innerHTML = '<p class="empty-state">No favorite videos yet. Tap the heart icon on any playing video to save it here.</p>';
      return;
    }

    container.innerHTML = this.favorites
      .map(
        (item) => `
      <div class="list-item" onclick='window.app.playVideo(${JSON.stringify(item)})'>
        <img src="${item.thumbnail}" class="list-thumb" alt="${item.title}" />
        <div class="list-info">
          <h5 class="list-title">${item.title}</h5>
          <p class="list-channel">${item.channel}</p>
        </div>
      </div>
    `
      )
      .join('');
  }

  renderHistory() {
    const container = document.getElementById('history-list');
    if (!container) return;

    if (this.history.length === 0) {
      container.innerHTML = '<p class="empty-state">No recently played videos.</p>';
      return;
    }

    container.innerHTML = this.history
      .map(
        (item) => `
      <div class="list-item" onclick='window.app.playVideo(${JSON.stringify(item)})'>
        <img src="${item.thumbnail}" class="list-thumb" alt="${item.title}" />
        <div class="list-info">
          <h5 class="list-title">${item.title}</h5>
          <p class="list-channel">${item.channel}</p>
        </div>
      </div>
    `
      )
      .join('');
  }

  saveStorage(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  }

  loadStorage(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new WebAppController();
});
