import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function fix() {
  const { data: schedules, error } = await supabase.from('schedules').select('*')
  if (error) {
    console.error(error)
    return
  }

  console.log(`Found ${schedules.length} schedules`)
  
  let updatedCount = 0
  const now = new Date()
  
  for (const s of schedules) {
    const oldTime = new Date(s.start_time)
    if (oldTime < now) {
      // Add 7 days to the start and end times to push them to the future
      const newStart = new Date(oldTime.getTime() + 7 * 24 * 60 * 60 * 1000)
      const newEnd = new Date(new Date(s.end_time).getTime() + 7 * 24 * 60 * 60 * 1000)
      
      const { error: updateError } = await supabase
        .from('schedules')
        .update({ start_time: newStart.toISOString(), end_time: newEnd.toISOString() })
        .eq('id', s.id)
        
      if (!updateError) {
        updatedCount++
      } else {
        console.error('Update error:', updateError)
      }
    }
  }
  
  console.log(`Updated ${updatedCount} schedules to the future.`)
}

fix()
