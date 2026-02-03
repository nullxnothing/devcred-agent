import { config } from 'dotenv';
config(); // Load from .env

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const result = await pool.query(
    `UPDATE dk_tokens SET score = 62 WHERE mint_address = '2mESiwuVdfft9PxG7x36rvDvex6ccyY8m8BKCWJqpump' RETURNING name, score`
  );
  console.log('Updated:', result.rows[0]);
  await pool.end();
}

main();
