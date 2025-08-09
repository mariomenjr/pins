import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xdfmsvfwnbhoqzlebtxh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkZm1zdmZ3bmJob3F6bGVidHhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMDc0NTIsImV4cCI6MjA2OTc4MzQ1Mn0.TRB_cc7d36scUJdaF6I7FNm91-iG-qS7t1Vtdlq9LMs'

export const supabase = createClient(supabaseUrl, supabaseKey)