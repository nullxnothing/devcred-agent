/**
 * KOL Scraper - Crawls kolscan.io leaderboard to extract KOL data
 * Uses Playwright for browser automation
 *
 * Usage: npx tsx scripts/crawl-kols.ts
 */

import { chromium } from 'playwright';
import { upsertKol, getKolCount } from '../lib/db';

interface KolData {
  wallet_address: string;
  name: string;
  twitter_url: string | null;
  telegram_url: string | null;
  kolscan_rank: number;
  pnl_sol: number | null;
  wins: number;
  losses: number;
}

async function crawlKolscan(): Promise<KolData[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Navigating to kolscan.io leaderboard...');
  await page.goto('https://kolscan.io/leaderboard', {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  // Wait for the leaderboard table to load
  await page.waitForSelector('table', { timeout: 30000 });

  // Give it extra time for dynamic content
  await page.waitForTimeout(3000);

  console.log('Extracting KOL data...');

  const kols = await page.evaluate(() => {
    const results: KolData[] = [];
    const rows = document.querySelectorAll('table tbody tr');

    rows.forEach((row, index) => {
      if (index >= 50) return; // Limit to top 50

      const cells = row.querySelectorAll('td');
      if (cells.length < 4) return;

      // Extract rank
      const rankText = cells[0]?.textContent?.trim() || '';
      const rank = parseInt(rankText.replace('#', ''), 10) || index + 1;

      // Extract name and wallet from the name cell
      const nameCell = cells[1];
      const nameLink = nameCell?.querySelector('a');
      const name = nameCell?.textContent?.trim().split('\n')[0] || `KOL #${rank}`;

      // Extract wallet address from the profile link
      let walletAddress = '';
      const href = nameLink?.getAttribute('href') || '';
      if (href.includes('/account/')) {
        walletAddress = href.split('/account/')[1]?.split('?')[0] || '';
      }

      if (!walletAddress) return;

      // Extract social links
      let twitterUrl: string | null = null;
      let telegramUrl: string | null = null;

      const socialLinks = nameCell?.querySelectorAll('a');
      socialLinks?.forEach((link) => {
        const linkHref = link.getAttribute('href') || '';
        if (linkHref.includes('twitter.com') || linkHref.includes('x.com')) {
          twitterUrl = linkHref;
        } else if (linkHref.includes('t.me') || linkHref.includes('telegram')) {
          telegramUrl = linkHref;
        }
      });

      // Extract PnL (usually in 3rd column)
      const pnlText = cells[2]?.textContent?.trim() || '0';
      const pnlMatch = pnlText.match(/-?[\d,]+\.?\d*/);
      const pnl = pnlMatch ? parseFloat(pnlMatch[0].replace(/,/g, '')) : null;

      // Extract wins/losses (usually in 4th or 5th column)
      let wins = 0;
      let losses = 0;
      for (let i = 3; i < cells.length; i++) {
        const cellText = cells[i]?.textContent?.trim() || '';
        const wlMatch = cellText.match(/(\d+)\s*[/|]\s*(\d+)/);
        if (wlMatch) {
          wins = parseInt(wlMatch[1], 10) || 0;
          losses = parseInt(wlMatch[2], 10) || 0;
          break;
        }
      }

      results.push({
        wallet_address: walletAddress,
        name: name.substring(0, 100), // Truncate long names
        twitter_url: twitterUrl,
        telegram_url: telegramUrl,
        kolscan_rank: rank,
        pnl_sol: pnl,
        wins,
        losses,
      });
    });

    return results;
  });

  await browser.close();
  return kols;
}

async function main() {
  console.log('Starting KOL crawl...\n');

  try {
    const kols = await crawlKolscan();

    console.log(`Found ${kols.length} KOLs\n`);

    if (kols.length === 0) {
      console.log('No KOLs found. The page structure may have changed.');
      console.log('Consider updating the scraper selectors.');
      process.exit(1);
    }

    // Upsert each KOL to database
    let inserted = 0;
    let updated = 0;

    for (const kol of kols) {
      try {
        const existingCount = await getKolCount();
        await upsertKol(kol);

        const newCount = await getKolCount();
        if (newCount > existingCount) {
          inserted++;
          console.log(`+ [NEW] #${kol.kolscan_rank} ${kol.name} (${kol.wallet_address.slice(0, 8)}...)`);
        } else {
          updated++;
          console.log(`~ [UPD] #${kol.kolscan_rank} ${kol.name}`);
        }
      } catch (error) {
        console.error(`Error upserting KOL ${kol.name}:`, error);
      }
    }

    console.log('\n---');
    console.log(`Crawl complete: ${inserted} new, ${updated} updated`);
    console.log(`Total KOLs in database: ${await getKolCount()}`);

  } catch (error) {
    console.error('Error during crawl:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();
