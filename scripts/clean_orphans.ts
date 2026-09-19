import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');
for (const line of envLines) {
  if (line.includes('=')) {
    const [key, ...values] = line.split('=');
    if (!process.env[key.trim()]) {
      process.env[key.trim()] = values.join('=').trim().replace(/^["'](.*)["']$/, '$1');
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanOrphanedUsers() {
  console.log('Fetching all auth users...');
  
  // List all users
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('Error fetching users:', listError);
    return;
  }
  
  console.log(`Found ${users.length} total auth users.`);
  
  let deletedCount = 0;
  
  for (const user of users) {
    // Check if they exist in profiles
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single();
    
    if (!profile) {
      console.log(`User ${user.email} (${user.id}) has no profile! Deleting...`);
      const { error: delError } = await supabase.auth.admin.deleteUser(user.id);
      if (delError) {
        console.error(`Failed to delete ${user.id}:`, delError);
      } else {
        deletedCount++;
        console.log(`Deleted successfully.`);
      }
    }
  }
  
  console.log(`Cleanup complete! Deleted ${deletedCount} orphaned users.`);
}

cleanOrphanedUsers();
