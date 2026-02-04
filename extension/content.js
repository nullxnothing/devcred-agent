// DevKarma Extension - Dual Mode Badge Injection
// Mini badge in header (right side) + Full card replacing DA section

const API_BASE = 'https://devkarmaagent-production.up.railway.app';
const SITE_BASE = 'https://devkarma.fun';
const CACHE_TTL = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 100; // Prevent memory leak
const REQUEST_TIMEOUT = 10000; // 10 second timeout

// LRU-style cache with size limit
const scoreCache = new Map();
const injectedWallets = new Set();

function cleanupCache() {
  // Remove oldest entries if cache is too large
  if (scoreCache.size > MAX_CACHE_SIZE) {
    const entriesToDelete = scoreCache.size - MAX_CACHE_SIZE;
    const iterator = scoreCache.keys();
    for (let i = 0; i < entriesToDelete; i++) {
      scoreCache.delete(iterator.next().value);
    }
  }
  // Clear injected wallets periodically to allow re-injection on navigation
  if (injectedWallets.size > MAX_CACHE_SIZE) {
    injectedWallets.clear();
  }
}

let settings = { showCard: true, showBadge: true, enabled: true };

// ============ THEME DETECTION ============
function getAxiomTheme() {
  // Check body/html background color to detect theme
  const bodyBg = getComputedStyle(document.body).backgroundColor;
  const htmlBg = getComputedStyle(document.documentElement).backgroundColor;

  // Parse RGB values
  const parseRgb = (color) => {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
    }
    return null;
  };

  const bg = parseRgb(bodyBg) || parseRgb(htmlBg);
  if (!bg) return 'dark'; // Default to dark

  // Calculate luminance
  const luminance = (0.299 * bg.r + 0.587 * bg.g + 0.114 * bg.b) / 255;

  // Detect specific themes based on color
  if (luminance > 0.7) return 'light';
  if (bg.r < 20 && bg.g < 20 && bg.b < 30) return 'dark'; // Pure dark
  if (bg.r < 30 && bg.g < 25 && bg.b < 40) return 'midnight'; // Bluish dark

  return luminance > 0.5 ? 'light' : 'dark';
}

function getThemeColors() {
  const theme = getAxiomTheme();
  console.log('[DevKarma] Detected theme:', theme);

  if (theme === 'light') {
    return {
      cardBg: 'rgba(255,255,255,0.95)',
      cardBorder: 'rgba(0,0,0,0.1)',
      badgeBg: 'rgba(0,0,0,0.04)',
      badgeBorder: 'rgba(0,0,0,0.1)',
      badgeHoverBg: 'rgba(0,0,0,0.08)',
      badgeHoverBorder: 'rgba(0,0,0,0.15)',
      textPrimary: 'rgba(0,0,0,0.9)',
      textSecondary: 'rgba(0,0,0,0.6)',
      textMuted: 'rgba(0,0,0,0.4)',
      divider: 'rgba(0,0,0,0.08)',
      sectionBg: 'rgba(0,0,0,0.03)',
      btnBg: 'rgba(0,0,0,0.05)',
      btnBorder: 'rgba(0,0,0,0.1)',
      btnText: 'rgba(0,0,0,0.5)',
      scoreBg: 'rgba(255,255,255,0.8)',
    };
  }

  // Dark / Midnight themes
  return {
    cardBg: '#0d0d14',
    cardBorder: 'rgba(255,255,255,0.08)',
    badgeBg: 'rgba(255,255,255,0.03)',
    badgeBorder: 'rgba(255,255,255,0.08)',
    badgeHoverBg: 'rgba(255,255,255,0.06)',
    badgeHoverBorder: 'rgba(255,255,255,0.15)',
    textPrimary: 'rgba(255,255,255,0.9)',
    textSecondary: 'rgba(255,255,255,0.6)',
    textMuted: 'rgba(255,255,255,0.4)',
    divider: 'rgba(255,255,255,0.06)',
    sectionBg: 'rgba(255,255,255,0.02)',
    btnBg: 'rgba(255,255,255,0.06)',
    btnBorder: 'rgba(255,255,255,0.1)',
    btnText: 'rgba(255,255,255,0.5)',
    scoreBg: 'rgba(0,0,0,0.3)',
  };
}

chrome.storage.local.get(['showCard', 'showBadge', 'enabled'], (result) => {
  settings.showCard = result.showCard !== false;
  settings.showBadge = result.showBadge !== false;
  settings.enabled = result.enabled !== false;
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SETTINGS_CHANGED') {
    if (msg.showCard !== undefined) settings.showCard = msg.showCard;
    if (msg.showBadge !== undefined) settings.showBadge = msg.showBadge;
    if (msg.enabled !== undefined) settings.enabled = msg.enabled;
    injectedWallets.clear();
    document.querySelectorAll('.devkarma-card, .devkarma-badge').forEach(el => el.remove());
    // Restore hidden DA sections
    document.querySelectorAll('[data-devkarma-hidden]').forEach(el => {
      el.style.display = '';
      el.removeAttribute('data-devkarma-hidden');
    });
    if (settings.enabled) setTimeout(scan, 100);
  }
});

async function fetchDevScore(wallet) {
  if (!wallet || wallet.length < 32) return null;
  const cached = scoreCache.get(wallet);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const res = await fetch(`${API_BASE}/api/reputation/${wallet}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) return { score: 0, tier: 'unknown' };
    const data = await res.json();
    scoreCache.set(wallet, { data, timestamp: Date.now() });
    cleanupCache(); // Prevent memory leak
    return data;
  } catch (e) {
    console.log('[DevKarma] API error:', e.name === 'AbortError' ? 'Request timeout' : e);
    return { score: 0, tier: 'unknown' };
  }
}

function getTier(score) {
  if (score >= 700) return 'legend';
  if (score >= 600) return 'elite';
  if (score >= 500) return 'rising_star';
  if (score >= 450) return 'proven';
  if (score >= 300) return 'builder';
  if (score >= 150) return 'verified';
  if (score > 0) return 'new';
  return 'unknown';
}

function getTierName(tier) {
  const names = {
    legend: 'Legend', elite: 'Elite', rising_star: 'Rising Star',
    proven: 'Proven', builder: 'Builder', verified: 'Verified',
    new: 'New', unknown: 'Unknown'
  };
  return names[tier] || 'Unknown';
}

function getColor(score) {
  if (score >= 600) return '#22c55e';
  if (score >= 300) return '#eab308';
  if (score >= 150) return '#f97316';
  if (score > 0) return '#ef4444';
  return '#666';
}

// Scrape funding info and token stats from Axiom page
function scrapeAxiomData(devWallet) {
  const data = {
    devAddress: devWallet,
    devAddressShort: devWallet ? `${devWallet.slice(0, 4)}...${devWallet.slice(-4)}` : null,
    fundingWallet: null,
    fundingWalletShort: null,
    fundingAmount: null,
    // Token stats scraped from Axiom's "Token Stats" section
    axiomMigrated: null,
    axiomNonMigrated: null,
    axiomTotalTokens: null
  };

  const allLinks = document.querySelectorAll('a');
  for (const link of allLinks) {
    const href = link.href || '';
    const walletMatch = href.match(/solscan\.io\/account\/([A-HJ-NP-Za-km-z1-9]{32,44})/);
    if (walletMatch && walletMatch[1] !== devWallet) {
      let el = link;
      for (let i = 0; i < 4; i++) {
        el = el?.parentElement;
        if (!el) break;
        const text = el.textContent?.toLowerCase() || '';
        if (text.includes('funded') || text.includes('funder')) {
          data.fundingWallet = walletMatch[1];
          data.fundingWalletShort = `${walletMatch[1].slice(0, 4)}...${walletMatch[1].slice(-4)}`;
          break;
        }
      }
      if (data.fundingWallet) break;
    }
  }

  const allText = document.body.innerText;
  const solAmountMatch = allText.match(/(\d+\.?\d*)\s*SOL/);
  if (solAmountMatch) {
    data.fundingAmount = parseFloat(solAmountMatch[1]).toFixed(3) + ' SOL';
  }

  // Scrape token stats from Axiom's Token Stats section
  // Look for "Migrated: X" and "Non-migrated: Y" patterns
  const migratedMatch = allText.match(/Migrated:\s*(\d+)/i);
  const nonMigratedMatch = allText.match(/Non-migrated:\s*(\d+)/i);

  if (migratedMatch) {
    data.axiomMigrated = parseInt(migratedMatch[1], 10);
  }
  if (nonMigratedMatch) {
    data.axiomNonMigrated = parseInt(nonMigratedMatch[1], 10);
  }
  if (data.axiomMigrated !== null && data.axiomNonMigrated !== null) {
    data.axiomTotalTokens = data.axiomMigrated + data.axiomNonMigrated;
  }

  console.log('[DevKarma] Scraped Axiom data:', data);
  return data;
}

// ============ MINI BADGE (theme-aware) ============
function createMiniBadge(data, wallet, axiomData = null) {
  const theme = getThemeColors();
  const score = Math.round(parseFloat(data?.score) || 0);
  const color = getColor(score);

  // Use Axiom's scraped data as fallback if API returns 0 tokens
  const apiMigrations = data?.migrationCount || 0;
  const apiTokens = data?.tokenCount || 0;
  const migrationCount = (apiMigrations === 0 && axiomData?.axiomMigrated !== null)
    ? axiomData.axiomMigrated
    : apiMigrations;

  const rugCount = data?.rugCount || 0;
  const hasRugs = rugCount > 0;
  const twitterHandle = data?.twitterHandle || null;
  const displayScore = score === 0 ? '—' : score;

  const badge = document.createElement('div');
  badge.className = 'devkarma-badge';
  badge.title = `Click for full DevKarma profile`;
  badge.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 6px 12px;
    background: ${theme.badgeBg};
    border: 1px solid ${theme.badgeBorder};
    border-radius: 6px;
    font-family: -apple-system, sans-serif;
    font-size: 11px;
    color: ${theme.textSecondary};
    cursor: pointer;
    margin-right: 8px;
    flex-shrink: 0;
    transition: all 0.15s ease;
  `;

  badge.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;">
      <span style="color:${theme.textMuted};font-size:10px;text-transform:uppercase;">Score</span>
      <span style="color:${color};font-weight:700;font-size:13px;font-variant-numeric:tabular-nums;">${displayScore}</span>
    </div>
    <div style="width:1px;height:16px;background:${theme.divider};"></div>
    <div style="display:flex;align-items:center;gap:6px;">
      <span style="color:${theme.textMuted};font-size:10px;text-transform:uppercase;">Migrations</span>
      <span style="color:#22c55e;font-weight:600;">${migrationCount}</span>
    </div>
    ${hasRugs ? `
    <div style="width:1px;height:16px;background:${theme.divider};"></div>
    <div style="display:flex;align-items:center;gap:4px;">
      <span style="color:#ef4444;font-weight:600;">${rugCount} RUG${rugCount > 1 ? 'S' : ''}</span>
    </div>
    ` : ''}
    ${twitterHandle ? `
    <div style="width:1px;height:16px;background:${theme.divider};"></div>
    <div style="display:flex;align-items:center;gap:4px;">
      <span style="color:${theme.textSecondary};">@${twitterHandle}</span>
    </div>
    ` : ''}
  `;

  badge.onmouseenter = () => {
    badge.style.background = theme.badgeHoverBg;
    badge.style.borderColor = theme.badgeHoverBorder;
  };
  badge.onmouseleave = () => {
    badge.style.background = theme.badgeBg;
    badge.style.borderColor = theme.badgeBorder;
  };
  badge.onclick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    window.open(`${SITE_BASE}/profile/${wallet}`, '_blank');
  };

  return badge;
}

// ============ FULL CARD (theme-aware) ============
function createFullCard(data, wallet, axiomData, isLoading = false) {
  const theme = getThemeColors();
  const card = document.createElement('div');
  card.className = 'devkarma-card';

  const logoUrl = chrome.runtime.getURL('icons/icon32.png');

  if (isLoading) {
    card.style.cssText = `
      background: ${theme.cardBg};
      border: 1px solid ${theme.cardBorder};
      border-radius: 8px;
      padding: 14px 16px;
      font-family: -apple-system, sans-serif;
    `;
    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <img src="${logoUrl}" style="width:24px;height:24px;border-radius:4px;" />
        <span style="color:${theme.textPrimary};font-weight:600;font-size:14px;">DevKarma</span>
        <span style="color:${theme.textMuted};font-size:12px;">Loading...</span>
      </div>
    `;
    return card;
  }

  const score = Math.round(parseFloat(data?.score) || 0);
  const tier = data?.tier || getTier(score);
  const tierName = getTierName(tier);
  const color = getColor(score);

  // Use Axiom's scraped data as fallback if API returns 0 tokens
  const apiTokens = data?.tokenCount || 0;
  const apiMigrations = data?.migrationCount || 0;
  const tokenCount = (apiTokens === 0 && axiomData?.axiomTotalTokens !== null)
    ? axiomData.axiomTotalTokens
    : apiTokens;
  const migrationCount = (apiMigrations === 0 && axiomData?.axiomMigrated !== null)
    ? axiomData.axiomMigrated
    : apiMigrations;

  const rugCount = data?.rugCount || 0;
  const hasRugs = rugCount > 0;
  const migrationRate = tokenCount > 0 ? Math.round((migrationCount / tokenCount) * 100) : 0;
  const twitterHandle = data?.twitterHandle || null;
  const isBased = score >= 600;

  const devAddress = axiomData?.devAddress || wallet;
  const devAddressShort = axiomData?.devAddressShort || `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  const fundingWallet = axiomData?.fundingWallet;
  const fundingWalletShort = axiomData?.fundingWalletShort;
  const fundingAmount = axiomData?.fundingAmount;

  let status = '';
  let statusColor = theme.textMuted;
  if (hasRugs) {
    status = `⚠️ ${rugCount} rug${rugCount > 1 ? 's' : ''} detected`;
    statusColor = '#ef4444';
  } else if (migrationCount >= 3) {
    status = '✓ Proven track record';
    statusColor = '#22c55e';
  } else if (migrationCount >= 1) {
    status = '✓ Has migrated token';
    statusColor = '#22c55e';
  } else if (tokenCount > 0) {
    status = 'Building history';
  } else {
    status = 'New developer';
  }

  // Based dev gets special green tint
  const basedBg = getAxiomTheme() === 'light'
    ? 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0.04) 100%)'
    : 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(46,74,59,0.12) 100%)';
  const basedBorder = 'rgba(34,197,94,0.2)';

  card.style.cssText = `
    background: ${isBased ? basedBg : theme.cardBg};
    border: 1px solid ${isBased ? basedBorder : theme.cardBorder};
    border-radius: 8px;
    padding: 14px 16px;
    font-family: -apple-system, sans-serif;
  `;

  card.innerHTML = `
    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid ${theme.divider};">
      <div style="display:flex;align-items:center;gap:8px;">
        <img src="${logoUrl}" style="width:20px;height:20px;border-radius:3px;" />
        <span style="color:${theme.textPrimary};font-weight:600;font-size:13px;">DevKarma</span>
        ${isBased ? '<span style="color:#22c55e;font-size:11px;">⚡ BASED DEV</span>' : ''}
      </div>
      ${!isBased ? `<span style="color:${theme.textMuted};font-size:10px;">Developer Reputation</span>` : ''}
    </div>

    <!-- Wallet Info -->
    <div style="margin-bottom:12px;padding:10px;background:${theme.sectionBg};border-radius:6px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${fundingWallet ? '8px' : '0'};">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="color:${theme.textMuted};font-size:11px;min-width:24px;">DA:</span>
          <span style="color:${theme.textSecondary};font-size:12px;font-family:monospace;">${devAddressShort}</span>
        </div>
        <button class="copy-btn" data-wallet="${devAddress}" style="padding:3px 8px;background:${theme.btnBg};border:1px solid ${theme.btnBorder};border-radius:4px;color:${theme.btnText};font-size:10px;cursor:pointer;">Copy</button>
      </div>
      ${fundingWallet ? `
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="color:${theme.textMuted};font-size:11px;min-width:24px;">Via:</span>
          <span style="color:${theme.textSecondary};font-size:12px;font-family:monospace;">${fundingWalletShort}</span>
          ${fundingAmount ? `<span style="color:${theme.textMuted};font-size:11px;">${fundingAmount}</span>` : ''}
        </div>
        <button class="copy-btn" data-wallet="${fundingWallet}" style="padding:3px 8px;background:${theme.btnBg};border:1px solid ${theme.btnBorder};border-radius:4px;color:${theme.btnText};font-size:10px;cursor:pointer;">Copy</button>
      </div>
      ` : ''}
    </div>

    <!-- Score + Stats -->
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px;">
      <!-- Score -->
      <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;">
        <span style="font-size:28px;font-weight:700;color:${color};line-height:1;font-variant-numeric:tabular-nums;">${score || '—'}</span>
        <span style="font-size:9px;color:${theme.textMuted};text-transform:uppercase;letter-spacing:0.5px;">score</span>
      </div>

      <div style="width:1px;height:36px;background:${theme.divider};"></div>

      <!-- Stats -->
      <div style="flex:1;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
          ${twitterHandle
            ? `<a href="https://x.com/${twitterHandle}" target="_blank" style="font-size:11px;padding:2px 8px;background:${color};color:white;font-weight:600;border-radius:3px;text-decoration:none;transition:opacity 0.15s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">@${twitterHandle}</a>`
            : `<span style="font-size:11px;padding:2px 8px;background:${theme.textMuted};color:white;font-weight:600;border-radius:3px;">Unclaimed</span>`
          }
        </div>
        <div style="display:flex;gap:14px;font-size:11px;color:${theme.textSecondary};">
          <span><strong style="color:${theme.textPrimary};">${tokenCount}</strong> tokens</span>
          <span><strong style="color:#22c55e;">${migrationCount}</strong> migrated</span>
          <span><strong style="color:${theme.textPrimary};">${migrationRate}%</strong> rate</span>
          ${hasRugs ? `<span><strong style="color:#ef4444;">${rugCount}</strong> rugs</span>` : ''}
        </div>
      </div>
    </div>

    <!-- Status + Link -->
    <div style="display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid ${theme.divider};">
      <span style="font-size:11px;color:${statusColor};">${status}</span>
      <span class="profile-link" style="color:${theme.textSecondary};font-size:11px;cursor:pointer;transition:color 0.15s;">View full profile →</span>
    </div>
  `;

  // Event handlers
  card.querySelectorAll('.copy-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(btn.dataset.wallet);
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy', 1500);
    };
  });

  const profileLink = card.querySelector('.profile-link');
  profileLink.onclick = (e) => {
    e.stopPropagation();
    window.open(`${SITE_BASE}/profile/${wallet}`, '_blank');
  };
  profileLink.onmouseenter = (e) => e.target.style.color = '#22c55e';
  profileLink.onmouseleave = (e) => e.target.style.color = theme.textSecondary;

  return card;
}

// ============ INJECTION LOGIC ============
async function injectElements() {
  if (!settings.enabled) return;

  const twitterLinks = document.querySelectorAll('a[href*="x.com/search"]');
  let wallet = null;
  let daSection = null;

  for (const link of twitterLinks) {
    const match = link.href.match(/[?&]q=([A-HJ-NP-Za-km-z1-9]{32,44})/);
    if (!match) continue;
    wallet = match[1];

    let parent = link.parentElement;
    for (let i = 0; i < 8; i++) {
      if (!parent) break;
      if ((parent.textContent || '').includes('DA:')) {
        daSection = parent;
        break;
      }
      parent = parent.parentElement;
    }
    if (daSection) break;
  }

  if (!wallet) {
    console.log('[DevKarma] No wallet found');
    return;
  }

  if (injectedWallets.has(wallet)) return;

  console.log('[DevKarma] Found wallet:', wallet);
  injectedWallets.add(wallet);

  // Scrape Axiom data
  const axiomData = scrapeAxiomData(wallet);

  // Fetch API data
  const data = await fetchDevScore(wallet);
  console.log('[DevKarma] Got data:', data);

  // Update stats
  const stats = await chrome.storage.local.get(['stats']) || {};
  const currentStats = stats.stats || { scanned: 0, flagged: 0 };
  currentStats.scanned++;
  if ((data?.rugCount || 0) > 0) currentStats.flagged++;
  chrome.storage.local.set({ stats: currentStats });

  // INJECT MINI BADGE on RIGHT side of header
  if (settings.showBadge) {
    const headerBar = document.querySelector('.flex.max-h-\\[64px\\].min-h-\\[64px\\]');
    if (headerBar && !headerBar.querySelector('.devkarma-badge')) {
      const badge = createMiniBadge(data, wallet, axiomData);
      const rightContainer = headerBar.querySelector('.flex.flex-1.flex-row.items-center.justify-end');
      if (rightContainer) {
        rightContainer.parentElement.insertBefore(badge, rightContainer);
      } else {
        headerBar.appendChild(badge);
      }
      console.log('[DevKarma] Mini badge injected on right');
    }
  }

  // INJECT FULL CARD replacing DA section
  if (settings.showCard && daSection) {
    // Find the section container
    let section = daSection;
    for (let i = 0; i < 5; i++) {
      section = section.parentElement;
      if (!section) break;
      const rect = section.getBoundingClientRect();
      if (rect.height > 50 && rect.height < 300) break;
    }

    if (section && !document.querySelector('.devkarma-card')) {
      // Hide original DA section
      section.style.display = 'none';
      section.setAttribute('data-devkarma-hidden', 'true');

      // Insert card before hidden section
      const card = createFullCard(data, wallet, axiomData);
      section.insertAdjacentElement('beforebegin', card);
      console.log('[DevKarma] Full card injected (replaced DA)');
    }
  }
}

function scan() {
  if (!settings.enabled) return;
  console.log('[DevKarma] Scanning...');
  injectElements().catch(e => console.error('[DevKarma] Error:', e));
}

console.log('[DevKarma] Extension loaded');
setTimeout(scan, 1500);
setTimeout(scan, 3000);

const observer = new MutationObserver(() => {
  clearTimeout(window.devkarmaScanTimeout);
  window.devkarmaScanTimeout = setTimeout(scan, 500);
});
observer.observe(document.body, { childList: true, subtree: true });
