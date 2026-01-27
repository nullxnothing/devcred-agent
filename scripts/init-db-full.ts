import { Client } from 'pg';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

async function initDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return console.error('No DATABASE_URL found in .env');
  
  console.log('Initializing database...');
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    // Step 1: Read schema.sql
    const schemaPath = path.join(process.cwd(), 'supabase', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Executing schema.sql...');
    await client.query(schemaSql);
    console.log('Schema created successfully.');

    // Step 2: Apply the nullable fix for permissionless profiles
    console.log('Applying nullable twitter_id fix...');
    await client.query('ALTER TABLE dk_users ALTER COLUMN twitter_id DROP NOT NULL;');
    console.log('Fix applied successfully.');

  } catch (err: any) {
    console.error('Initialization failed:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    if (err.hint) console.error('Hint:', err.hint);
  } finally {
    await client.end();
  }
}

initDb();
