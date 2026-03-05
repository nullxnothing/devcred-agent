/**
 * Alert Detection & Forum Posting
 *
 * Detects notable events and posts them to the Colosseum forum.
 */

import { AlertType, ForumPost } from './types';
import { forumClient } from './forum';
import { WalletScanResult } from '@/lib/wallet-scan';

interface AlertConfig {
  type: AlertType;
  check: (result: WalletScanResult, tokenName?: string) => boolean;
  createPost: (result: WalletScanResult, tokenName?: string, tokenSymbol?: string) => ForumPost;
}

const ALERT_CONFIGS: AlertConfig[] = [
  {
    type: 'high_risk_deployer',
    check: (result) => result.breakdown.rugCount >= 3,
    createPost: (result, tokenName, tokenSymbol) => ({
      title: `Blacklist Alert: High-Risk Deployer (${result.breakdown.rugCount} Rugs)`,
      body: formatHighRiskAlert(result, tokenName, tokenSymbol),
      tags: ['progress-update', 'trading', 'security'],
    }),
  },
  {
    type: 'reputable_deployer',
    check: (result) => result.tier === 'sovereign' || result.tier === 'cleared',
    createPost: (result, tokenName, tokenSymbol) => ({
      title: `Blacklist Alert: ${result.tierName} Dev Launching ${tokenSymbol || 'New Token'}`,
      body: formatReputableAlert(result, tokenName, tokenSymbol),
      tags: ['progress-update', 'trading'],
    }),
  },
  // Removed new_deployer - too many first-time launchers to post about
];

function formatHighRiskAlert(
  result: WalletScanResult,
  tokenName?: string,
  tokenSymbol?: string
): string {
  return `
Blacklist Agent detected a **high-risk deployer** launching a new token.

**Token:** ${tokenName || 'Unknown'} (${tokenSymbol || '???'})
**Deployer:** \`${result.walletAddress}\`

**Risk Analysis:**
- Blacklist Score: **${result.totalScore}** (${result.tierName})
- Previous Rugs: **${result.breakdown.rugCount}**
- Total Tokens Launched: ${result.breakdown.tokenCount}
- Migrations: ${result.breakdown.migrationCount}

This wallet has a history of abandoned/rugged projects. Exercise caution.

---
*Automated alert from Blacklist Agent*
  `.trim();
}

function formatReputableAlert(
  result: WalletScanResult,
  tokenName?: string,
  tokenSymbol?: string
): string {
  return `
Blacklist Agent detected a **reputable developer** launching a new token.

**Token:** ${tokenName || 'Unknown'} (${tokenSymbol || '???'})
**Deployer:** \`${result.walletAddress}\`

**Track Record:**
- Blacklist Score: **${result.totalScore}** (${result.tierName})
- Successful Migrations: ${result.breakdown.migrationCount}
- Total Tokens: ${result.breakdown.tokenCount}
- Rugs: ${result.breakdown.rugCount}

This developer has a proven track record of successful token launches.

---
*Automated alert from Blacklist Agent*
  `.trim();
}

/**
 * Check scan result for notable events and post alerts
 */
export async function checkAndPostAlerts(
  result: WalletScanResult,
  tokenName?: string,
  tokenSymbol?: string
): Promise<AlertType | null> {
  for (const config of ALERT_CONFIGS) {
    if (config.check(result, tokenName)) {
      const post = config.createPost(result, tokenName, tokenSymbol);
      const posted = await forumClient.post(post);

      if (posted) {
        console.log(`[Alerts] Posted ${config.type} alert for ${result.walletAddress.slice(0, 8)}...`);
        return config.type;
      }
    }
  }

  return null;
}
