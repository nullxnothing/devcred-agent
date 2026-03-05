// Blacklist Extension - Dual Mode Badge Injection
// Mini badge in header (right side) + Full card replacing DA section

const API_BASE = 'https://devkarmaagent-production.up.railway.app';
const SITE_BASE = 'https://devkarma.fun';
const CACHE_TTL = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 100;
const REQUEST_TIMEOUT = 10000;

// LRU-style cache with size limit
const scoreCache = new Map();
const injectedWallets = new Set();

function cleanupCache() {
  if (scoreCache.size > MAX_CACHE_SIZE) {
    const entriesToDelete = scoreCache.size - MAX_CACHE_SIZE;
    const iterator = scoreCache.keys();
    for (let i = 0; i < entriesToDelete; i++) {
      scoreCache.delete(iterator.next().value);
    }
  }
  if (injectedWallets.size > MAX_CACHE_SIZE) {
    injectedWallets.clear();
  }
}

let settings = { showCard: true, showBadge: true, enabled: true };

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
    document.querySelectorAll('.blacklist-card, .blacklist-badge').forEach(el => el.remove());
    document.querySelectorAll('[data-blacklist-hidden]').forEach(el => {
      el.style.display = '';
      el.removeAttribute('data-blacklist-hidden');
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
    cleanupCache();
    return data;
  } catch (e) {
    console.log('[Blacklist] API error:', e.name === 'AbortError' ? 'Request timeout' : e);
    return { score: 0, tier: 'unknown' };
  }
}

function getTier(score) {
  if (score >= 700) return 'sovereign';
  if (score >= 600) return 'cleared';
  if (score >= 500) return 'operative';
  if (score >= 450) return 'vetted';
  if (score >= 300) return 'tracked';
  if (score >= 150) return 'filed';
  if (score > 0) return 'flagged';
  return 'ghost';
}

function getTierName(tier) {
  const names = {
    sovereign: 'SOVEREIGN', cleared: 'CLEARED', operative: 'OPERATIVE',
    vetted: 'VETTED', tracked: 'TRACKED', filed: 'FILED',
    flagged: 'FLAGGED', ghost: 'GHOST'
  };
  return names[tier] || 'GHOST';
}

// Monochrome intensity based on tier — white brightness levels + red for flagged
function getTierColor(score) {
  if (score >= 700) return '#ffffff';
  if (score >= 600) return '#e5e5e5';
  if (score >= 500) return '#cccccc';
  if (score >= 450) return '#b3b3b3';
  if (score >= 300) return '#999999';
  if (score >= 150) return '#737373';
  if (score > 0) return '#ff0000';
  return '#4d4d4d';
}

function getTierBorderStyle(tier) {
  switch (tier) {
    case 'sovereign': return '2px double #ffffff';
    case 'cleared': return '2px solid #e5e5e5';
    case 'operative': return '1px solid #cccccc';
    case 'vetted': return '1px solid #666666';
    case 'tracked': return '1px dashed #999999';
    case 'filed': return '1px dotted #737373';
    case 'flagged': return '1px solid #ff0000';
    default: return '1px solid #333333';
  }
}

// Scrape funding info and token stats from Axiom page
function scrapeAxiomData(devWallet) {
  const data = {
    devAddress: devWallet,
    devAddressShort: devWallet ? `${devWallet.slice(0, 4)}...${devWallet.slice(-4)}` : null,
    fundingWallet: null,
    fundingWalletShort: null,
    fundingAmount: null,
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

  console.log('[Blacklist] Scraped Axiom data:', data);
  return data;
}

// ============ MINI BADGE (monochrome terminal) ============
function createMiniBadge(data, wallet, axiomData = null) {
  const score = Math.round(parseFloat(data?.score) || 0);
  const tier = data?.tier || getTier(score);
  const tierName = getTierName(tier);
  const tierColor = getTierColor(score);
  const borderStyle = getTierBorderStyle(tier);

  const apiMigrations = data?.migrationCount || 0;
  const migrationCount = (apiMigrations === 0 && axiomData?.axiomMigrated !== null)
    ? axiomData.axiomMigrated
    : apiMigrations;

  const rugCount = data?.rugCount || 0;
  const hasRugs = rugCount > 0;
  const displayScore = score === 0 ? '—' : score;

  const badge = document.createElement('div');
  badge.className = 'blacklist-badge';
  badge.title = `[BLACKLIST] ${tierName} — Click for dossier`;
  badge.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 5px 10px;
    background: #000000;
    border: ${borderStyle};
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    font-size: 10px;
    color: #999999;
    cursor: pointer;
    margin-right: 8px;
    flex-shrink: 0;
    transition: all 0.15s ease;
    ${tier === 'flagged' ? 'animation: flagged-pulse 2s ease-in-out infinite;' : ''}
  `;

  badge.innerHTML = `
    <span style="color:#666666;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;">[${tierName}]</span>
    <span style="color:${tierColor};font-weight:700;font-size:12px;font-variant-numeric:tabular-nums;">${displayScore}</span>
    <span style="width:1px;height:14px;background:#333333;display:inline-block;"></span>
    <span style="color:#999999;font-size:9px;">M:${migrationCount}</span>
    ${hasRugs ? `<span style="color:#ff0000;font-weight:700;font-size:9px;">R:${rugCount}</span>` : ''}
  `;

  badge.onmouseenter = () => {
    badge.style.background = '#0a0a0a';
    badge.style.borderColor = '#ffffff';
  };
  badge.onmouseleave = () => {
    badge.style.background = '#000000';
    badge.style.border = borderStyle;
  };
  badge.onclick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    window.open(`${SITE_BASE}/profile/${wallet}`, '_blank');
  };

  return badge;
}

// ============ FULL CARD (monochrome terminal) ============
function createFullCard(data, wallet, axiomData, isLoading = false) {
  const card = document.createElement('div');
  card.className = 'blacklist-card';

  if (isLoading) {
    card.style.cssText = `
      background: #000000;
      border: 1px solid #333333;
      padding: 14px 16px;
      font-family: 'JetBrains Mono', 'Courier New', monospace;
    `;
    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="color:#ffffff;font-weight:700;font-size:12px;">[BLACKLIST]</span>
        <span style="color:#666666;font-size:11px;animation:cursor-blink 1s step-end infinite;">SCANNING_</span>
      </div>
    `;
    return card;
  }

  const score = Math.round(parseFloat(data?.score) || 0);
  const tier = data?.tier || getTier(score);
  const tierName = getTierName(tier);
  const tierColor = getTierColor(score);
  const borderStyle = getTierBorderStyle(tier);

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

  const devAddress = axiomData?.devAddress || wallet;
  const devAddressShort = axiomData?.devAddressShort || `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  const fundingWallet = axiomData?.fundingWallet;
  const fundingWalletShort = axiomData?.fundingWalletShort;
  const fundingAmount = axiomData?.fundingAmount;

  let status = '';
  let statusColor = '#666666';
  if (hasRugs) {
    status = `> WARNING: ${rugCount} RUG${rugCount > 1 ? 'S' : ''} DETECTED`;
    statusColor = '#ff0000';
  } else if (migrationCount >= 3) {
    status = '> VERIFIED TRACK RECORD';
    statusColor = '#ffffff';
  } else if (migrationCount >= 1) {
    status = '> HAS MIGRATED TOKEN';
    statusColor = '#e5e5e5';
  } else if (tokenCount > 0) {
    status = '> BUILDING HISTORY';
    statusColor = '#999999';
  } else {
    status = '> NEW SUBJECT';
    statusColor = '#666666';
  }

  card.style.cssText = `
    background: #000000;
    border: ${borderStyle};
    padding: 14px 16px;
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    ${tier === 'sovereign' ? 'box-shadow: 0 0 15px rgba(255,255,255,0.1);' : ''}
    ${tier === 'flagged' ? 'box-shadow: 0 0 15px rgba(255,0,0,0.15);' : ''}
  `;

  card.innerHTML = `
    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #333333;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="color:#ffffff;font-weight:700;font-size:12px;">[BLACKLIST]</span>
        <span style="color:${tierColor};font-size:10px;font-weight:700;">${tierName}</span>
      </div>
      <span style="color:#666666;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;">SUBJECT DOSSIER</span>
    </div>

    <!-- Wallet Info -->
    <div style="margin-bottom:12px;padding:10px;background:#0a0a0a;border:1px solid #333333;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${fundingWallet ? '8px' : '0'};">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="color:#666666;font-size:10px;min-width:24px;">DA:</span>
          <span style="color:#999999;font-size:11px;font-family:monospace;">${devAddressShort}</span>
        </div>
        <button class="copy-btn" data-wallet="${devAddress}" style="padding:2px 6px;background:#000000;border:1px solid #333333;color:#666666;font-size:9px;cursor:pointer;font-family:monospace;">[ COPY ]</button>
      </div>
      ${fundingWallet ? `
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="color:#666666;font-size:10px;min-width:24px;">VIA:</span>
          <span style="color:#999999;font-size:11px;font-family:monospace;">${fundingWalletShort}</span>
          ${fundingAmount ? `<span style="color:#666666;font-size:10px;">${fundingAmount}</span>` : ''}
        </div>
        <button class="copy-btn" data-wallet="${fundingWallet}" style="padding:2px 6px;background:#000000;border:1px solid #333333;color:#666666;font-size:9px;cursor:pointer;font-family:monospace;">[ COPY ]</button>
      </div>
      ` : ''}
    </div>

    <!-- Score + Stats -->
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px;">
      <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;">
        <span style="font-size:26px;font-weight:700;color:${tierColor};line-height:1;font-variant-numeric:tabular-nums;">${score || '—'}</span>
        <span style="font-size:8px;color:#666666;text-transform:uppercase;letter-spacing:0.15em;">SCORE</span>
      </div>

      <div style="width:1px;height:36px;background:#333333;"></div>

      <div style="flex:1;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
          ${twitterHandle
            ? `<a href="https://x.com/${twitterHandle}" target="_blank" style="font-size:10px;padding:2px 6px;border:1px solid #666666;color:#999999;font-weight:700;text-decoration:none;font-family:monospace;transition:color 0.15s;" onmouseover="this.style.color='#ffffff'" onmouseout="this.style.color='#999999'">@${twitterHandle}</a>`
            : `<span style="font-size:10px;padding:2px 6px;border:1px solid #333333;color:#666666;font-weight:700;">UNCLAIMED</span>`
          }
        </div>
        <div style="display:flex;gap:12px;font-size:10px;color:#999999;">
          <span><strong style="color:${tierColor};">${tokenCount}</strong> tokens</span>
          <span><strong style="color:${tierColor};">${migrationCount}</strong> migrated</span>
          <span><strong style="color:${tierColor};">${migrationRate}%</strong> rate</span>
          ${hasRugs ? `<span><strong style="color:#ff0000;">${rugCount}</strong> rugs</span>` : ''}
        </div>
      </div>
    </div>

    <!-- Status + Link -->
    <div style="display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid #333333;">
      <span style="font-size:10px;color:${statusColor};">${status}</span>
      <span class="profile-link" style="color:#666666;font-size:10px;cursor:pointer;transition:color 0.15s;font-weight:700;">VIEW DOSSIER ></span>
    </div>
  `;

  // Event handlers
  card.querySelectorAll('.copy-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(btn.dataset.wallet);
      btn.textContent = '[ OK ]';
      setTimeout(() => btn.textContent = '[ COPY ]', 1500);
    };
  });

  const profileLink = card.querySelector('.profile-link');
  profileLink.onclick = (e) => {
    e.stopPropagation();
    window.open(`${SITE_BASE}/profile/${wallet}`, '_blank');
  };
  profileLink.onmouseenter = (e) => e.target.style.color = '#ffffff';
  profileLink.onmouseleave = (e) => e.target.style.color = '#666666';

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
    console.log('[Blacklist] No wallet found');
    return;
  }

  if (injectedWallets.has(wallet)) return;

  console.log('[Blacklist] Found wallet:', wallet);
  injectedWallets.add(wallet);

  const axiomData = scrapeAxiomData(wallet);
  const data = await fetchDevScore(wallet);
  console.log('[Blacklist] Got data:', data);

  // Update stats
  const stats = await chrome.storage.local.get(['stats']) || {};
  const currentStats = stats.stats || { scanned: 0, flagged: 0 };
  currentStats.scanned++;
  if ((data?.rugCount || 0) > 0) currentStats.flagged++;
  chrome.storage.local.set({ stats: currentStats });

  // INJECT MINI BADGE on RIGHT side of header
  if (settings.showBadge) {
    const headerBar = document.querySelector('.flex.max-h-\\[64px\\].min-h-\\[64px\\]');
    if (headerBar && !headerBar.querySelector('.blacklist-badge')) {
      const badge = createMiniBadge(data, wallet, axiomData);
      const rightContainer = headerBar.querySelector('.flex.flex-1.flex-row.items-center.justify-end');
      if (rightContainer) {
        rightContainer.parentElement.insertBefore(badge, rightContainer);
      } else {
        headerBar.appendChild(badge);
      }
      console.log('[Blacklist] Mini badge injected');
    }
  }

  // INJECT FULL CARD replacing DA section
  if (settings.showCard && daSection) {
    let section = daSection;
    for (let i = 0; i < 5; i++) {
      section = section.parentElement;
      if (!section) break;
      const rect = section.getBoundingClientRect();
      if (rect.height > 50 && rect.height < 300) break;
    }

    if (section && !document.querySelector('.blacklist-card')) {
      section.style.display = 'none';
      section.setAttribute('data-blacklist-hidden', 'true');

      const card = createFullCard(data, wallet, axiomData);
      section.insertAdjacentElement('beforebegin', card);
      console.log('[Blacklist] Full card injected');
    }
  }
}

function scan() {
  if (!settings.enabled) return;
  console.log('[Blacklist] Scanning...');
  injectElements().catch(e => console.error('[Blacklist] Error:', e));
}

console.log('[Blacklist] Extension loaded');
setTimeout(scan, 1500);
setTimeout(scan, 3000);

const observer = new MutationObserver(() => {
  clearTimeout(window.blacklistScanTimeout);
  window.blacklistScanTimeout = setTimeout(scan, 500);
});
observer.observe(document.body, { childList: true, subtree: true });
