const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  if (line.includes('=')) {
    const [key, ...values] = line.split('=');
    env[key.trim()] = values.join('=').trim().replace(/^["'](.*)["']$/, '$1');
  }
}

// Convert Supabase URL to Postgres connection string
// Format: postgresql://postgres.[project-ref]:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
const dbUrl = env.SUPABASE_DB_URL || env.DATABASE_URL;

async function run() {
  if (!dbUrl) {
    console.error('No DB URL found. Please make sure DATABASE_URL is in .env');
    return;
  }
  
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  
  try {
    await client.query('ALTER TABLE doctor_signup_requests ADD COLUMN IF NOT EXISTS experience_years INTEGER;');
    await client.query('ALTER TABLE doctor_signup_requests ADD COLUMN IF NOT EXISTS consultation_fee INTEGER;');
    console.log('Successfully altered table!');
  } catch (err) {
    console.error('Error altering table:', err);
  } finally {
    await client.end();
  }
}
run();
