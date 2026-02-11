import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ckvprducwuhhnrkbzaoo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrdnByZHVjd3VoaG5ya2J6YW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NDEwODgsImV4cCI6MjA4NjExNzA4OH0.FvwuHoVOCUaFUtRVJ1ehwFWhEEk-iUlWwrnx1wamcKs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
