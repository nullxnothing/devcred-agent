// DevCred Extension - Axiom Integration

const API_BASE = 'https://devkarmaagent-production.up.railway.app';
const CACHE_TTL = 5 * 60 * 1000;
const scoreCache = new Map();

async function fetchDevScore(wallet) {
  if (!wallet || wallet.length < 32) return null;
  const cached = scoreCache.get(wallet);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;

  try {
    const res = await fetch(`${API_BASE}/api/reputation/${wallet}`);
    if (!res.ok) return { score: 0, tier: 'unknown' };
    const data = await res.json();
    scoreCache.set(wallet, { data, timestamp: Date.now() });
    return data;
  } catch (e) {
    return { score: 0, tier: 'unknown' };
  }
}

function getColor(data) {
  const score = parseFloat(data?.score) || 0;
  if (!data || score === 0) return '#666';
  if (data.tier === 'penalized' || score < 150) return '#ef4444';
  if (score >= 600) return '#22c55e';
  if (score >= 300) return '#eab308';
  return '#f97316';
}

function createBadge(data, wallet) {
  const color = getColor(data);
  const score = Math.round(parseFloat(data?.score) || 0);
  const display = score === 0 ? 'NEW' : score;

  const badge = document.createElement('span');
  badge.className = 'devcred-badge';
  badge.innerHTML = `<span class="devcred-light" style="background:${color};box-shadow:0 0 4px ${color}"></span><span class="devcred-score">${display}</span>`;
  badge.title = `DevCred: ${score}/740\nClick for profile`;
  badge.style.cssText = 'cursor:pointer;margin-left:6px;vertical-align:middle;display:inline-flex;align-items:center;';
  badge.onclick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    window.open(`https://devcred.fun/profile/${wallet}`, '_blank');
  };
  return badge;
}

// Scrape all data from Axiom's page including dev address, funding info, and token stats
function scrapeAxiomData(devWallet) {
  const data = {
    devAddress: devWallet,
    devAddressShort: devWallet ? `${devWallet.slice(0, 4)}...${devWallet.slice(-4)}` : null,
    fundingWallet: null,
    fundingWalletShort: null,
    fundingAmount: null,
    timeAgo: null,
    migrated: null,
    nonMigrated: null,
    topMcap: null
  };

  // Find all links and text on page
  const allText = document.body.innerText;

  // Find funding wallet - look for wallet addresses that appear after funding-related text
  // Axiom shows "Funded via" section with wallet and SOL amount
  const allLinks = document.querySelectorAll('a');
  for (const link of allLinks) {
    const href = link.href || '';
    // Look for solscan wallet links near funding text
    const walletMatch = href.match(/solscan\.io\/account\/([A-HJ-NP-Za-km-z1-9]{32,44})/);
    if (walletMatch && walletMatch[1] !== devWallet) {
      // Check if parent/grandparent contains funding text
      let el = link;
      for (let i = 0; i < 4; i++) {
        el = el?.parentElement;
        if (!el) break;
        const text = el.textContent?.toLowerCase() || '';
        if (text.includes('funded') || text.includes('funder')) {
          data.fundingWallet = walletMatch[1];
          data.fundingWalletShort = `${walletMatch[1].slice(0, 4)}...${walletMatch[1].slice(-4)}`;
          console.log('[DevCred] Found funding wallet:', data.fundingWalletShort);
          break;
        }
      }
      if (data.fundingWallet) break;
    }
  }

  // Find SOL amount - look for patterns like "0.123 SOL" near the DA section
  const solAmountMatch = allText.match(/(\d+\.?\d*)\s*SOL/);
  if (solAmountMatch) {
    data.fundingAmount = parseFloat(solAmountMatch[1]).toFixed(3) + ' SOL';
    console.log('[DevCred] Found funding amount:', data.fundingAmount);
  }

  // Find time ago
  const timeMatch = allText.match(/(\d+[smhd])\s*ago/i);
  if (timeMatch) {
    data.timeAgo = timeMatch[1] + ' ago';
  }

  // Scrape token stats - Method 1: Look for specific elements
  const allSpans = document.querySelectorAll('span');
  for (const span of allSpans) {
    const text = span.textContent?.trim() || '';

    if (text === 'Migrated:') {
      const parent = span.parentElement;
      if (parent) {
        const valueSpan = parent.querySelector('span:last-child');
        if (valueSpan && valueSpan !== span) {
          const val = parseInt(valueSpan.textContent?.trim(), 10);
          if (!isNaN(val)) {
            data.migrated = val;
            console.log('[DevCred] Found Migrated:', val);
          }
        }
      }
    }

    if (text === 'Non-migrated:') {
      const parent = span.parentElement;
      if (parent) {
        const valueSpan = parent.querySelector('span:last-child');
        if (valueSpan && valueSpan !== span) {
          const val = parseInt(valueSpan.textContent?.trim(), 10);
          if (!isNaN(val)) {
            data.nonMigrated = val;
            console.log('[DevCred] Found Non-migrated:', val);
          }
        }
      }
    }
  }

  // Method 2: Fallback to regex
  if (data.migrated === null || data.nonMigrated === null) {
    const migratedMatch = allText.match(/Migrated:\s*(\d+)/);
    const nonMigratedMatch = allText.match(/Non-migrated:\s*(\d+)/);

    if (migratedMatch && data.migrated === null) {
      data.migrated = parseInt(migratedMatch[1], 10);
    }
    if (nonMigratedMatch && data.nonMigrated === null) {
      data.nonMigrated = parseInt(nonMigratedMatch[1], 10);
    }
  }

  // Method 3: Look for Token Stats container
  if (data.migrated === null || data.nonMigrated === null) {
    const tokenStatsHeader = Array.from(document.querySelectorAll('h4')).find(h =>
      h.textContent?.includes('Token Stats')
    );
    if (tokenStatsHeader) {
      const container = tokenStatsHeader.parentElement;
      if (container) {
        const text = container.innerText;
        const migratedMatch = text.match(/Migrated:\s*(\d+)/);
        const nonMigratedMatch = text.match(/Non-migrated:\s*(\d+)/);
        if (migratedMatch) data.migrated = parseInt(migratedMatch[1], 10);
        if (nonMigratedMatch) data.nonMigrated = parseInt(nonMigratedMatch[1], 10);
      }
    }
  }

  // Find Top MCAP
  const mcapMatch = allText.match(/Top MCAP:.*?\(\s*\$([0-9,.]+[KMB]?)\s*\)/i) ||
                    allText.match(/Top MCAP:.*?\$([0-9,.]+[KMB]?)/i);
  if (mcapMatch) {
    let mcap = mcapMatch[1].replace(/,/g, '');
    if (mcap.endsWith('K')) mcap = parseFloat(mcap) * 1000;
    else if (mcap.endsWith('M')) mcap = parseFloat(mcap) * 1000000;
    else if (mcap.endsWith('B')) mcap = parseFloat(mcap) * 1000000000;
    else mcap = parseFloat(mcap);
    data.topMcap = mcap;
  }

  console.log('[DevCred] Scraped Axiom data:', data);
  return data;
}

// Legacy wrapper for backwards compatibility
function scrapeAxiomStats() {
  const data = scrapeAxiomData(null);
  return { migrated: data.migrated, nonMigrated: data.nonMigrated, topMcap: data.topMcap };
}

// Send scraped data to our API to update the database
async function updateBackendWithScrapedData(wallet, axiomStats) {
  if (!axiomStats || axiomStats.migrated === null) return;

  try {
    const payload = {
      wallet,
      tokenCount: (axiomStats.migrated || 0) + (axiomStats.nonMigrated || 0),
      migrationCount: axiomStats.migrated || 0,
      topMcap: axiomStats.topMcap || 0,
      source: 'axiom_scrape'
    };

    console.log('[DevCred] Updating backend with scraped data:', payload);

    const res = await fetch(`${API_BASE}/api/reputation/${wallet}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      console.log('[DevCred] Backend updated successfully');
    } else {
      console.log('[DevCred] Backend update failed:', res.status);
    }
  } catch (e) {
    console.log('[DevCred] Backend update error:', e);
  }
}

// Get tier color from tier name (matches backend getTierInfo)
function getTierColor(tier) {
  const colors = {
    legend: '#FFD700',      // Gold
    elite: '#9B59B6',       // Purple
    rising_star: '#F59E0B', // Amber
    proven: '#22c55e',      // Green
    builder: '#3498DB',     // Blue
    verified: '#eab308',    // Yellow
    penalized: '#ef4444',   // Red
    unverified: '#666',     // Gray
  };
  return colors[tier?.toLowerCase()] || '#666';
}

// TOKEN PAGE: Insert DevCred card ABOVE DA section (replacing it visually)
function scanTokenPage() {
  if (document.querySelector('.devcred-card')) {
    console.log('[DevCred] Card already exists');
    return;
  }

  // Find x.com/search links which contain the dev address
  const twitterLinks = document.querySelectorAll('a[href*="x.com/search"]');
  console.log('[DevCred] Twitter links found:', twitterLinks.length);

  for (const link of twitterLinks) {
    const href = link.href;
    const match = href.match(/[?&]q=([A-HJ-NP-Za-km-z1-9]{32,44})/);
    if (!match) continue;

    const wallet = match[1];
    console.log('[DevCred] Found wallet:', wallet);

    // Check if this link is in a DA row
    let parent = link.parentElement;
    for (let i = 0; i < 6; i++) {
      if (!parent) break;

      const text = parent.textContent || '';
      if (text.includes('DA:')) {
        console.log('[DevCred] Found DA row');

        // Find the container/section that holds the DA info
        let section = parent;
        for (let j = 0; j < 5; j++) {
          section = section.parentElement;
          if (!section) break;
          const rect = section.getBoundingClientRect();
          if (rect.height > 50 && rect.height < 300) {
            break;
          }
        }

        if (section) {
          // Hide the original DA section
          section.style.display = 'none';

          // Create loading card and insert BEFORE the hidden DA section
          const card = createDevCredCard(null, wallet, true, null);
          section.insertAdjacentElement('beforebegin', card);

          // Wait for Axiom's page to fully render token stats
          setTimeout(async () => {
            // Scrape all Axiom data including funding info
            const axiomData = scrapeAxiomData(wallet);

            // Fetch our API data for score and rug count
            const apiData = await fetchDevScore(wallet);

            // Check if we got Axiom stats
            const hasAxiomStats = axiomData.migrated !== null && axiomData.nonMigrated !== null;

            // Merge data
            const mergedData = {
              ...apiData,
              // Axiom page data
              devAddress: axiomData.devAddress,
              devAddressShort: axiomData.devAddressShort,
              fundingWallet: axiomData.fundingWallet,
              fundingWalletShort: axiomData.fundingWalletShort,
              fundingAmount: axiomData.fundingAmount,
              timeAgo: axiomData.timeAgo,
              // Stats
              tokenCount: hasAxiomStats
                ? (axiomData.migrated + axiomData.nonMigrated)
                : (apiData?.tokenCount || 0),
              migrationCount: hasAxiomStats
                ? axiomData.migrated
                : (apiData?.migrationCount || 0),
              topMcap: axiomData.topMcap || null,
              rugCount: apiData?.rugCount || 0,
              // Score from API
              score: parseFloat(apiData?.score) || 0,
              tierName: apiData?.tierName || 'Unknown',
              tierColor: getTierColor(apiData?.tier || 'unknown'),
            };

            // Sync to backend if we have fresh Axiom data
            if (hasAxiomStats) {
              updateBackendWithScrapedData(wallet, axiomData);
            }

            const realCard = createDevCredCard(mergedData, wallet, false, axiomData);
            card.replaceWith(realCard);
            console.log('[DevCred] Card injected!', mergedData);
          }, 1000);

          return;
        }
      }
      parent = parent.parentElement;
    }
  }

  console.log('[DevCred] Could not find DA section');
}

// Copy text to clipboard and show feedback
function copyToClipboard(text, button) {
  navigator.clipboard.writeText(text).then(() => {
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    button.classList.add('copied');
    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove('copied');
    }, 1500);
  });
}

// Create the DevCred info card (replaces Axiom's DA section)
function createDevCredCard(data, wallet, isLoading, axiomData) {
  const card = document.createElement('div');
  card.className = 'devcred-card';

  if (isLoading) {
    card.innerHTML = `
      <div class="devcred-card-header">
        <span class="devcred-card-logo">DevCred</span>
        <span class="devcred-card-subtitle">Developer Reputation</span>
      </div>
      <div class="devcred-card-body devcred-card-loading">
        <span class="devcred-spinner"></span>
        <span>Analyzing developer...</span>
      </div>
    `;
    return card;
  }

  const color = data?.tierColor || getColor(data);
  const score = Math.round(parseFloat(data?.score) || 0);
  const tierName = data?.tierName || 'Unknown';
  const tokenCount = data?.tokenCount || 0;
  const migrationCount = data?.migrationCount || 0;
  const rugCount = data?.rugCount || 0;
  const topMcap = data?.topMcap;

  // Wallet info
  const devAddress = data?.devAddress || wallet;
  const devAddressShort = data?.devAddressShort || `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  const fundingWallet = data?.fundingWallet;
  const fundingWalletShort = data?.fundingWalletShort;
  const fundingAmount = data?.fundingAmount;

  // Calculate migration rate
  const migrationRate = tokenCount > 0 ? ((migrationCount / tokenCount) * 100).toFixed(1) : 0;

  // Determine status message
  let statusMsg = '';
  let statusClass = '';
  if (rugCount > 0) {
    statusMsg = `⚠️ ${rugCount} rug${rugCount > 1 ? 's' : ''} detected`;
    statusClass = 'danger';
  } else if (migrationCount >= 5) {
    statusMsg = '🏆 Proven track record';
    statusClass = 'success';
  } else if (migrationCount >= 3) {
    statusMsg = '✓ Multiple successful launches';
    statusClass = 'success';
  } else if (migrationCount >= 1) {
    statusMsg = '✓ Has migrated token(s)';
    statusClass = 'good';
  } else if (tokenCount > 50) {
    statusMsg = 'Experienced launcher';
    statusClass = 'neutral';
  } else if (tokenCount > 0) {
    statusMsg = 'Building history';
    statusClass = 'neutral';
  } else {
    statusMsg = 'New developer';
    statusClass = 'neutral';
  }

  // Format top mcap
  let topMcapDisplay = '';
  if (topMcap) {
    if (topMcap >= 1000000) topMcapDisplay = `$${(topMcap / 1000000).toFixed(1)}M`;
    else if (topMcap >= 1000) topMcapDisplay = `$${(topMcap / 1000).toFixed(0)}K`;
    else topMcapDisplay = `$${topMcap.toFixed(0)}`;
  }

  // Check if we have Axiom data
  const hasAxiomData = axiomData && (axiomData.migrated !== null || axiomData.nonMigrated !== null);

  card.innerHTML = `
    <div class="devcred-card-header">
      <span class="devcred-card-logo">DevCred</span>
      <span class="devcred-card-subtitle">Developer Reputation</span>
    </div>
    <div class="devcred-card-body">
      <!-- Wallet Info Section (like Axiom's DA section) -->
      <div class="devcred-wallet-section">
        <div class="devcred-wallet-row">
          <span class="devcred-wallet-label">DA:</span>
          <span class="devcred-wallet-address" title="${devAddress}">${devAddressShort}</span>
          <button class="devcred-copy-btn" data-wallet="${devAddress}">Copy</button>
        </div>
        ${fundingWallet ? `
        <div class="devcred-wallet-row">
          <span class="devcred-wallet-label">Funded via:</span>
          <span class="devcred-wallet-address" title="${fundingWallet}">${fundingWalletShort}</span>
          ${fundingAmount ? `<span class="devcred-funding-amount">${fundingAmount}</span>` : ''}
          <button class="devcred-copy-btn" data-wallet="${fundingWallet}">Copy</button>
        </div>
        ` : ''}
      </div>

      <!-- Score Section -->
      <div class="devcred-card-score-section">
        <div class="devcred-card-score-circle" style="border-color: ${color}">
          <span class="devcred-card-score-value" style="color: ${color}">${score === 0 ? '—' : score}</span>
          <span class="devcred-card-score-max">/740</span>
        </div>
        <div class="devcred-card-tier-info">
          <div class="devcred-card-tier">
            <span class="devcred-card-tier-dot" style="background: ${color}; box-shadow: 0 0 8px ${color}"></span>
            <span class="devcred-card-tier-name">${tierName}</span>
          </div>
          ${topMcapDisplay ? `<div class="devcred-card-mcap">Best: ${topMcapDisplay}</div>` : ''}
        </div>
      </div>

      <!-- Stats Row -->
      <div class="devcred-card-stats">
        <div class="devcred-card-stat">
          <span class="devcred-card-stat-value">${tokenCount}</span>
          <span class="devcred-card-stat-label">Tokens</span>
        </div>
        <div class="devcred-card-stat devcred-stat-good">
          <span class="devcred-card-stat-value">${migrationCount}</span>
          <span class="devcred-card-stat-label">Migrated</span>
        </div>
        <div class="devcred-card-stat">
          <span class="devcred-card-stat-value">${migrationRate}%</span>
          <span class="devcred-card-stat-label">Rate</span>
        </div>
        <div class="devcred-card-stat ${rugCount > 0 ? 'devcred-stat-danger' : ''}">
          <span class="devcred-card-stat-value">${rugCount}</span>
          <span class="devcred-card-stat-label">Rugs</span>
        </div>
      </div>

      <!-- Status Message -->
      <div class="devcred-card-status devcred-status-${statusClass}">${statusMsg}</div>
    </div>
    <div class="devcred-card-footer">
      <span class="devcred-profile-link">View full profile →</span>
      ${hasAxiomData ? '<span class="devcred-card-source">✓ Live data</span>' : ''}
    </div>
  `;

  // Add click handlers for copy buttons (stop propagation so card doesn't open profile)
  card.querySelectorAll('.devcred-copy-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      copyToClipboard(btn.dataset.wallet, btn);
    };
  });

  // Card click opens profile
  card.querySelector('.devcred-profile-link').onclick = (e) => {
    e.stopPropagation();
    window.open(`https://devcred.fun/profile/${wallet}`, '_blank');
  };

  return card;
}

// PULSE PAGE: Disabled - Pulse page only shows token addresses, not creator wallets
// The x.com/search links contain token mint addresses (e.g. "rSa3...pump")
// not the actual developer wallet, so we can't look up their score.
// Badges only work on token detail pages where we can find the DA section.
function scanPulsePage() {
  // Disabled for now - would need Helius API call to resolve token→creator
  // which is expensive and slow for the Pulse page with many cards
  return;
}

function findTokenNameInCard(card) {
  const candidates = card.querySelectorAll('span, div, a');

  for (const el of candidates) {
    if (el.querySelector('.devcred-badge')) continue;

    const text = el.textContent?.trim() || '';
    if (!text || text.length < 2 || text.length > 40) continue;
    if (/^[\d\.\$%,]+$/.test(text)) continue;
    if (/^[A-Za-z0-9]+\.{2,3}[A-Za-z0-9]+$/.test(text)) continue;
    if (text.includes('@')) continue;
    if (/^\d+[smhd]$/.test(text)) continue;
    if (text.includes('MC') || text.includes('TX') || text.includes('SOL')) continue;

    const style = window.getComputedStyle(el);
    const fontSize = parseFloat(style.fontSize);
    const fontWeight = parseInt(style.fontWeight);

    if (fontSize >= 13 && fontWeight >= 500 && /^[A-Z]/.test(text)) {
      return el;
    }
  }
  return null;
}

function scan() {
  console.log('[DevCred] Scanning...');
  scanTokenPage();
  scanPulsePage();
}

console.log('[DevCred] Extension loaded');
setTimeout(scan, 1500);
setTimeout(scan, 3000);

const observer = new MutationObserver(() => setTimeout(scan, 500));
observer.observe(document.body, { childList: true, subtree: true });
