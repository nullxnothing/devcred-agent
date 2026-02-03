import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

// Create pool with explicit connection string
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// KOL data extracted from kolscan.io leaderboard
const kols = [
  { walletAddress: "7xwDKXNG9dxMsBSCmiAThp7PyDaUXbm23irLr7iPeh7w", name: "shah" },
  { walletAddress: "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o", name: "Cented" },
  { walletAddress: "BCagckXeMChUKrHEd6fKFA1uiWDtcmCXMsqaheLiUPJd", name: "dv" },
  { walletAddress: "4vw54BmAogeRV3vPKWyFet5yf8DTLcREzdSzx4rw9Ud9", name: "decu" },
  { walletAddress: "J6TDXvarvpBdPXTaTU8eJbtso1PUCYKGkVtMKUUY8iEa", name: "Pain" },
  { walletAddress: "2fg5QD1eD7rzNNCsvnhmXFm5hqNgwTTG8p7kQ6f3rx6f", name: "Cupsey" },
  { walletAddress: "JDd3hy3gQn2V982mi1zqhNqUw1GfV2UL6g76STojCJPN", name: "West" },
  { walletAddress: "6mWEJG9LoRdto8TwTdZxmnJpkXpTsEerizcGiCNZvzXd", name: "slingoor" },
  { walletAddress: "4cXnf2z85UiZ5cyKsPMEULq1yufAtpkatmX4j4DBZqj2", name: "WaiterG" },
  { walletAddress: "DKgvpfttzmJqZXdavDwTxwSVkajibjzJnN2FA99dyciK", name: "R💫WDY" },
  { walletAddress: "G6fUXjMKPJzCY1rveAE6Qm7wy5U3vZgKDJmN1VPAdiZC", name: "clukz" },
  { walletAddress: "4BdKaxN8G6ka4GYtQQWk4G4dZRUTX2vQH9GcXdBREFUk", name: "Jijo" },
  { walletAddress: "Be24Gbf5KisDk1LcWWZsBn8dvB816By7YzYF5zWZnRR6", name: "Chairman ²" },
  { walletAddress: "8DGbkGgQewL9mx4aXzZCUChr7hBVXvPK9fYqSqc7Ajpn", name: "Ban" },
  { walletAddress: "FAicXNV5FVqtfbpn4Zccs71XcfGeyxBSGbqLDyDJZjke", name: "radiance" },
  { walletAddress: "6HJetMbdHBuk3mLUainxAPpBpWzDgYbHGTS2TqDAUSX2", name: "LJC" },
  { walletAddress: "B32QbbdDAyhvUQzjcaM5j6ZVKwjCxAwGH5Xgvb9SJqnC", name: "Kadenox" },
  { walletAddress: "4NtyFqqRzvHWsTmJZoT26H9xtL7asWGTxpcpCxiKax9a", name: "Inside Calls" },
  { walletAddress: "9tY7u1HgEt2RDcxym3RJ9sfvT3aZStiiUwXd44X9RUr8", name: "Solana degen" },
  { walletAddress: "57rXqaQsvgyBKwebP2StfqQeCBjBS4jsrZFJN5aU2V9b", name: "ram" },
  { walletAddress: "ATFRUwvyMh61w2Ab6AZxUyxsAfiiuG1RqL6iv3Vi9q2B", name: "Marcell" },
  { walletAddress: "qP3Q8d4WWsGbqkTfyA9Dr6cAD7DQoBuxPJMFTK48rWU", name: "kitty" },
  { walletAddress: "3BLjRcxWGtR7WRshJ3hL25U3RjWr5Ud98wMcczQqk4Ei", name: "Sebastian" },
  { walletAddress: "DYAn4XpAkN5mhiXkRB7dGq4Jadnx6XYgu8L5b3WGhbrt", name: "The Doc" },
  { walletAddress: "Di75xbVUg3u1qcmZci3NcZ8rjFMj7tsnYEoFdEMjS4ow", name: "N'o" },
  { walletAddress: "4fZFcK8ms3bFMpo1ACzEUz8bH741fQW4zhAMGd5yZMHu", name: "Rilsio" },
  { walletAddress: "8deJ9xeUvXSJwicYptA9mHsU2rN2pDx37KWzkDkEXhU6", name: "Cooker" },
  { walletAddress: "DEdEW3SMPU2dCfXEcgj2YppmX9H3bnMDJaU4ctn2BQDQ", name: "King Solomon" },
  { walletAddress: "BrT5kYQ125u6NaRKFKNiBnHak6X7MvcZSQ3LfQCB3sqg", name: "zoru" },
  { walletAddress: "xyzfhxfy8NhfeNG3Um3WaUvFXzNuHkrhrZMD8dsStB6", name: "Gasp" },
  { walletAddress: "gangJEP5geDHjPVRhDS5dTF5e6GtRvtNogMEEVs91RV", name: "Qavec" },
  { walletAddress: "39q2g5tTQn9n7KnuapzwS2smSx3NGYqBoea11tBjsGEt", name: "Walta" },
  { walletAddress: "2X4H5Y9C4Fy6Pf3wpq8Q4gMvLcWvfrrwDv2bdR8AAwQv", name: "Orange" },
  { walletAddress: "AAMnoNo3TpezKcT7ah9puLFZ4D59muEhQHJJqpX16ccg", name: "sarah milady" },
  { walletAddress: "ETU3GyrUsv6UztQJxHgsBX2UoJFmq79WJe3JyDpAqGMz", name: "MACXBT" },
  { walletAddress: "9cdZg6xR4c9kZiqKSzqjn4QHCXNQuC9HEWBzzMJ3mzqw", name: "Pikalosi" },
  { walletAddress: "4WPTQA7BB4iRdrPhgNpJihGcxKh8T43gLjMn5PbEVfQw", name: "Oura" },
  { walletAddress: "Dwo2kj88YYhwcFJiybTjXezR9a6QjkMASz5xXD7kujXC", name: "Exotic" },
  { walletAddress: "831yhv67QpKqLBJjbmw2xoDUeeFHGUx8RnuRj9imeoEs", name: "Trey" },
  { walletAddress: "J1XAE4onKYG1kTghgaytnyFgR3otQs1xEnJRRWM3djSQ", name: "yode" },
  { walletAddress: "3jzHjoPKaceZjA6AqAWka7Ghw9F3w9k9cvjGTmybdioT", name: "dxrnelljcl" },
  { walletAddress: "7bsTkeWcSPG6nzsbXucxV89YUULoSExNJdX2WqfLHwZ4", name: "BIGWARZ" },
  { walletAddress: "J9TYAsWWidbrcZybmLSfrLzryANf4CgJBLdvwdGuC8MB", name: "Johnson" },
  { walletAddress: "8MaVa9kdt3NW4Q5HyNAm1X5LbR8PQRVDc1W8NMVK88D5", name: "Daumen" },
  { walletAddress: "BJXjRq566xt66pcxCmCMLPSuNxyUpPNBdJGP56S7fMda", name: "h14" },
  { walletAddress: "9iaawVBEsFG35PSwd4PahwT8fYNQe9XYuRdWm872dUqY", name: "Meechie" },
  { walletAddress: "5d3jQcuUvsuHyZkhdp78FFqc7WogrzZpTtec1X9VNkuE", name: "tech" },
  { walletAddress: "BCnqsPEtA1TkgednYEebRpkmwFRJDCjMQcKZMMtEdArc", name: "kreo" },
  { walletAddress: "2e1w3Xo441Ytvwn54wCn8itAXwCKbiizc9ynGEv14Vis", name: "prettyover" },
  { walletAddress: "FsG3BaPmRTdSrPaivbgJsFNCCa8cPfkUtk8VLWXkHpHP", name: "Reljoo" },
];

async function upsertKol(kol: { wallet_address: string; name: string; kolscan_rank: number }) {
  const result = await pool.query(
    `INSERT INTO dk_kols (wallet_address, name, kolscan_rank)
     VALUES ($1, $2, $3)
     ON CONFLICT (wallet_address) DO UPDATE SET
       name = EXCLUDED.name,
       kolscan_rank = EXCLUDED.kolscan_rank,
       updated_at = NOW()
     RETURNING *`,
    [kol.wallet_address, kol.name, kol.kolscan_rank]
  );
  return result.rows[0];
}

async function getKolCount() {
  const result = await pool.query('SELECT COUNT(*) as count FROM dk_kols');
  return parseInt(result.rows[0].count, 10);
}

async function main() {
  console.log('Inserting KOL data...\n');

  for (let i = 0; i < kols.length; i++) {
    const kol = kols[i];
    const rank = i + 1;

    try {
      await upsertKol({
        wallet_address: kol.walletAddress,
        name: kol.name,
        kolscan_rank: rank,
      });
      console.log(`#${rank} ${kol.name} (${kol.walletAddress.slice(0, 8)}...)`);
    } catch (error) {
      console.error(`Error inserting ${kol.name}:`, error);
    }
  }

  const count = await getKolCount();
  console.log(`\nDone! Total KOLs in database: ${count}`);
  await pool.end();
  process.exit(0);
}

main();
