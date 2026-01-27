import { Client } from 'pg';
import 'dotenv/config';

async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url) return console.error('No DATABASE_URL');
  
  console.log('Final migration attempt using Client...');
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected!');
    await client.query('ALTER TABLE dk_users ALTER COLUMN twitter_id DROP NOT NULL;');
    console.log('twitter_id is now nullable');
  } catch (err: any) {
    console.error('Migration failed:', err.message);
  } finally {
    await client.end();
  }
}

migrate();
