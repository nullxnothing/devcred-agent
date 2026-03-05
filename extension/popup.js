// Blacklist Popup Script

const API_BASE = 'https://devkarmaagent-production.up.railway.app';

document.addEventListener('DOMContentLoaded', async () => {
  const showCardToggle = document.getElementById('showCard');
  const showBadgeToggle = document.getElementById('showBadge');
  const autoScanToggle = document.getElementById('autoScan');
  const scannedEl = document.getElementById('scanned');
  const flaggedEl = document.getElementById('flagged');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  // Load saved settings
  const settings = await chrome.storage.local.get(['showCard', 'showBadge', 'autoScan', 'stats']);

  showCardToggle.checked = settings.showCard !== false;
  showBadgeToggle.checked = settings.showBadge !== false;
  autoScanToggle.checked = settings.autoScan !== false;

  if (settings.stats) {
    scannedEl.textContent = settings.stats.scanned || 0;
    flaggedEl.textContent = settings.stats.flagged || 0;
  }

  // Check API status
  async function checkAPI() {
    try {
      const response = await fetch(`${API_BASE}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        statusDot.classList.remove('offline');
        statusText.textContent = 'ONLINE';
      } else {
        throw new Error('API error');
      }
    } catch (e) {
      statusDot.classList.add('offline');
      statusText.textContent = 'OFFLINE';
    }
  }

  checkAPI();

  // Helper to notify content script
  async function notifyContentScript(changes) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      try {
        chrome.tabs.sendMessage(tab.id, {
          type: 'SETTINGS_CHANGED',
          ...changes
        });
      } catch (e) {
        // Tab might not have content script
      }
    }
  }

  // Save settings on change
  showCardToggle.addEventListener('change', async () => {
    await chrome.storage.local.set({ showCard: showCardToggle.checked });
    notifyContentScript({ showCard: showCardToggle.checked });
  });

  showBadgeToggle.addEventListener('change', async () => {
    await chrome.storage.local.set({ showBadge: showBadgeToggle.checked });
    notifyContentScript({ showBadge: showBadgeToggle.checked });
  });

  autoScanToggle.addEventListener('change', async () => {
    await chrome.storage.local.set({ autoScan: autoScanToggle.checked });
    notifyContentScript({ autoScan: autoScanToggle.checked });
  });

  // Update stats periodically
  setInterval(async () => {
    const { stats } = await chrome.storage.local.get(['stats']);
    if (stats) {
      scannedEl.textContent = stats.scanned || 0;
      flaggedEl.textContent = stats.flagged || 0;
    }
  }, 1000);
});
