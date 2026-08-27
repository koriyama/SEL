// api/admin-login.js
import { createClient } from '@supabase/supabase-js';

// Environment variables (set on Vercel – server‑side only)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const adminSecretToken = process.env.ADMIN_SECRET_TOKEN;

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get the token from the Authorization header
  const token = req.headers.authorization?.replace('Bearer ', '');

  // Validate the token
  if (!token || token !== adminSecretToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Create a Supabase client with the service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Sign in the admin using the server‑side credentials
    const { data, error } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });

    if (error) throw error;

    // Return the session data
    return res.status(200).json({
      session: data.session,
      user: data.user,
    });
  } catch (err) {
    console.error('Admin login failed:', err);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}