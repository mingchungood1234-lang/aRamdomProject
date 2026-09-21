/**
 * Main Web App Controller - In-App Browser Edition
 * Handles:
 * - In-app browser history stack (Back, Forward, Reload, Home)
 * - Browser address / search bar with URL detection
 * - Category filter chips
 * - Player dock minimization & Mini-player expand/collapse
 * - Bottom navigation tab switching
 * - Favorites and playback history
 */

// Curated high-quality video/audio streams across categories
const CURATED_FEEDS = [
  {
    id: 'jfKfPfyJRdk',
    title: 'Lofi Girl - Relaxing Beats to Study/Chill to',
    channel: 'Lofi Girl',
    category: 'Lofi',
    tags: ['lofi', 'beats', 'study', 'relax', 'chill', 'music'],
    thumbnail: 'https://img.youtube.com/vi/jfKfPfyJRdk/hqdefault.jpg'
  },
  {
    id: '4xDzrJKXOOY',
    title: 'Synthwave Radio - Chill synth / retro beats',
    channel: 'Lofi Girl Synthwave',
    category: 'Music',
    tags: ['synthwave', 'retro', 'synth', 'chill', 'beats', 'music'],
    thumbnail: 'https://img.youtube.com/vi/4xDzrJKXOOY/hqdefault.jpg'
  },
  {
    id: '5qap5aO4i9A',
    title: 'Lofi Hip Hop Radio - Beats to Sleep/Chill to',
    channel: 'ChilledCow',
    category: 'Lofi',
    tags: ['lofi', 'sleep', 'beats', 'chill', 'music'],
    thumbnail: 'https://img.youtube.com/vi/5qap5aO4i9A/hqdefault.jpg'
  },
  {
    id: '1fueZCTYkpA',
    title: 'Coffee Shop Ambience & Smooth Bossa Nova Jazz',
    channel: 'Coffee Music Hub',
    category: 'Ambience',
    tags: ['coffee', 'ambience', 'jazz', 'bossa nova', 'relax'],
    thumbnail: 'https://img.youtube.com/vi/1fueZCTYkpA/hqdefault.jpg'
  },
  {
    id: 'DWcJFNfaw9c',
    title: 'Relaxing Piano Music for Stress Relief & Meditation',
    channel: 'Relax Music Therapy',
    category: 'Focus',
    tags: ['piano', 'focus', 'stress relief', 'meditation', 'instrumental'],
    thumbnail: 'https://img.youtube.com/vi/DWcJFNfaw9c/hqdefault.jpg'
  },
  {
    id: 'e3L1I8squx4',
    title: 'Rain Sounds with Gentle Thunder for Sleep & Relaxation',
    channel: 'Relaxing Ambience',
    category: 'Ambience',
    tags: ['rain', 'thunder', 'sleep', 'white noise', 'ambience'],
    thumbnail: 'https://img.youtube.com/vi/e3L1I8squx4/hqdefault.jpg'
  },
  {
    id: 'lTRiuFIWV54',
    title: 'Deep Focus & Brain Power Alpha Waves Study Music',
    channel: 'Study Session',
    category: 'Focus',
    tags: ['study', 'focus', 'brain', 'alpha waves', 'work'],
    thumbnail: 'https://img.youtube.com/vi/lTRiuFIWV54/hqdefault.jpg'
  },
  {
    id: 'dQw4w9WgXcQ',
    title: 'Rick Astley - Never Gonna Give You Up (Official Music Video)',
    channel: 'Rick Astley',
    category: 'Music',
    tags: ['rick astley', 'pop', 'music', 'classic', '80s'],
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
  },
  {
    id: '2MIdr8t1Jbg',
    title: 'Optimize Focus & Concentration - Neuroscience Podcast',
    channel: 'Science & Health Talks',
    category: 'Podcasts',
    tags: ['podcast', 'focus', 'neuroscience', 'productivity', 'health'],
    thumbnail: 'https://img.youtube.com/vi/2MIdr8t1Jbg/hqdefault.jpg'
  }
];

class WebAppController {
  constructor() {
    this.history = this.loadStorage('yt_adfree_history') || [];
    this.favorites = this.loadStorage('yt_adfree_favorites') || [];
    this.currentCategory = 'All';
    this.currentPlaylist = [...CURATED_FEEDS];
    this.currentIndex = 0;

    // In-App Browser Navigation History Stack
    this.browserHistory = [];
    this.browserHistoryIndex = -1;
    this.currentView = 'home';
    this.isPlayerMinimized = false;

    this.initUI();
    this.initBrowserHistory();
    this.renderFeeds();
    this.renderFavorites();
  }

  /* =========================================================================
     1. UI INITIALIZATION & EVENT LISTENERS
     ========================================================================= */
  initUI() {
    // 1. Browser Navigation Buttons
    const btnBack = document.getElementById('btn-browser-back');
    const btnForward = document.getElementById('btn-browser-forward');
    const btnReload = document.getElementById('btn-browser-reload');
    const btnHome = document.getElementById('btn-browser-home');

    if (btnBack) btnBack.addEventListener('click', () => this.goBack());
    if (btnForward) btnForward.addEventListener('click', () => this.goForward());
    if (btnReload) btnReload.addEventListener('click', () => this.reloadCurrent());
    if (btnHome) btnHome.addEventListener('click', () => this.goHome());

    // 2. Address / Search Bar Form
    const addressForm = document.getElementById('browser-address-form');
    const addressInput = document.getElementById('browser-address-input');
    const btnClearAddress = document.getElementById('btn-clear-address');

    if (addressInput && btnClearAddress) {
      addressInput.addEventListener('input', () => {
        btnClearAddress.style.display = addressInput.value.length > 0 ? 'block' : 'none';
      });

      btnClearAddress.addEventListener('click', () => {
        addressInput.value = '';
        btnClearAddress.style.display = 'none';
        addressInput.focus();
      });
    }

    if (addressForm && addressInput) {
      addressForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = addressInput.value.trim();
        if (!query) return;

        this.handleAddressSubmission(query);
      });
    }

    // 3. Category Filter Chips
    const chips = document.querySelectorAll('.category-scroll .chip');
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        chips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        this.currentCategory = chip.dataset.category || 'All';
        this.renderFeeds();
        if (this.currentView !== 'home') {
          this.switchView('home');
        }
        this.pushHistoryState({
          type: 'browse',
          view: 'home',
          category: this.currentCategory,
          url: this.currentCategory === 'All' ? 'https://m.youtube.com' : `https://m.youtube.com/category/${this.currentCategory.toLowerCase()}`
        });
      });
    });

    // 4. Scrubber Range Slider
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

    // 5. Floating Go Back Button (Bottom Right)
    const floatingBackBtn = document.getElementById('floating-back-btn');
    if (floatingBackBtn) {
      let pressTimer = null;
      let isLong = false;

      const start = () => {
        isLong = false;
        pressTimer = setTimeout(() => {
          isLong = true;
          floatingBackBtn.style.transform = 'scale(1.2)';
          setTimeout(() => this.reloadCurrent(), 150);
        }, 600);
      };

      const end = () => {
        clearTimeout(pressTimer);
        floatingBackBtn.style.transform = '';
        if (!isLong) {
          this.goBack();
        }
      };

      floatingBackBtn.addEventListener('touchstart', start, { passive: true });
      floatingBackBtn.addEventListener('touchend', end);
      floatingBackBtn.addEventListener('mousedown', start);
      floatingBackBtn.addEventListener('mouseup', end);
    }

    // 6. Bottom Navigation Tabs
    const navButtons = document.querySelectorAll('.bottom-nav .nav-tab-btn');
    navButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        this.navigateToTab(view);
      });
    });

    // 7. Favorite Button toggle
    const favBtn = document.getElementById('btn-favorite');
    if (favBtn) {
      favBtn.addEventListener('click', () => this.toggleFavoriteCurrentVideo());
    }

    // 8. Audio-only mode button
    const audioBtn = document.getElementById('btn-audio-only');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        window.playerManager.toggleAudioOnlyMode();
      });
    }
  }

  /* =========================================================================
     2. IN-APP BROWSER NAVIGATION & HISTORY SYSTEM
     ========================================================================= */
  initBrowserHistory() {
    const initialState = {
      type: 'browse',
      view: 'home',
      category: 'All',
      url: 'https://m.youtube.com'
    };
    this.browserHistory = [initialState];
    this.browserHistoryIndex = 0;
    this.updateAddressBar(initialState.url);
    this.updateBrowserNavButtons();
  }

  pushHistoryState(state) {
    // If not at the end of history, discard forward stack
    if (this.browserHistoryIndex < this.browserHistory.length - 1) {
      this.browserHistory = this.browserHistory.slice(0, this.browserHistoryIndex + 1);
    }
    this.browserHistory.push(state);
    this.browserHistoryIndex = this.browserHistory.length - 1;
    this.updateAddressBar(state.url);
    this.updateBrowserNavButtons();
  }

  goBack() {
    if (this.browserHistoryIndex > 0) {
      this.browserHistoryIndex--;
      this.restoreBrowserState(this.browserHistory[this.browserHistoryIndex]);
      this.updateBrowserNavButtons();
    } else if (this.currentView !== 'home') {
      this.goHome();
    }
  }

  goForward() {
    if (this.browserHistoryIndex < this.browserHistory.length - 1) {
      this.browserHistoryIndex++;
      this.restoreBrowserState(this.browserHistory[this.browserHistoryIndex]);
      this.updateBrowserNavButtons();
    }
  }

  reloadCurrent() {
    const current = this.browserHistory[this.browserHistoryIndex];
    if (!current) return;

    if (current.type === 'video' && window.playerManager) {
      window.playerManager.seekTo(0);
      window.playerManager.play();
    } else {
      this.restoreBrowserState(current);
    }
  }

  goHome() {
    this.currentCategory = 'All';
    const chips = document.querySelectorAll('.category-scroll .chip');
    chips.forEach((c) => c.classList.toggle('active', c.dataset.category === 'All'));
    this.renderFeeds();
    this.switchView('home');

    this.pushHistoryState({
      type: 'browse',
      view: 'home',
      category: 'All',
      url: 'https://m.youtube.com'
    });
  }

  restoreBrowserState(state) {
    if (!state) return;
    this.updateAddressBar(state.url);

    if (state.type === 'browse') {
      this.currentCategory = state.category || 'All';
      const chips = document.querySelectorAll('.category-scroll .chip');
      chips.forEach((c) => c.classList.toggle('active', c.dataset.category === this.currentCategory));
      this.renderFeeds();
      this.switchView('home');
    } else if (state.type === 'search') {
      this.performSearch(state.query, false);
    } else if (state.type === 'library') {
      this.switchView('library');
    } else if (state.type === 'video') {
      this.playVideo(state.videoInfo, false);
    }
  }

  updateBrowserNavButtons() {
    const btnBack = document.getElementById('btn-browser-back');
    const btnForward = document.getElementById('btn-browser-forward');

    if (btnBack) {
      btnBack.disabled = this.browserHistoryIndex <= 0 && this.currentView === 'home';
    }
    if (btnForward) {
      btnForward.disabled = this.browserHistoryIndex >= this.browserHistory.length - 1;
    }
  }

  updateAddressBar(url) {
    const addressInput = document.getElementById('browser-address-input');
    const btnClearAddress = document.getElementById('btn-clear-address');
    if (addressInput) {
      addressInput.value = url;
      if (btnClearAddress) {
        btnClearAddress.style.display = url ? 'block' : 'none';
      }
    }
  }

  /* =========================================================================
     3. ADDRESS BAR SUBMISSION & IN-APP SEARCH
     ========================================================================= */
  handleAddressSubmission(input) {
    const videoId = window.playerManager.extractVideoId(input);

    if (videoId) {
      // Direct YouTube Video URL or ID
      const videoInfo = {
        id: videoId,
        title: `YouTube Video (${videoId})`,
        channel: 'YouTube Stream',
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        category: 'Custom'
      };
      this.playVideo(videoInfo, true);
    } else {
      // Perform In-App Search for query
      this.performSearch(input, true);
    }
  }

  performSearch(query, shouldPushHistory = true) {
    const cleanQuery = query.trim().toLowerCase();
    this.switchView('search');

    const searchTitleEl = document.getElementById('search-query-title');
    const searchCountEl = document.getElementById('search-result-count');
    const container = document.getElementById('search-results-container');

    if (searchTitleEl) searchTitleEl.textContent = `Results for "${query}"`;

    // Filter curated feeds by search terms
    let results = CURATED_FEEDS.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(cleanQuery);
      const matchChannel = item.channel.toLowerCase().includes(cleanQuery);
      const matchCategory = item.category.toLowerCase().includes(cleanQuery);
      const matchTags = item.tags && item.tags.some((t) => t.includes(cleanQuery));
      return matchTitle || matchChannel || matchCategory || matchTags;
    });

    // If no direct keyword matches, provide curated results plus fallback search card
    if (results.length === 0) {
      results = CURATED_FEEDS.slice(0, 4);
    }

    if (searchCountEl) {
      searchCountEl.textContent = `${results.length} video${results.length === 1 ? '' : 's'}`;
    }

    if (container) {
      container.innerHTML = results
        .map(
          (item) => `
        <div class="video-card" onclick='window.app.playVideo(${JSON.stringify(item)})'>
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
        )
        .join('');
    }

    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    if (shouldPushHistory) {
      this.pushHistoryState({
        type: 'search',
        view: 'search',
        query: query,
        url: searchUrl
      });
    } else {
      this.updateAddressBar(searchUrl);
    }
  }

  /* =========================================================================
     4. VIEW & TAB SWITCHING
     ========================================================================= */
  navigateToTab(viewName) {
    this.switchView(viewName);

    let tabUrl = 'https://m.youtube.com';
    if (viewName === 'search') tabUrl = 'https://m.youtube.com/search';
    if (viewName === 'library') tabUrl = 'https://m.youtube.com/library';

    this.pushHistoryState({
      type: viewName === 'home' ? 'browse' : viewName,
      view: viewName,
      url: tabUrl
    });
  }

  switchView(viewName) {
    this.currentView = viewName;
    document.querySelectorAll('.browser-tab-view').forEach((el) => el.classList.remove('active'));
    document.querySelectorAll('.bottom-nav .nav-tab-btn').forEach((btn) => btn.classList.remove('active'));

    const targetView = document.getElementById(`view-${viewName}`);
    const targetNav = document.querySelector(`.bottom-nav .nav-tab-btn[data-view="${viewName}"]`);

    if (targetView) targetView.classList.add('active');
    if (targetNav) targetNav.classList.add('active');

    if (viewName === 'library') {
      this.renderFavorites();
      this.renderHistory();
    }
  }

  /* =========================================================================
     5. VIDEO PLAYBACK & MINI-PLAYER CONTROLS
     ========================================================================= */
  playVideo(videoInfo, shouldPushHistory = true) {
    // If player was minimized, expand it
    this.expandPlayer();

    window.playerManager.loadVideo(videoInfo.id, videoInfo);

    // Save to playback history
    this.addToHistory(videoInfo);

    // Update favorite button state
    this.updateFavButtonState(videoInfo.id);

    const videoUrl = `https://www.youtube.com/watch?v=${videoInfo.id}`;
    if (shouldPushHistory) {
      this.pushHistoryState({
        type: 'video',
        videoInfo: videoInfo,
        url: videoUrl
      });
    } else {
      this.updateAddressBar(videoUrl);
    }

    // Scroll player into view smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  minimizePlayer() {
    this.isPlayerMinimized = true;
    const playerDock = document.getElementById('player-dock');
    const miniBar = document.getElementById('mini-player-bar');

    if (playerDock) playerDock.style.display = 'none';
    if (miniBar) miniBar.style.display = 'flex';
  }

  expandPlayer() {
    this.isPlayerMinimized = false;
    const playerDock = document.getElementById('player-dock');
    const miniBar = document.getElementById('mini-player-bar');

    if (playerDock) {
      playerDock.style.display = 'block';
      playerDock.classList.add('active');
    }
    if (miniBar) miniBar.style.display = 'none';
  }

  closePlayer() {
    this.isPlayerMinimized = false;
    window.playerManager.pause();

    const playerDock = document.getElementById('player-dock');
    const miniBar = document.getElementById('mini-player-bar');

    if (playerDock) {
      playerDock.style.display = 'none';
      playerDock.classList.remove('active');
    }
    if (miniBar) miniBar.style.display = 'none';
  }

  playNextTrack() {
    this.currentIndex = (this.currentIndex + 1) % this.currentPlaylist.length;
    this.playVideo(this.currentPlaylist[this.currentIndex], true);
  }

  playPrevTrack() {
    this.currentIndex = (this.currentIndex - 1 + this.currentPlaylist.length) % this.currentPlaylist.length;
    this.playVideo(this.currentPlaylist[this.currentIndex], true);
  }

  /* =========================================================================
     6. FEEDS RENDERING
     ========================================================================= */
  renderFeeds() {
    const grid = document.getElementById('feeds-grid');
    if (!grid) return;

    let items = CURATED_FEEDS;
    if (this.currentCategory !== 'All') {
      items = CURATED_FEEDS.filter((f) => f.category === this.currentCategory);
    }

    grid.innerHTML = items
      .map(
        (item) => `
      <div class="video-card" onclick='window.app.playVideo(${JSON.stringify(item)})'>
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
      )
      .join('');
  }

  /* =========================================================================
     7. FAVORITES & PLAYBACK HISTORY
     ========================================================================= */
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
