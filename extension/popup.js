// DevCred Popup Script

const API_BASE = 'https://devkarmaagent-production.up.railway.app';

document.addEventListener('DOMContentLoaded', async () => {
  const enabledToggle = document.getElementById('enabled');
  const autoScanToggle = document.getElementById('autoScan');
  const scannedEl = document.getElementById('scanned');
  const flaggedEl = document.getElementById('flagged');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  // Load saved settings
  const settings = await chrome.storage.local.get(['enabled', 'autoScan', 'stats']);

  enabledToggle.checked = settings.enabled !== false;
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
        statusText.textContent = 'Connected';
      } else {
        throw new Error('API error');
      }
    } catch (e) {
      statusDot.classList.add('offline');
      statusText.textContent = 'Offline';
    }
  }

  checkAPI();

  // Save settings on change
  enabledToggle.addEventListener('change', async () => {
    await chrome.storage.local.set({ enabled: enabledToggle.checked });

    // Notify content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      try {
        chrome.tabs.sendMessage(tab.id, {
          type: 'SETTINGS_CHANGED',
          enabled: enabledToggle.checked
        });
      } catch (e) {
        // Tab might not have content script
      }
    }
  });

  autoScanToggle.addEventListener('change', async () => {
    await chrome.storage.local.set({ autoScan: autoScanToggle.checked });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      try {
        chrome.tabs.sendMessage(tab.id, {
          type: 'SETTINGS_CHANGED',
          autoScan: autoScanToggle.checked
        });
      } catch (e) {
        // Tab might not have content script
      }
    }
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
