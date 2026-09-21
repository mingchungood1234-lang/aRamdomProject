/**
 * Main Web App Controller - In-App Browser & Search Engine
 * Features:
 * - Live YouTube video & audio search via /api/search
 * - Autocomplete search suggestions via /api/suggest
 * - Quick trending search pills & recent search history
 * - In-app browser history stack (Back, Forward, Reload, Home)
 * - Mini-player dock expand/collapse
 * - Background audio session management
 */

// Curated high-quality video/audio streams across categories
const CURATED_FEEDS = [
  {
    id: 'jfKfPfyJRdk',
    title: 'Lofi Girl - Relaxing Beats to Study/Chill to',
    channel: 'Lofi Girl',
    category: 'Lofi',
    duration: 0,
    duration_text: 'LIVE',
    tags: ['lofi', 'beats', 'study', 'relax', 'chill', 'music'],
    thumbnail: 'https://img.youtube.com/vi/jfKfPfyJRdk/hqdefault.jpg'
  },
  {
    id: '4xDzrJKXOOY',
    title: 'Synthwave Radio - Chill synth / retro beats',
    channel: 'Lofi Girl Synthwave',
    category: 'Music',
    duration: 0,
    duration_text: 'LIVE',
    tags: ['synthwave', 'retro', 'synth', 'chill', 'beats', 'music'],
    thumbnail: 'https://img.youtube.com/vi/4xDzrJKXOOY/hqdefault.jpg'
  },
  {
    id: '5qap5aO4i9A',
    title: 'Lofi Hip Hop Radio - Beats to Sleep/Chill to',
    channel: 'ChilledCow',
    category: 'Lofi',
    duration: 0,
    duration_text: 'LIVE',
    tags: ['lofi', 'sleep', 'beats', 'chill', 'music'],
    thumbnail: 'https://img.youtube.com/vi/5qap5aO4i9A/hqdefault.jpg'
  },
  {
    id: '1fueZCTYkpA',
    title: 'Coffee Shop Ambience & Smooth Bossa Nova Jazz',
    channel: 'Coffee Music Hub',
    category: 'Ambience',
    duration: 14400,
    duration_text: '4:00:00',
    tags: ['coffee', 'ambience', 'jazz', 'bossa nova', 'relax'],
    thumbnail: 'https://img.youtube.com/vi/1fueZCTYkpA/hqdefault.jpg'
  },
  {
    id: 'DWcJFNfaw9c',
    title: 'Relaxing Piano Music for Stress Relief & Meditation',
    channel: 'Relax Music Therapy',
    category: 'Focus',
    duration: 10800,
    duration_text: '3:00:00',
    tags: ['piano', 'focus', 'stress relief', 'meditation', 'instrumental'],
    thumbnail: 'https://img.youtube.com/vi/DWcJFNfaw9c/hqdefault.jpg'
  },
  {
    id: 'e3L1I8squx4',
    title: 'Rain Sounds with Gentle Thunder for Sleep & Relaxation',
    channel: 'Relaxing Ambience',
    category: 'Ambience',
    duration: 28800,
    duration_text: '8:00:00',
    tags: ['rain', 'thunder', 'sleep', 'white noise', 'ambience'],
    thumbnail: 'https://img.youtube.com/vi/e3L1I8squx4/hqdefault.jpg'
  },
  {
    id: 'lTRiuFIWV54',
    title: 'Deep Focus & Brain Power Alpha Waves Study Music',
    channel: 'Study Session',
    category: 'Focus',
    duration: 3600,
    duration_text: '1:00:00',
    tags: ['study', 'focus', 'brain', 'alpha waves', 'work'],
    thumbnail: 'https://img.youtube.com/vi/lTRiuFIWV54/hqdefault.jpg'
  },
  {
    id: 'dQw4w9WgXcQ',
    title: 'Rick Astley - Never Gonna Give You Up (Official Music Video)',
    channel: 'Rick Astley',
    category: 'Music',
    duration: 213,
    duration_text: '3:33',
    tags: ['rick astley', 'pop', 'music', 'classic', '80s'],
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
  },
  {
    id: '2MIdr8t1Jbg',
    title: 'Optimize Focus & Concentration - Neuroscience Podcast',
    channel: 'Science & Health Talks',
    category: 'Podcasts',
    duration: 5400,
    duration_text: '1:30:00',
    tags: ['podcast', 'focus', 'neuroscience', 'productivity', 'health'],
    thumbnail: 'https://img.youtube.com/vi/2MIdr8t1Jbg/hqdefault.jpg'
  }
];

class WebAppController {
  constructor() {
    this.history = this.loadStorage('yt_adfree_history') || [];
    this.favorites = this.loadStorage('yt_adfree_favorites') || [];
    this.recentSearches = this.loadStorage('yt_adfree_recent_searches') || [
      'Lofi Hip Hop',
      'Coffee Jazz',
      'Deep Focus',
      'Rain Sounds'
    ];

    this.currentCategory = 'All';
    this.currentPlaylist = [...CURATED_FEEDS];
    this.currentIndex = 0;

    // Browser Navigation History Stack
    this.browserHistory = [];
    this.browserHistoryIndex = -1;
    this.currentView = 'home';
    this.isPlayerMinimized = false;

    this.suggestDebounceTimer = null;

    this.initUI();
    this.initBrowserHistory();
    this.renderFeeds();
    this.renderFavorites();
    this.renderRecentSearches();
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

    // 2. Top Browser Address / Search Bar
    const addressForm = document.getElementById('browser-address-form');
    const addressInput = document.getElementById('browser-address-input');
    const btnClearAddress = document.getElementById('btn-clear-address');
    const addressDropdown = document.getElementById('address-suggestions');

    if (addressInput && btnClearAddress) {
      addressInput.addEventListener('input', () => {
        const val = addressInput.value.trim();
        btnClearAddress.style.display = val.length > 0 ? 'block' : 'none';
        this.fetchAutocomplete(val, addressDropdown, (selected) => {
          addressInput.value = selected;
          this.handleAddressSubmission(selected);
        });
      });

      btnClearAddress.addEventListener('click', () => {
        addressInput.value = '';
        btnClearAddress.style.display = 'none';
        if (addressDropdown) addressDropdown.style.display = 'none';
        addressInput.focus();
      });
    }

    if (addressForm && addressInput) {
      addressForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (addressDropdown) addressDropdown.style.display = 'none';
        const query = addressInput.value.trim();
        if (!query) return;
        this.handleAddressSubmission(query);
      });
    }

    // 3. Dedicated In-Tab Search Bar (#view-search)
    const tabSearchForm = document.getElementById('tab-search-form');
    const tabSearchInput = document.getElementById('tab-search-input');
    const btnTabClear = document.getElementById('btn-tab-search-clear');
    const tabDropdown = document.getElementById('tab-suggestions');

    if (tabSearchInput && btnTabClear) {
      tabSearchInput.addEventListener('input', () => {
        const val = tabSearchInput.value.trim();
        btnTabClear.style.display = val.length > 0 ? 'block' : 'none';
        this.fetchAutocomplete(val, tabDropdown, (selected) => {
          tabSearchInput.value = selected;
          this.performSearch(selected, true);
        });
      });

      btnTabClear.addEventListener('click', () => {
        tabSearchInput.value = '';
        btnTabClear.style.display = 'none';
        if (tabDropdown) tabDropdown.style.display = 'none';
        tabSearchInput.focus();
      });
    }

    if (tabSearchForm && tabSearchInput) {
      tabSearchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (tabDropdown) tabDropdown.style.display = 'none';
        const query = tabSearchInput.value.trim();
        if (!query) return;
        this.performSearch(query, true);
      });
    }

    // 4. Quick Search Popular Pills
    const pills = document.querySelectorAll('.quick-search-pills .pill-btn');
    pills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const q = pill.dataset.query || pill.textContent.trim();
        if (tabSearchInput) {
          tabSearchInput.value = q;
          if (btnTabClear) btnTabClear.style.display = 'block';
        }
        this.performSearch(q, true);
      });
    });

    // 5. Clear Recent Searches Button
    const btnClearRecent = document.getElementById('btn-clear-recent');
    if (btnClearRecent) {
      btnClearRecent.addEventListener('click', () => {
        this.recentSearches = [];
        this.saveStorage('yt_adfree_recent_searches', this.recentSearches);
        this.renderRecentSearches();
      });
    }

    // 6. Global Click to Dismiss Dropdowns
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.browser-address-container')) {
        if (addressDropdown) addressDropdown.style.display = 'none';
      }
      if (!e.target.closest('.tab-search-wrapper')) {
        if (tabDropdown) tabDropdown.style.display = 'none';
      }
    });

    // 7. Category Filter Chips
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

    // 8. Scrubber Range Slider
    const scrubber = document.getElementById('player-scrubber');
    if (scrubber) {
      scrubber.addEventListener('change', (e) => {
        const percent = parseFloat(e.target.value);
        if (window.playerManager) {
          const duration = window.playerManager.getDuration() || 0;
          window.playerManager.seekTo((percent / 100) * duration);
        }
      });
    }

    // 9. Floating Go Back Button (Bottom Right)
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

    // 10. Bottom Navigation Tabs
    const navButtons = document.querySelectorAll('.bottom-nav .nav-tab-btn');
    navButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        this.navigateToTab(view);
      });
    });

    // 11. Favorite Button toggle
    const favBtn = document.getElementById('btn-favorite');
    if (favBtn) {
      favBtn.addEventListener('click', () => this.toggleFavoriteCurrentVideo());
    }

    // 12. Audio-only mode button
    const audioBtn = document.getElementById('btn-audio-only');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        window.playerManager.toggleAudioOnlyMode();
      });
    }
  }

  /* =========================================================================
     2. AUTOCOMPLETE SEARCH SUGGESTIONS
     ========================================================================= */
  fetchAutocomplete(query, dropdownEl, onSelectCallback) {
    if (!dropdownEl) return;
    clearTimeout(this.suggestDebounceTimer);

    if (!query || query.length < 2 || window.playerManager.extractVideoId(query)) {
      dropdownEl.style.display = 'none';
      return;
    }

    this.suggestDebounceTimer = setTimeout(async () => {
      try {
        const resp = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`);
        if (resp.ok) {
          const data = await resp.json();
          const suggestions = data.suggestions || [];
          if (suggestions.length > 0) {
            dropdownEl.innerHTML = suggestions
              .slice(0, 8)
              .map(
                (item) => `
                <div class="suggestion-item" data-suggestion="${this.escapeHtml(item)}">
                  <svg class="suggestion-icon" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                  <span>${this.escapeHtml(item)}</span>
                </div>
              `
              )
              .join('');
            dropdownEl.style.display = 'block';

            dropdownEl.querySelectorAll('.suggestion-item').forEach((row) => {
              row.addEventListener('click', (e) => {
                e.stopPropagation();
                const sel = row.dataset.suggestion;
                dropdownEl.style.display = 'none';
                if (onSelectCallback) onSelectCallback(sel);
              });
            });
          } else {
            dropdownEl.style.display = 'none';
          }
        }
      } catch (e) {
        dropdownEl.style.display = 'none';
      }
    }, 150);
  }

  /* =========================================================================
     3. IN-APP BROWSER NAVIGATION & HISTORY SYSTEM
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
     4. LIVE YOUTUBE SEARCH FUNCTION
     ========================================================================= */
  handleAddressSubmission(input) {
    const videoId = window.playerManager.extractVideoId(input);

    if (videoId) {
      const videoInfo = {
        id: videoId,
        title: `YouTube Video (${videoId})`,
        channel: 'YouTube Stream',
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        category: 'Custom'
      };
      this.playVideo(videoInfo, true);
    } else {
      this.performSearch(input, true);
    }
  }

  async performSearch(query, shouldPushHistory = true) {
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    this.switchView('search');

    // Sync input fields
    const tabInput = document.getElementById('tab-search-input');
    const tabClear = document.getElementById('btn-tab-search-clear');
    if (tabInput) {
      tabInput.value = cleanQuery;
      if (tabClear) tabClear.style.display = 'block';
    }

    const searchTitleEl = document.getElementById('search-query-title');
    const searchCountEl = document.getElementById('search-result-count');
    const container = document.getElementById('search-results-container');

    if (searchTitleEl) searchTitleEl.textContent = `Results for "${cleanQuery}"`;
    if (searchCountEl) searchCountEl.textContent = 'Searching...';

    // Show loading spinner
    if (container) {
      container.innerHTML = `
        <div class="search-loading-state">
          <div class="search-spinner"></div>
          <p>Searching YouTube for "<strong>${this.escapeHtml(cleanQuery)}</strong>"...</p>
        </div>
      `;
    }

    // Add to recent searches
    this.addRecentSearch(cleanQuery);

    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}`;
    if (shouldPushHistory) {
      this.pushHistoryState({
        type: 'search',
        view: 'search',
        query: cleanQuery,
        url: searchUrl
      });
    } else {
      this.updateAddressBar(searchUrl);
    }

    // 1. Fetch live search results from backend streaming server
    try {
      const resp = await fetch(`/api/search?q=${encodeURIComponent(cleanQuery)}`);
      if (resp.ok) {
        const data = await resp.json();
        const results = data.results || [];

        if (results.length > 0) {
          this.currentPlaylist = results;
          this.renderSearchResults(results);
          if (searchCountEl) searchCountEl.textContent = `${results.length} live results`;
          return;
        }
      }
    } catch (err) {
      console.warn('[Search] Live API search unavailable, checking local curated feeds:', err);
    }

    // 2. Fallback to local curated search
    const lower = cleanQuery.toLowerCase();
    let localMatches = CURATED_FEEDS.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(lower);
      const matchChannel = item.channel.toLowerCase().includes(lower);
      const matchCategory = item.category.toLowerCase().includes(lower);
      const matchTags = item.tags && item.tags.some((t) => t.includes(lower));
      return matchTitle || matchChannel || matchCategory || matchTags;
    });

    if (localMatches.length === 0) {
      localMatches = CURATED_FEEDS.slice(0, 4);
    }

    this.currentPlaylist = localMatches;
    this.renderSearchResults(localMatches);
    if (searchCountEl) searchCountEl.textContent = `${localMatches.length} results`;
  }

  renderSearchResults(items) {
    const container = document.getElementById('search-results-container');
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = `
        <div class="search-loading-state">
          <p>No videos found. Try different search keywords.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = items
      .map(
        (item) => `
      <div class="video-card" onclick='window.app.playVideo(${JSON.stringify(item)})'>
        <div class="thumbnail-wrapper">
          <img src="${item.thumbnail}" alt="${this.escapeHtml(item.title)}" loading="lazy" />
          ${
            item.duration_text || item.duration > 0
              ? `<span class="badge-duration">${item.duration_text || window.playerManager.formatTime(item.duration)}</span>`
              : `<span class="badge-category">${item.category || 'Video'}</span>`
          }
          <div class="play-overlay">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="#ffffff"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
        <div class="card-details">
          <h4 class="card-title">${this.escapeHtml(item.title)}</h4>
          <p class="card-channel">${this.escapeHtml(item.channel)}</p>
        </div>
      </div>
    `
      )
      .join('');
  }

  /* =========================================================================
     5. RECENT SEARCHES MANAGEMENT
     ========================================================================= */
  addRecentSearch(query) {
    if (!query) return;
    this.recentSearches = this.recentSearches.filter((q) => q.toLowerCase() !== query.toLowerCase());
    this.recentSearches.unshift(query);
    if (this.recentSearches.length > 10) this.recentSearches.pop();
    this.saveStorage('yt_adfree_recent_searches', this.recentSearches);
    this.renderRecentSearches();
  }

  renderRecentSearches() {
    const box = document.getElementById('recent-searches-box');
    const container = document.getElementById('recent-searches-list');
    if (!box || !container) return;

    if (this.recentSearches.length === 0) {
      box.style.display = 'none';
      return;
    }

    box.style.display = 'block';
    container.innerHTML = this.recentSearches
      .map(
        (q) => `
      <div class="recent-chip" onclick='window.app.performSearch("${this.escapeHtml(q)}", true)'>
        <span>${this.escapeHtml(q)}</span>
      </div>
    `
      )
      .join('');
  }

  /* =========================================================================
     6. VIEW & TAB SWITCHING
     ========================================================================= */
  navigateToTab(viewName) {
    this.switchView(viewName);

    let tabUrl = 'https://m.youtube.com';
    if (viewName === 'search') {
      tabUrl = 'https://m.youtube.com/search';
      // Auto-focus search input
      setTimeout(() => {
        const input = document.getElementById('tab-search-input');
        if (input && window.innerWidth > 768) input.focus();
      }, 100);
    }
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
     7. VIDEO PLAYBACK & MINI-PLAYER CONTROLS
     ========================================================================= */
  playVideo(videoInfo, shouldPushHistory = true) {
    this.expandPlayer();

    window.playerManager.loadVideo(videoInfo.id, videoInfo);
    this.addToHistory(videoInfo);
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
    if (!this.currentPlaylist || this.currentPlaylist.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.currentPlaylist.length;
    this.playVideo(this.currentPlaylist[this.currentIndex], true);
  }

  playPrevTrack() {
    if (!this.currentPlaylist || this.currentPlaylist.length === 0) return;
    this.currentIndex = (this.currentIndex - 1 + this.currentPlaylist.length) % this.currentPlaylist.length;
    this.playVideo(this.currentPlaylist[this.currentIndex], true);
  }

  /* =========================================================================
     8. FEEDS RENDERING
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
          <img src="${item.thumbnail}" alt="${this.escapeHtml(item.title)}" loading="lazy" />
          ${
            item.duration_text || item.duration > 0
              ? `<span class="badge-duration">${item.duration_text || window.playerManager.formatTime(item.duration)}</span>`
              : `<span class="badge-category">${item.category}</span>`
          }
          <div class="play-overlay">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="#ffffff"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
        <div class="card-details">
          <h4 class="card-title">${this.escapeHtml(item.title)}</h4>
          <p class="card-channel">${this.escapeHtml(item.channel)}</p>
        </div>
      </div>
    `
      )
      .join('');
  }

  /* =========================================================================
     9. FAVORITES & PLAYBACK HISTORY
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
        <img src="${item.thumbnail}" class="list-thumb" alt="${this.escapeHtml(item.title)}" />
        <div class="list-info">
          <h5 class="list-title">${this.escapeHtml(item.title)}</h5>
          <p class="list-channel">${this.escapeHtml(item.channel)}</p>
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
        <img src="${item.thumbnail}" class="list-thumb" alt="${this.escapeHtml(item.title)}" />
        <div class="list-info">
          <h5 class="list-title">${this.escapeHtml(item.title)}</h5>
          <p class="list-channel">${this.escapeHtml(item.channel)}</p>
        </div>
      </div>
    `
      )
      .join('');
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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
