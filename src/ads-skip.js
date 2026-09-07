/**
 * YouTube AdFree - Automated Ad Skipping, Banner Blocker & Responsive Engine
 * Designed for m.youtube.com within Capacitor WebView
 * Enhanced for iPhone 14 Pro / 15 / 16 Dynamic Island & Edge-to-Edge Displays
 */
(function () {
  'use strict';

  if (window.__yt_adfree_injected__) {
    console.log('[YT-AdFree] Script already initialized.');
    return;
  }
  window.__yt_adfree_injected__ = true;

  console.log('[YT-AdFree] Initializing Ad-Skip & Dynamic Island Engine...');

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

  // 3. Inject Styles: Ad Shield + iPhone 14 Pro Dynamic Island & Responsive Layout
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
      /* 3. DYNAMIC ISLAND (iPhone 14 Pro/15/16) & NOTCH INSETS       */
      /* ============================================================ */

      /* Top Header: Expand height and pad content below Dynamic Island (~54px) */
      header,
      ytm-mobile-topbar-renderer,
      #header-bar,
      .mobile-topbar-header {
        height: calc(48px + env(safe-area-inset-top, 0px)) !important;
        padding-top: env(safe-area-inset-top, 0px) !important;
        box-sizing: border-box !important;
        background-color: #0f0f0f !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        z-index: 9999 !important;
      }

      /* Feed Container: Push content down so it starts cleanly under the Dynamic Island header */
      ytm-app,
      #app,
      .page-container,
      ytm-browse,
      ytm-single-column-browse-results-renderer {
        padding-top: calc(48px + env(safe-area-inset-top, 0px)) !important;
        padding-bottom: calc(48px + env(safe-area-inset-bottom, 0px)) !important;
        box-sizing: border-box !important;
      }

      /* Bottom Navigation / Pivot Bar: Pad up for Home Indicator Bar */
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
        padding-top: env(safe-area-inset-top, 0px) !important;
        box-sizing: border-box !important;
      }

      /* Search header input bar alignment */
      ytm-search-header-renderer {
        padding-top: env(safe-area-inset-top, 0px) !important;
        background-color: #0f0f0f !important;
      }

      /* Dialogs & Bottom Sheets: Stay above home bar and below Dynamic Island */
      ytm-bottom-sheet-renderer,
      ytm-engagement-panel-section-list-renderer,
      .dialog-container {
        padding-top: env(safe-area-inset-top, 0px) !important;
        padding-bottom: env(safe-area-inset-bottom, 0px) !important;
        box-sizing: border-box !important;
      }

      /* ============================================================ */
      /* 4. LANDSCAPE MODE ON DYNAMIC ISLAND                          */
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
      }

      /* ============================================================ */
      /* 5. FULLSCREEN VIDEO IMMERSION                                */
      /* ============================================================ */
      /* In fullscreen, clear safe areas so video naturally centers edge-to-edge */
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
      /* 6. TABLET / iPAD MULTI-COLUMN GRID (>= 600px)                */
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

  // 4. Simulated Click Helper (bypasses synthetic check)
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

  // 5. Skip Button Selectors
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

  // 6. Video Ad Bypass Logic
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

  // 7. Dismiss Upsell Popups / App Prompts
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

  // 8. Main cycle
  function runCheck() {
    ensureResponsiveViewport();
    injectStyles();
    handleVideoAds();
    dismissPopups();
  }

  // Initial execution
  runCheck();

  // 9. Observer & Timers for SPA & Dynamic Ad Injections
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

  console.log('[YT-AdFree] Ad-Skip & Dynamic Island Engine active.');
})();
