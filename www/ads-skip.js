/**
 * YouTube AdFree - Automated Ad Skipping & Ad Blocking Script
 * Designed for m.youtube.com within Capacitor WebView
 */
(function () {
  'use strict';

  if (window.__yt_adfree_injected__) {
    console.log('[YT-AdFree] Script already initialized.');
    return;
  }
  window.__yt_adfree_injected__ = true;

  console.log('[YT-AdFree] Initializing Ad-Skip & Banner Blocker...');

  // 1. Inject CSS to hide banners, promoted cards, and ad overlays
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

  function injectStyles() {
    if (document.getElementById('yt-adfree-styles')) return;

    const style = document.createElement('style');
    style.id = 'yt-adfree-styles';
    style.textContent = `
      ${AD_SELECTORS_CSS} {
        display: none !important;
        opacity: 0 !important;
        pointer-events: none !important;
        height: 0 !important;
        min-height: 0 !important;
      }
    `;

    const target = document.head || document.documentElement;
    if (target) {
      target.appendChild(style);
    }
  }

  // 2. Simulated Click Helper (bypasses synthetic check)
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

  // 3. Skip Button Selectors
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

  // 4. Video Ad Bypass Logic
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

  // 5. Dismiss Upsell Popups / App Prompts
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

  // 6. Main cycle
  function runCheck() {
    injectStyles();
    handleVideoAds();
    dismissPopups();
  }

  // Initial execution
  runCheck();

  // 7. Observer & Timers for SPA & Dynamic Ad Injections
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

  // Hook navigation events on YouTube's SPA
  window.addEventListener('yt-navigate-finish', runCheck);
  window.addEventListener('yt-page-data-updated', runCheck);
  window.addEventListener('popstate', runCheck);

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

  console.log('[YT-AdFree] Ad-Skip & Banner Blocker active.');
})();
