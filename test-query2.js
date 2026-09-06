const fs = require('fs');
let envFile = '';
try { envFile = fs.readFileSync('.env', 'utf8'); } catch (e) {
  envFile = fs.readFileSync('.env.local', 'utf8');
}
const env = envFile.split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

fetch(`${supabaseUrl}/rest/v1/doctors?select=id,specialty,experience_years,profiles!doctors_profile_id_fkey(full_name,avatar_url),hospitals(name,city)&limit=3`, {
  headers: { 'apikey': supabaseKey, 'Authorization': 'Bearer ' + supabaseKey }
}).then(r => r.json()).then(data => {
  console.log("Response:", JSON.stringify(data, null, 2));
}).catch(console.error);
