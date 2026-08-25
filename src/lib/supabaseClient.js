// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate URL format
const isValidUrl = (string) => {
  try {
    const url = new URL(string)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch (_) {
    return false
  }
}

if (!url || !anonKey || !isValidUrl(url)) {
  console.error(
    '❌ Supabase environment variables are missing or invalid.\n' +
    'Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.\n' +
    'VITE_SUPABASE_URL must be a valid HTTP or HTTPS URL.'
  )
  throw new Error(
    `Invalid supabaseUrl: ${url}. Must be a valid HTTP or HTTPS URL.`
  )
}

export const supabase = createClient(url, anonKey)

// Helper to get the current session (for auth checks)
export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  return session
}

// Helper to get the current user
export const getUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}