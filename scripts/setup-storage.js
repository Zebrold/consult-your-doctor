const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing env variables. Check path.")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupStorage() {
  console.log("Checking if bucket 'medical_records' exists...")
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()
  if (listError) {
    console.error("Error listing buckets:", listError)
    return
  }

  const exists = buckets.find(b => b.name === 'medical_records')
  if (exists) {
    console.log("Bucket 'medical_records' already exists.")
    // Ensure it is public
    const { error: updateError } = await supabase.storage.updateBucket('medical_records', {
      public: true,
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      fileSizeLimit: 5242880 // 5MB
    })
    if (updateError) {
      console.error("Failed to update bucket to public:", updateError)
    } else {
      console.log("Bucket updated successfully.")
    }
    return
  }

  console.log("Creating bucket 'medical_records'...")
  const { data, error } = await supabase.storage.createBucket('medical_records', {
    public: true,
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    fileSizeLimit: 5242880 // 5MB
  })

  if (error) {
    console.error("Error creating bucket:", error)
  } else {
    console.log("Bucket created successfully:", data)
  }
}

setupStorage()
