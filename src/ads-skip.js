/**
 * YouTube AdFree - Automated Ad Skipping, Banner Blocker & Responsive Engine
 * Designed for m.youtube.com within Capacitor WebView
 * Enhanced for iPhone 14 Pro / 15 / 16 Dynamic Island, Generous Top Spacing & Bottom-Right Go Back Button
 */
(function () {
  'use strict';

  if (window.__yt_adfree_injected__) {
    console.log('[YT-AdFree] Script already initialized.');
    return;
  }
  window.__yt_adfree_injected__ = true;

  console.log('[YT-AdFree] Initializing Ad-Skip, Search Spacing & Go Back Engine...');

  // 1. Ensure Responsive Viewport with viewport-fit=cover
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

  // 2. CSS Selectors for Ad Elements
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
    '.ad-showing .ytp-ad-text'
  ].join(',\n');

  // 3. Inject Styles: Ad Shield + Dynamic Island Top Spacing + Bottom-Right Back Button
  function injectStyles() {
    if (document.getElementById('yt-adfree-styles')) return;

    const style = document.createElement('style');
    style.id = 'yt-adfree-styles';
    style.textContent = `
      /* ============================================================ */
      /* 1. AD BLOCKING RULES                                         */
      /* ============================================================ */
      ${AD_SELECTORS_CSS} {
        display: none !important;
        opacity: 0 !important;
        pointer-events: none !important;
        height: 0 !important;
        min-height: 0 !important;
      }

      /* ============================================================ */
      /* 2. BASE RESPONSIVE & DARK THEME SETUP                        */
      /* ============================================================ */
      html, body {
        background-color: #0f0f0f !important;
        color: #ffffff !important;
        -webkit-tap-highlight-color: transparent !important;
        overscroll-behavior-y: contain !important;
        -webkit-overflow-scrolling: touch !important;
      }

      /* ============================================================ */
      /* 3. DYNAMIC ISLAND & SEARCH BAR TOP SPACING                   */
      /* ============================================================ */

      /* Top Header: Generous padding-top to give breathing room for Search Icon below Dynamic Island */
      header,
      ytm-mobile-topbar-renderer,
      #header-bar,
      .mobile-topbar-header {
        height: calc(56px + env(safe-area-inset-top, 0px)) !important;
        padding-top: calc(env(safe-area-inset-top, 0px) + 14px) !important;
        padding-left: 12px !important;
        padding-right: 12px !important;
        box-sizing: border-box !important;
        background-color: #0f0f0f !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        z-index: 9999 !important;
      }

      /* Ensure Search button and Topbar icons have comfortable touch targets */
      ytm-mobile-topbar-renderer .mobile-topbar-header-content,
      .mobile-topbar-header-content {
        display: flex !important;
        align-items: center !important;
        height: 100% !important;
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

      /* Search Header Page (when search overlay is active) */
      ytm-search-header-renderer {
        height: calc(56px + env(safe-area-inset-top, 0px)) !important;
        padding-top: calc(env(safe-area-inset-top, 0px) + 14px) !important;
        box-sizing: border-box !important;
        background-color: #0f0f0f !important;
      }

      /* Feed & Page Body: Push down cleanly below the expanded header */
      ytm-app,
      #app,
      .page-container,
      ytm-browse,
      ytm-single-column-browse-results-renderer {
        padding-top: calc(56px + env(safe-area-inset-top, 0px)) !important;
        padding-bottom: calc(56px + env(safe-area-inset-bottom, 0px)) !important;
        box-sizing: border-box !important;
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

      /* Watch Page (/watch): Ensure player isn't cut off by the Dynamic Island in portrait */
      ytm-watch {
        padding-top: calc(env(safe-area-inset-top, 0px) + 4px) !important;
        box-sizing: border-box !important;
      }

      /* Dialogs & Bottom Sheets: Stay above home bar and below Dynamic Island */
      ytm-bottom-sheet-renderer,
      ytm-engagement-panel-section-list-renderer,
      .dialog-container {
        padding-top: calc(env(safe-area-inset-top, 0px) + 14px) !important;
        padding-bottom: env(safe-area-inset-bottom, 0px) !important;
        box-sizing: border-box !important;
      }

      /* ============================================================ */
      /* 4. FLOATING GO BACK BUTTON (BOTTOM RIGHT CORNER)             */
      /* ============================================================ */
      #yt-adfree-back-btn {
        position: fixed !important;
        bottom: calc(64px + env(safe-area-inset-bottom, 0px)) !important;
        right: 18px !important;
        width: 48px !important;
        height: 48px !important;
        border-radius: 50% !important;
        background: rgba(30, 30, 30, 0.88) !important;
        backdrop-filter: blur(16px) !important;
        -webkit-backdrop-filter: blur(16px) !important;
        border: 1px solid rgba(255, 255, 255, 0.25) !important;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.55), 0 1px 4px rgba(0, 0, 0, 0.35) !important;
        color: #ffffff !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        z-index: 99999 !important;
        transition: transform 0.12s ease, opacity 0.2s ease, background 0.2s ease !important;
        -webkit-tap-highlight-color: transparent !important;
        outline: none !important;
        padding: 0 !important;
      }

      #yt-adfree-back-btn:active {
        transform: scale(0.90) !important;
        background: rgba(55, 55, 55, 0.95) !important;
      }

      #yt-adfree-back-btn svg {
        width: 24px;
        height: 24px;
        stroke: #ffffff;
        stroke-width: 2.6;
        fill: none;
        stroke-linecap: round;
        stroke-linejoin: round;
        pointer-events: none;
      }

      /* Hide back button when playing video in fullscreen */
      :fullscreen #yt-adfree-back-btn,
      :-webkit-full-screen #yt-adfree-back-btn,
      [fullscreen="true"] #yt-adfree-back-btn,
      .fullscreen #yt-adfree-back-btn,
      .player-fullscreen #yt-adfree-back-btn,
      body.fullscreen-mode #yt-adfree-back-btn {
        display: none !important;
      }

      /* ============================================================ */
      /* 5. LANDSCAPE MODE ON DYNAMIC ISLAND                          */
      /* ============================================================ */
      @media screen and (orientation: landscape) {
        body {
          padding-left: env(safe-area-inset-left, 0px) !important;
          padding-right: env(safe-area-inset-right, 0px) !important;
        }

        /* Keep video player controls padded away from the pill on the side */
        .ytp-chrome-bottom,
        .ytp-chrome-top,
        .ytm-custom-control,
        .player-controls-bottom {
          padding-left: calc(14px + env(safe-area-inset-left, 0px)) !important;
          padding-right: calc(14px + env(safe-area-inset-right, 0px)) !important;
          box-sizing: border-box !important;
        }

        #yt-adfree-back-btn {
          bottom: calc(20px + env(safe-area-inset-bottom, 0px)) !important;
          right: calc(16px + env(safe-area-inset-right, 0px)) !important;
        }
      }

      /* ============================================================ */
      /* 6. FULLSCREEN VIDEO IMMERSION                                */
      /* ============================================================ */
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

      /* ============================================================ */
      /* 7. TABLET / iPAD MULTI-COLUMN GRID (>= 600px)                */
      /* ============================================================ */
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

      /* Large Tablets & Desktop Widths (>= 1024px) */
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

    const target = document.head || document.documentElement;
    if (target) {
      target.appendChild(style);
    }
  }

  // 4. Ensure Bottom-Right Floating Go Back Button
  function ensureBackButton() {
    if (document.getElementById('yt-adfree-back-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'yt-adfree-back-btn';
    btn.setAttribute('aria-label', 'Go Back');
    btn.setAttribute('title', 'Go Back');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M15 19l-7-7 7-7"/>
      </svg>
    `;

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();

      // Check if YouTube native back button exists on the page (e.g. inside search or player)
      const nativeBackBtn =
        document.querySelector('ytm-search-header-renderer button[aria-label*="Back" i]') ||
        document.querySelector('button[aria-label*="Back" i]');

      if (nativeBackBtn && nativeBackBtn.offsetParent !== null && window.location.pathname !== '/') {
        try {
          nativeBackBtn.click();
          return;
        } catch (err) {}
      }

      // Fallback to browser history navigation
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = 'https://m.youtube.com';
      }
    });

    const target = document.body || document.documentElement;
    if (target) {
      target.appendChild(btn);
    }
  }

  // 5. Simulated Click Helper (bypasses synthetic check)
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

  // 6. Skip Button Selectors
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

  // 7. Video Ad Bypass Logic
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

    // Click skip buttons whenever present
    for (const selector of SKIP_BUTTON_SELECTORS) {
      const skipButtons = document.querySelectorAll(selector);
      skipButtons.forEach((btn) => {
        if (btn && btn.offsetParent !== null) {
          triggerClick(btn);
        }
      });
    }

    // If ad is actively playing inside video element
    if (isAdActive && video) {
      // Mute ad audio so user doesn't hear it
      if (!video.dataset.originalMuted) {
        video.dataset.originalMuted = video.muted ? 'true' : 'false';
      }
      video.muted = true;

      // Accelerate ad to maximum rate
      video.playbackRate = 16.0;

      // Jump to end of ad
      if (isFinite(video.duration) && video.duration > 0) {
        video.currentTime = video.duration;
      } else {
        video.currentTime = 999999;
      }

      // Re-trigger skip clicks
      for (const selector of SKIP_BUTTON_SELECTORS) {
        const btn = document.querySelector(selector);
        if (btn) triggerClick(btn);
      }
    } else if (video && video.dataset.originalMuted) {
      // Restore audio when ad ends
      if (video.dataset.originalMuted === 'false') {
        video.muted = false;
      }
      delete video.dataset.originalMuted;
      if (video.playbackRate === 16.0) {
        video.playbackRate = 1.0;
      }
    }
  }

  // 8. Dismiss Upsell Popups / App Prompts
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

  // 9. Main cycle
  function runCheck() {
    ensureResponsiveViewport();
    injectStyles();
    ensureBackButton();
    handleVideoAds();
    dismissPopups();
  }

  // Initial execution
  runCheck();

  // 10. Observer & Timers for SPA & Dynamic Ad Injections
  const observer = new MutationObserver(() => {
    runCheck();
  });

  const attachObserver = () => {
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, { childList: true, subtree: true });
      });
    }
  };
  attachObserver();

  // Polling interval (250ms) for high responsiveness
  setInterval(runCheck, 250);

  // Hook navigation & orientation events
  window.addEventListener('yt-navigate-finish', runCheck);
  window.addEventListener('yt-page-data-updated', runCheck);
  window.addEventListener('popstate', runCheck);
  window.addEventListener('resize', runCheck);
  window.addEventListener('orientationchange', runCheck);

  // Hook video element events when available
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

  console.log('[YT-AdFree] Ad-Skip, Search Spacing & Go Back Engine active.');
})();
