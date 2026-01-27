/**
 * Seed Leaderboard via API
 * Uses the app's profile API to trigger wallet scans
 * 
 * Usage: 
 * 1. Make sure the dev server is running (npm run dev)
 * 2. Run: npx tsx scripts/seed-via-api.ts
 */

// Known active Solana token creator wallets
const SEED_WALLETS = [
  'TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM',
  '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9',
  'Beahze18cH3ADNRVhGk7Xh4qXDfK7vL23Y8Kj6jKJ8Zu',
  'FWznbcNXWfZdZH2r2iKhNqqgzMNpF6jpJf1rWqhV7Yhr',
  '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
  'J3SqkYpWmBvLKpFzr5P7ow5qJPjy7dLvdKKLJzKXRKhE',
  '4pUQS4Jo2dsfWzt3VgHXy3H6RYnEDd11oWPiaM2rdAPw',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
  'AVm6WLmMuUPVNf9Kdj6oBr6LHECw6pwCKbPPuhCJjPxd',
];

const BASE_URL = 'http://localhost:3001'; // Adjust if your dev server is on a different port

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function seedWallet(wallet: string): Promise<boolean> {
  try {
    console.log(`\n📍 Scanning wallet: ${wallet.slice(0, 8)}...${wallet.slice(-4)}`);
    
    const response = await fetch(`${BASE_URL}/api/profile/${wallet}`);
    
    if (!response.ok) {
      console.log(`  ❌ Failed: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const data = await response.json();
    
    if (data.error) {
      console.log(`  ❌ Error: ${data.error}`);
      return false;
    }
    
    console.log(`  ✅ Created profile: ${data.user.twitterHandle}`);
    console.log(`     Score: ${data.score.total} | Tier: ${data.score.tierName}`);
    console.log(`     Tokens: ${data.stats.totalTokens} | Migrations: ${data.stats.migratedTokens}`);
    
    return true;
  } catch (error: any) {
    console.log(`  ❌ Network error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🌱 DevKarma Leaderboard Seeder (API Mode)');
  console.log('=========================================\n');
  console.log('Using API endpoint to trigger wallet scans...');
  console.log(`Target: ${BASE_URL}`);
  
  // First check if the server is running
  try {
    const healthCheck = await fetch(`${BASE_URL}/api/leaderboard`);
    if (!healthCheck.ok) {
      throw new Error('Server not responding');
    }
    console.log('✅ Server is running\n');
  } catch (e) {
    console.error('❌ Dev server is not running!');
    console.error('   Please start it with: npm run dev');
    console.error(`   And make sure it\'s accessible at ${BASE_URL}`);
    process.exit(1);
  }
  
  let successCount = 0;
  
  for (const wallet of SEED_WALLETS) {
    // Rate limit between requests
    await sleep(3000);
    
    const success = await seedWallet(wallet);
    if (success) successCount++;
  }
  
  console.log('\n\n📊 Fetching final leaderboard...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/api/leaderboard?limit=20`);
    const data = await response.json();
    
    console.log('🏆 Current Leaderboard:');
    console.log('');
    
    for (const dev of data.leaderboard) {
      console.log(`  #${dev.rank} ${dev.twitterName} (@${dev.twitterHandle})`);
      console.log(`     Score: ${dev.score} | Tier: ${dev.tierName}`);
    }
  } catch (e) {
    console.log('Could not fetch leaderboard');
  }
  
  console.log(`\n✅ Done! Successfully seeded ${successCount}/${SEED_WALLETS.length} wallets.`);
}

main().catch(console.error);
