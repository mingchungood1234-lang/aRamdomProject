/**
 * YouTube Mobile Web App Controller (m.youtube.com Theme)
 * Manages:
 * - Authentic mobile YouTube video cards and feeds
 * - Native watch view with channel subscribe, action pills, and Up Next
 * - Fullscreen mobile search overlay with autocomplete
 * - Category filter chips & library view
 */

const CURATED_FEEDS = [
  {
    id: 'jfKfPfyJRdk',
    title: 'Lofi Girl - Relaxing Beats to Study/Chill to',
    channel: 'Lofi Girl',
    category: 'Lofi',
    duration: 0,
    duration_text: 'LIVE',
    views: '45K watching',
    timeAgo: 'Started streaming',
    tags: ['lofi', 'beats', 'study', 'relax', 'chill', 'music'],
    thumbnail: 'https://img.youtube.com/vi/jfKfPfyJRdk/hqdefault.jpg'
  },
  {
    id: '4xDzrJKXOOY',
    title: 'Synthwave Radio - Chill synth / retro beats to work/study to',
    channel: 'Lofi Girl Synthwave',
    category: 'Music',
    duration: 0,
    duration_text: 'LIVE',
    views: '12K watching',
    timeAgo: 'Started streaming',
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
    views: '28K watching',
    timeAgo: 'Live',
    tags: ['lofi', 'sleep', 'beats', 'chill', 'music'],
    thumbnail: 'https://img.youtube.com/vi/5qap5aO4i9A/hqdefault.jpg'
  },
  {
    id: '1fueZCTYkpA',
    title: 'Coffee Shop Ambience & Smooth Bossa Nova Jazz - Relaxing Music',
    channel: 'Coffee Music Hub',
    category: 'Ambience',
    duration: 14400,
    duration_text: '4:00:00',
    views: '3.4M views',
    timeAgo: '1 year ago',
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
    views: '8.1M views',
    timeAgo: '2 years ago',
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
    views: '15M views',
    timeAgo: '3 years ago',
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
    views: '5.2M views',
    timeAgo: '10 months ago',
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
    views: '1.6B views',
    timeAgo: '14 years ago',
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
    views: '890K views',
    timeAgo: '6 months ago',
    tags: ['podcast', 'focus', 'neuroscience', 'productivity', 'health'],
    thumbnail: 'https://img.youtube.com/vi/2MIdr8t1Jbg/hqdefault.jpg'
  }
];

class WebAppController {
  constructor() {
    this.history = this.loadStorage('yt_adfree_history') || [];
    this.favorites = this.loadStorage('yt_adfree_favorites') || [];
    this.subscribedChannels = this.loadStorage('yt_adfree_subs') || ['Lofi Girl', 'Coffee Music Hub'];

    this.currentCategory = 'All';
    this.currentPlaylist = [...CURATED_FEEDS];
    this.currentIndex = 0;
    this.currentView = 'home';

    this.suggestDebounceTimer = null;
    this.isLiked = false;

    this.initUI();
    this.renderFeeds();
    this.renderUpNext();
    this.renderFavorites();
  }

  initUI() {
    // 1. Search Overlay Open & Close
    const btnOpenSearch = document.getElementById('btn-open-search');
    const btnCloseSearch = document.getElementById('btn-close-search');
    const searchOverlay = document.getElementById('yt-search-overlay');
    const searchInput = document.getElementById('yt-search-input');
    const btnClearSearch = document.getElementById('btn-clear-yt-search');
    const searchForm = document.getElementById('yt-search-form');
    const suggestionsBox = document.getElementById('yt-search-suggestions');

    if (btnOpenSearch && searchOverlay) {
      btnOpenSearch.addEventListener('click', () => {
        searchOverlay.style.display = 'flex';
        setTimeout(() => searchInput && searchInput.focus(), 80);
      });
    }

    if (btnCloseSearch && searchOverlay) {
      btnCloseSearch.addEventListener('click', () => {
        searchOverlay.style.display = 'none';
        if (suggestionsBox) suggestionsBox.style.display = 'none';
      });
    }

    if (searchInput && btnClearSearch) {
      searchInput.addEventListener('input', () => {
        const val = searchInput.value.trim();
        btnClearSearch.style.display = val.length > 0 ? 'block' : 'none';
        this.fetchAutocomplete(val, suggestionsBox);
      });

      btnClearSearch.addEventListener('click', () => {
        searchInput.value = '';
        btnClearSearch.style.display = 'none';
        if (suggestionsBox) suggestionsBox.style.display = 'none';
        searchInput.focus();
      });
    }

    if (searchForm && searchInput) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (!query) return;

        if (suggestionsBox) suggestionsBox.style.display = 'none';
        if (searchOverlay) searchOverlay.style.display = 'none';
        this.handleSearchOrUrl(query);
      });
    }

    // 2. Category Filter Chips
    const chips = document.querySelectorAll('.yt-chips-scroll .yt-chip');
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        chips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        this.currentCategory = chip.dataset.category || 'All';
        this.renderFeeds();
        if (this.currentView !== 'home') {
          this.switchView('home');
        }
      });
    });

    // 3. Bottom Navigation Tabs
    const navButtons = document.querySelectorAll('.yt-bottom-nav .yt-nav-btn');
    navButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        this.switchView(view);
      });
    });

    // 4. Floating Go Back Button
    const backBtn = document.getElementById('floating-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        const watchSection = document.getElementById('yt-watch-section');
        if (watchSection && watchSection.style.display !== 'none' && window.scrollY > 100) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (this.currentView !== 'home') {
          this.switchView('home');
        } else if (watchSection && watchSection.style.display !== 'none') {
          watchSection.style.display = 'none';
          if (window.playerManager) window.playerManager.pause();
        }
      });
    }
  }

  fetchAutocomplete(query, containerEl) {
    if (!containerEl) return;
    clearTimeout(this.suggestDebounceTimer);

    if (!query || query.length < 2 || window.playerManager.extractVideoId(query)) {
      containerEl.style.display = 'none';
      return;
    }

    this.suggestDebounceTimer = setTimeout(async () => {
      try {
        const resp = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`);
        if (resp.ok) {
          const data = await resp.json();
          const suggestions = data.suggestions || [];
          if (suggestions.length > 0) {
            containerEl.innerHTML = suggestions
              .slice(0, 7)
              .map(
                (item) => `
                <div class="yt-suggestion-item" data-suggestion="${this.escapeHtml(item)}">
                  <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 14z"/></svg>
                  <span>${this.escapeHtml(item)}</span>
                </div>
              `
              )
              .join('');
            containerEl.style.display = 'block';

            containerEl.querySelectorAll('.yt-suggestion-item').forEach((row) => {
              row.addEventListener('click', () => {
                const text = row.dataset.suggestion;
                containerEl.style.display = 'none';
                const searchOverlay = document.getElementById('yt-search-overlay');
                if (searchOverlay) searchOverlay.style.display = 'none';
                this.handleSearchOrUrl(text);
              });
            });
          } else {
            containerEl.style.display = 'none';
          }
        }
      } catch (e) {
        containerEl.style.display = 'none';
      }
    }, 150);
  }

  handleSearchOrUrl(query) {
    const videoId = window.playerManager.extractVideoId(query);
    if (videoId) {
      const videoInfo = {
        id: videoId,
        title: `YouTube Video (${videoId})`,
        channel: 'YouTube Video',
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        duration: 0,
        views: '1.2M views',
        timeAgo: 'Recent'
      };
      this.playVideo(videoInfo);
    } else {
      this.performSearch(query);
    }
  }

  async performSearch(query) {
    this.switchView('search');

    const searchTitleEl = document.getElementById('search-query-title');
    const searchCountEl = document.getElementById('search-result-count');
    const container = document.getElementById('search-results-container');

    if (searchTitleEl) searchTitleEl.textContent = `Results for "${query}"`;
    if (searchCountEl) searchCountEl.textContent = 'Searching...';

    if (container) {
      container.innerHTML = `
        <div class="yt-empty-state">
          <p>Searching YouTube for "<strong>${this.escapeHtml(query)}</strong>"...</p>
        </div>
      `;
    }

    try {
      const resp = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (resp.ok) {
        const data = await resp.json();
        const results = data.results || [];
        if (results.length > 0) {
          this.currentPlaylist = results;
          this.renderCardList(results, container);
          if (searchCountEl) searchCountEl.textContent = `${results.length} results`;
          return;
        }
      }
    } catch (e) {}

    // Fallback curated search
    const lower = query.toLowerCase();
    let localMatches = CURATED_FEEDS.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(lower);
      const matchChannel = item.channel.toLowerCase().includes(lower);
      const matchCategory = item.category.toLowerCase().includes(lower);
      const matchTags = item.tags && item.tags.some((t) => t.includes(lower));
      return matchTitle || matchChannel || matchCategory || matchTags;
    });

    if (localMatches.length === 0) localMatches = CURATED_FEEDS.slice(0, 4);
    this.currentPlaylist = localMatches;
    this.renderCardList(localMatches, container);
    if (searchCountEl) searchCountEl.textContent = `${localMatches.length} results`;
  }

  goHome() {
    this.currentCategory = 'All';
    const chips = document.querySelectorAll('.yt-chips-scroll .yt-chip');
    chips.forEach((c) => c.classList.toggle('active', c.dataset.category === 'All'));
    this.renderFeeds();
    this.switchView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  switchView(viewName) {
    this.currentView = viewName;
    document.querySelectorAll('.yt-tab-view').forEach((el) => el.classList.remove('active'));
    document.querySelectorAll('.yt-bottom-nav .yt-nav-btn').forEach((btn) => btn.classList.remove('active'));

    const targetView = document.getElementById(`view-${viewName}`);
    const targetNav = document.querySelector(`.yt-bottom-nav .yt-nav-btn[data-view="${viewName}"]`);

    if (targetView) targetView.classList.add('active');
    if (targetNav) targetNav.classList.add('active');

    if (viewName === 'library') {
      this.renderFavorites();
      this.renderHistory();
    } else if (viewName === 'subscriptions') {
      this.renderSubscriptions();
    }
  }

  playVideo(videoInfo) {
    window.playerManager.loadVideo(videoInfo.id, videoInfo);
    this.addToHistory(videoInfo);
    this.updateSubscribeButtonState(videoInfo.channel);

    // Render related Up Next recommendations
    this.renderUpNext(videoInfo.id);

    // Scroll smoothly to the player
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  playNextTrack() {
    if (!this.currentPlaylist || this.currentPlaylist.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.currentPlaylist.length;
    this.playVideo(this.currentPlaylist[this.currentIndex]);
  }

  playPrevTrack() {
    if (!this.currentPlaylist || this.currentPlaylist.length === 0) return;
    this.currentIndex = (this.currentIndex - 1 + this.currentPlaylist.length) % this.currentPlaylist.length;
    this.playVideo(this.currentPlaylist[this.currentIndex]);
  }

  toggleSubscribe() {
    const current = window.playerManager.currentVideoInfo;
    if (!current) return;

    const ch = current.channel;
    const idx = this.subscribedChannels.indexOf(ch);
    if (idx > -1) {
      this.subscribedChannels.splice(idx, 1);
    } else {
      this.subscribedChannels.push(ch);
    }

    this.saveStorage('yt_adfree_subs', this.subscribedChannels);
    this.updateSubscribeButtonState(ch);
  }

  updateSubscribeButtonState(channel) {
    const btn = document.getElementById('btn-subscribe');
    if (!btn) return;

    const isSub = this.subscribedChannels.includes(channel);
    if (isSub) {
      btn.textContent = 'Subscribed';
      btn.classList.add('subscribed');
    } else {
      btn.textContent = 'Subscribe';
      btn.classList.remove('subscribed');
    }
  }

  toggleLike() {
    this.isLiked = !this.isLiked;
    const btn = document.getElementById('btn-like');
    const label = document.getElementById('like-count-text');
    if (btn) btn.classList.toggle('active', this.isLiked);
    if (label) label.textContent = this.isLiked ? '43K' : '42K';
  }

  shareVideo() {
    const current = window.playerManager.currentVideoInfo;
    if (!current) return;
    const url = `https://www.youtube.com/watch?v=${current.id}`;
    if (navigator.share) {
      navigator.share({ title: current.title, url: url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        alert('Video link copied to clipboard!');
      });
    }
  }

  toggleFavoriteCurrentVideo() {
    const current = window.playerManager.currentVideoInfo;
    if (!current) return;

    const existsIndex = this.favorites.findIndex((f) => f.id === current.id);
    const btn = document.getElementById('btn-favorite');

    if (existsIndex > -1) {
      this.favorites.splice(existsIndex, 1);
      if (btn) btn.classList.remove('active');
    } else {
      this.favorites.unshift(current);
      if (btn) btn.classList.add('active');
    }

    this.saveStorage('yt_adfree_favorites', this.favorites);
  }

  addToHistory(videoInfo) {
    this.history = this.history.filter((h) => h.id !== videoInfo.id);
    this.history.unshift(videoInfo);
    if (this.history.length > 30) this.history.pop();
    this.saveStorage('yt_adfree_history', this.history);
  }

  /* =========================================================================
     RENDERING HELPERS (Default Mobile YouTube Card Template)
     ========================================================================= */
  renderFeeds() {
    const container = document.getElementById('feeds-grid');
    if (!container) return;

    let items = CURATED_FEEDS;
    if (this.currentCategory !== 'All') {
      items = CURATED_FEEDS.filter((f) => f.category === this.currentCategory);
    }
    this.currentPlaylist = items;
    this.renderCardList(items, container);
  }

  renderUpNext(excludeId = null) {
    const container = document.getElementById('up-next-feed');
    if (!container) return;

    let items = CURATED_FEEDS.filter((f) => f.id !== excludeId);
    this.renderCardList(items, container);
  }

  renderSubscriptions() {
    const container = document.getElementById('subscriptions-feed');
    if (!container) return;

    const items = CURATED_FEEDS.filter((f) => this.subscribedChannels.includes(f.channel));
    if (items.length === 0) {
      container.innerHTML = '<p class="yt-empty-state">No subscriptions yet. Tap Subscribe on any channel to follow them here.</p>';
      return;
    }
    this.renderCardList(items, container);
  }

  renderFavorites() {
    const container = document.getElementById('favorites-list');
    if (!container) return;

    if (this.favorites.length === 0) {
      container.innerHTML = '<p class="yt-empty-state">No saved videos. Tap "Save" below any video to keep it here.</p>';
      return;
    }
    this.renderCardList(this.favorites, container);
  }

  renderHistory() {
    const container = document.getElementById('history-list');
    if (!container) return;

    if (this.history.length === 0) {
      container.innerHTML = '<p class="yt-empty-state">No watch history.</p>';
      return;
    }
    this.renderCardList(this.history, container);
  }

  renderCardList(items, container) {
    if (!container) return;

    container.innerHTML = items
      .map((item) => {
        const initial = (item.channel || 'Y').charAt(0).toUpperCase();
        const durationBadge = item.duration_text || (item.duration > 0 ? window.playerManager.formatTime(item.duration) : '');
        const metaLine = `${item.channel} • ${item.views || '1.4M views'} • ${item.timeAgo || '3 weeks ago'}`;

        return `
        <article class="yt-video-card" onclick='window.app.playVideo(${JSON.stringify(item)})'>
          <div class="yt-thumbnail-wrapper">
            <img src="${item.thumbnail}" alt="${this.escapeHtml(item.title)}" loading="lazy" />
            ${durationBadge ? `<span class="badge-duration">${durationBadge}</span>` : ''}
          </div>
          <div class="yt-card-info">
            <div class="yt-card-avatar">${initial}</div>
            <div class="yt-card-text">
              <h3 class="yt-card-title">${this.escapeHtml(item.title)}</h3>
              <p class="yt-card-sub">${this.escapeHtml(metaLine)}</p>
            </div>
            <button class="yt-card-menu-btn" onclick="event.stopPropagation();" aria-label="More options">⋮</button>
          </div>
        </article>
      `;
      })
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
