/**
 * YouTube AdFree - Automated Ad Skipping, Background Playback, Dynamic Island & Daily Use UX Engine
 * Designed for m.youtube.com within Capacitor WebView
 */
(function () {
  'use strict';

  // Prevent duplicate execution of event listeners while allowing style/DOM updates
  const isFirstRun = !window.__yt_adfree_injected__;
  window.__yt_adfree_injected__ = true;

  if (isFirstRun) {
    console.log('[YT-AdFree] Initializing Daily Use & Ad-Skip Engine...');
  }

  // =========================================================================
  // 1. BACKGROUND AUDIO PLAYBACK (Prevents YouTube pausing when minimized/locked)
  // =========================================================================
  try {
    Object.defineProperty(document, 'hidden', {
      get: function () {
        return false;
      },
      configurable: true
    });
    Object.defineProperty(document, 'visibilityState', {
      get: function () {
        return 'visible';
      },
      configurable: true
    });
    window.addEventListener(
      'visibilitychange',
      function (e) {
        e.stopImmediatePropagation();
      },
      true
    );
  } catch (err) {}

  // =========================================================================
  // 2. VIEWPORT CONFIGURATION (Edge-to-Edge with viewport-fit=cover)
  // =========================================================================
  function ensureResponsiveViewport() {
    let meta = document.querySelector('meta[name="viewport"]');
    const targetContent =
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = targetContent;
      (document.head || document.documentElement).appendChild(meta);
    } else if (!meta.content.includes('viewport-fit=cover')) {
      meta.content = targetContent;
    }
  }

  // =========================================================================
  // 3. STYLESHEET INJECTION (Ad Block, Dynamic Island, Clean Daily UI)
  // =========================================================================
  const AD_SELECTORS_CSS = [
    'ytm-promoted-sparkles-web-renderer',
    'ytm-promoted-video-renderer',
    'ytm-companion-ad-renderer',
    'ytm-ad-slot-renderer',
    'ytm-statement-banner-renderer',
    'ytm-mealbar-promo-renderer',
    'ytm-compact-promoted-item-renderer',
    'ytd-action-companion-ad-renderer',
    '.ytp-ad-overlay-container',
    '.ytp-ad-message-container',
    '.ytp-ad-action-interstitial',
    '.ytp-ad-player-overlay',
    '.ad-container',
    '.sparkles-light-cta',
    'ytm-paid-content-overlay-renderer',
    '#player-ads',
    '.ad-showing .ytp-ad-text',
    'ytm-app-banner',
    '.app-banner',
    'ytm-upsell-dialog-renderer'
  ].join(',\n');

  function injectStyles() {
    let style = document.getElementById('yt-adfree-styles');
    if (!style) {
      style = document.createElement('style');
      style.id = 'yt-adfree-styles';
      (document.head || document.documentElement).appendChild(style);
    }

    style.textContent = `
      /* --- AD BLOCKING & CLUTTER REMOVAL --- */
      ${AD_SELECTORS_CSS} {
        display: none !important;
        opacity: 0 !important;
        pointer-events: none !important;
        height: 0 !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      /* --- GLOBAL BASE SETUP --- */
      html, body {
        background-color: #0f0f0f !important;
        color: #ffffff !important;
        -webkit-tap-highlight-color: transparent !important;
        overscroll-behavior-y: contain !important;
        -webkit-overflow-scrolling: touch !important;
      }

      /* --- DYNAMIC ISLAND & NOTCH CLEARANCE (NON-COMPOUNDING) --- */
      /* Top Header: Fits Dynamic Island & status bar cleanly */
      header,
      ytm-mobile-topbar-renderer,
      #header-bar,
      .mobile-topbar-header {
        height: calc(48px + env(safe-area-inset-top, 0px)) !important;
        padding-top: env(safe-area-inset-top, 0px) !important;
        padding-left: 10px !important;
        padding-right: 10px !important;
        box-sizing: border-box !important;
        background-color: #0f0f0f !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        z-index: 9999 !important;
      }

      /* Search & Topbar Buttons: Clean vertical centering inside 48px bar */
      ytm-mobile-topbar-renderer .mobile-topbar-header-content,
      .mobile-topbar-header-content {
        display: flex !important;
        align-items: center !important;
        height: 48px !important;
      }

      button[aria-label*="Search" i],
      .topbar-menu-button,
      ytm-searchbox {
        min-width: 44px !important;
        min-height: 44px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
      }

      /* Search Input Header Page (Active Search) */
      ytm-search-header-renderer {
        height: calc(48px + env(safe-area-inset-top, 0px)) !important;
        padding-top: env(safe-area-inset-top, 0px) !important;
        box-sizing: border-box !important;
        background-color: #0f0f0f !important;
      }

      /* Main Page Body: Push down ONCE on the root app container only */
      body > ytm-app,
      #app {
        padding-top: calc(48px + env(safe-area-inset-top, 0px)) !important;
        padding-bottom: calc(48px + env(safe-area-inset-bottom, 0px)) !important;
        box-sizing: border-box !important;
      }

      /* Explicitly zero out nested children so padding never compounds/multiplies */
      .page-container,
      ytm-browse,
      ytm-single-column-browse-results-renderer,
      ytm-rich-grid-renderer {
        padding-top: 0 !important;
        margin-top: 0 !important;
      }

      /* Bottom Navigation / Pivot Bar */
      ytm-pivot-bar-renderer,
      .pivot-bar,
      .mobile-bottom-navigation {
        height: calc(48px + env(safe-area-inset-bottom, 0px)) !important;
        padding-bottom: env(safe-area-inset-bottom, 0px) !important;
        box-sizing: border-box !important;
        background-color: #0f0f0f !important;
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        z-index: 9998 !important;
      }

      /* Watch Page (/watch): Player positioning */
      ytm-watch {
        padding-top: 0 !important;
        margin-top: 0 !important;
        box-sizing: border-box !important;
      }

      /* Bottom sheets & popups */
      ytm-bottom-sheet-renderer,
      ytm-engagement-panel-section-list-renderer,
      .dialog-container {
        padding-top: env(safe-area-inset-top, 0px) !important;
        padding-bottom: env(safe-area-inset-bottom, 0px) !important;
        box-sizing: border-box !important;
      }

      /* --- FLOATING GO BACK BUTTON (BOTTOM RIGHT) --- */
      #yt-adfree-back-btn {
        position: fixed !important;
        bottom: calc(66px + env(safe-area-inset-bottom, 0px)) !important;
        right: 18px !important;
        width: 50px !important;
        height: 50px !important;
        border-radius: 50% !important;
        background: rgba(32, 32, 32, 0.90) !important;
        backdrop-filter: blur(20px) !important;
        -webkit-backdrop-filter: blur(20px) !important;
        border: 1.5px solid rgba(255, 255, 255, 0.28) !important;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6), 0 2px 6px rgba(0, 0, 0, 0.4) !important;
        color: #ffffff !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        z-index: 99999 !important;
        transition: transform 0.12s ease, background 0.15s ease !important;
        -webkit-tap-highlight-color: transparent !important;
        outline: none !important;
        padding: 0 !important;
        user-select: none !important;
        -webkit-user-select: none !important;
      }

      #yt-adfree-back-btn:active {
        transform: scale(0.88) !important;
        background: rgba(65, 65, 65, 0.95) !important;
      }

      #yt-adfree-back-btn svg {
        width: 26px;
        height: 26px;
        stroke: #ffffff;
        stroke-width: 2.8;
        fill: none;
        stroke-linecap: round;
        stroke-linejoin: round;
        pointer-events: none;
      }

      /* Fullscreen: Hide floating back button so it doesn't obstruct video */
      :fullscreen #yt-adfree-back-btn,
      :-webkit-full-screen #yt-adfree-back-btn,
      [fullscreen="true"] #yt-adfree-back-btn,
      .fullscreen #yt-adfree-back-btn,
      .player-fullscreen #yt-adfree-back-btn {
        display: none !important;
      }

      /* --- LANDSCAPE CONTROLS PADDING --- */
      @media screen and (orientation: landscape) {
        body {
          padding-left: env(safe-area-inset-left, 0px) !important;
          padding-right: env(safe-area-inset-right, 0px) !important;
        }

        .ytp-chrome-bottom,
        .ytp-chrome-top,
        .ytm-custom-control,
        .player-controls-bottom {
          padding-left: calc(16px + env(safe-area-inset-left, 0px)) !important;
          padding-right: calc(16px + env(safe-area-inset-right, 0px)) !important;
          box-sizing: border-box !important;
        }

        #yt-adfree-back-btn {
          bottom: calc(20px + env(safe-area-inset-bottom, 0px)) !important;
          right: calc(16px + env(safe-area-inset-right, 0px)) !important;
        }
      }

      /* --- FULLSCREEN VIDEO IMMERSION --- */
      :fullscreen,
      :-webkit-full-screen,
      [fullscreen="true"],
      .fullscreen,
      .player-fullscreen {
        padding: 0 !important;
        margin: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        max-width: 100vw !important;
        max-height: 100vh !important;
      }

      /* --- TABLET / iPAD RESPONSIVE GRID (>= 600px) --- */
      @media screen and (min-width: 600px) {
        ytm-rich-grid-renderer .rich-grid-renderer-contents,
        ytm-item-section-renderer .item-section-renderer-contents,
        .media-item-list {
          display: grid !important;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) !important;
          gap: 16px !important;
          padding: 16px !important;
          box-sizing: border-box !important;
        }

        ytm-rich-item-renderer,
        ytm-video-with-context-renderer,
        ytm-compact-video-renderer {
          margin: 0 !important;
          width: 100% !important;
          display: flex !important;
          flex-direction: column !important;
        }

        ytm-media-item .media-item-thumbnail-container,
        .video-thumbnail-container-compact {
          aspect-ratio: 16 / 9 !important;
          width: 100% !important;
          border-radius: 12px !important;
          overflow: hidden !important;
        }

        #player-container-id,
        .player-container {
          max-height: 52vh !important;
          background: #000000 !important;
        }
      }

      @media screen and (min-width: 1024px) {
        ytm-rich-grid-renderer .rich-grid-renderer-contents,
        ytm-item-section-renderer .item-section-renderer-contents {
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)) !important;
          gap: 20px !important;
          max-width: 1440px !important;
          margin: 0 auto !important;
        }
      }
    `;
  }

  // =========================================================================
  // 4. FLOATING GO BACK BUTTON (Bottom-Right, Tap: Back, Long-Press: Reload)
  // =========================================================================
  function ensureBackButton() {
    let btn = document.getElementById('yt-adfree-back-btn');
    if (btn) return;

    btn = document.createElement('button');
    btn.id = 'yt-adfree-back-btn';
    btn.setAttribute('aria-label', 'Go Back (Hold to Refresh)');
    btn.setAttribute('title', 'Tap: Back | Hold: Refresh');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M15 19l-7-7 7-7"/>
      </svg>
    `;

    let pressTimer = null;
    let isLongPress = false;

    // Handle touch/mouse events for tap vs long-press
    const startPress = () => {
      isLongPress = false;
      pressTimer = setTimeout(() => {
        isLongPress = true;
        // Visual indicator that long-press triggered
        btn.style.transform = 'scale(1.15)';
        setTimeout(() => {
          window.location.reload();
        }, 150);
      }, 600);
    };

    const cancelPress = () => {
      clearTimeout(pressTimer);
      btn.style.transform = '';
    };

    btn.addEventListener('touchstart', startPress, { passive: true });
    btn.addEventListener('touchend', (e) => {
      clearTimeout(pressTimer);
      btn.style.transform = '';
      if (!isLongPress) {
        handleBackNavigation(e);
      }
    });
    btn.addEventListener('touchcancel', cancelPress, { passive: true });

    btn.addEventListener('mousedown', startPress);
    btn.addEventListener('mouseup', (e) => {
      clearTimeout(pressTimer);
      btn.style.transform = '';
      if (!isLongPress) {
        handleBackNavigation(e);
      }
    });

    function handleBackNavigation(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      // 1. Try clicking YouTube's internal back button if present
      const internalBackBtn =
        document.querySelector('ytm-search-header-renderer button[aria-label*="Back" i]') ||
        document.querySelector('button[aria-label*="Back" i]');

      if (
        internalBackBtn &&
        internalBackBtn.offsetParent !== null &&
        window.location.pathname !== '/'
      ) {
        try {
          internalBackBtn.click();
          return;
        } catch (err) {}
      }

      // 2. Browser history back
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = 'https://m.youtube.com';
      }
    }

    const target = document.body || document.documentElement;
    if (target) {
      target.appendChild(btn);
    }
  }

  // =========================================================================
  // 5. HELPER: SIMULATE TRUSTED CLICK
  // =========================================================================
  function triggerClick(element) {
    if (!element) return;
    try {
      element.click();
    } catch (e) {}

    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(
      (eventType) => {
        try {
          const event = new MouseEvent(eventType, {
            bubbles: true,
            cancelable: true,
            view: window
          });
          element.dispatchEvent(event);
        } catch (e) {}
      }
    );
  }

  // =========================================================================
  // 6. VIDEO AD FAST-FORWARD & BYPASS LOGIC
  // =========================================================================
  const SKIP_BUTTON_SELECTORS = [
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button-slot',
    '.videoAdUiSkipButton',
    'button.ytp-ad-skip-button-text',
    '.ytp-ad-overlay-close-button',
    '[id^="skip-button"]',
    'button[class*="skip-button"]'
  ];

  function handleVideoAds() {
    const player =
      document.querySelector('#movie_player') ||
      document.querySelector('.html5-video-player') ||
      document.querySelector('ytm-custom-control');

    const isAdActive =
      document.querySelector('.ad-showing') ||
      document.querySelector('.ad-interrupting') ||
      (player &&
        (player.classList.contains('ad-showing') ||
          player.classList.contains('ad-interrupting')));

    const video = document.querySelector('video');

    // Click skip buttons immediately
    for (const selector of SKIP_BUTTON_SELECTORS) {
      const skipButtons = document.querySelectorAll(selector);
      skipButtons.forEach((btn) => {
        if (btn && btn.offsetParent !== null) {
          triggerClick(btn);
        }
      });
    }

    // Fast forward active video ad
    if (isAdActive && video) {
      if (!video.dataset.originalMuted) {
        video.dataset.originalMuted = video.muted ? 'true' : 'false';
      }
      video.muted = true;
      video.playbackRate = 16.0;

      if (isFinite(video.duration) && video.duration > 0) {
        video.currentTime = video.duration;
      } else {
        video.currentTime = 999999;
      }

      for (const selector of SKIP_BUTTON_SELECTORS) {
        const btn = document.querySelector(selector);
        if (btn) triggerClick(btn);
      }
    } else if (video && video.dataset.originalMuted) {
      if (video.dataset.originalMuted === 'false') {
        video.muted = false;
      }
      delete video.dataset.originalMuted;
      if (video.playbackRate === 16.0) {
        video.playbackRate = 1.0;
      }
    }
  }

  // =========================================================================
  // 7. DISMISS UPSELL DIALOGS & APP PROMPTS
  // =========================================================================
  function dismissPopups() {
    const dismissSelectors = [
      'ytm-mealbar-promo-renderer button[aria-label*="dismiss" i]',
      'ytm-upsell-dialog-renderer #dismiss-button',
      'button[aria-label="No thanks"]',
      'button[aria-label="Dismiss"]'
    ];

    dismissSelectors.forEach((sel) => {
      const btn = document.querySelector(sel);
      if (btn && btn.offsetParent !== null) {
        triggerClick(btn);
      }
    });
  }

  // =========================================================================
  // 8. MASTER RUN CYCLE & OBSERVERS
  // =========================================================================
  function runCheck() {
    ensureResponsiveViewport();
    injectStyles();
    ensureBackButton();
    handleVideoAds();
    dismissPopups();
  }

  runCheck();

  // Active mutation observer
  if (isFirstRun) {
    const observer = new MutationObserver(() => {
      runCheck();
    });

    const attachObserver = () => {
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
          }
        });
      }
    };
    attachObserver();

    // High frequency interval (200ms) for instantaneous ad skip & sticky UI
    setInterval(runCheck, 200);

    // SPA navigation & lifecycle events
    window.addEventListener('yt-navigate-finish', runCheck);
    window.addEventListener('yt-page-data-updated', runCheck);
    window.addEventListener('popstate', runCheck);
    window.addEventListener('resize', runCheck);
    window.addEventListener('orientationchange', runCheck);

    // Video element hooks
    function attachVideoListeners() {
      const video = document.querySelector('video');
      if (video && !video.__yt_adfree_attached) {
        video.__yt_adfree_attached = true;
        video.addEventListener('timeupdate', handleVideoAds);
        video.addEventListener('play', handleVideoAds);
        video.addEventListener('loadedmetadata', handleVideoAds);
      }
    }

    setInterval(attachVideoListeners, 1000);
    attachVideoListeners();

    console.log('[YT-AdFree] Daily Use & Ad-Skip Engine is fully active.');
  }
})();
