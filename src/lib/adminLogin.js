// src/lib/adminLogin.js
import { supabase } from './supabaseClient';

export async function adminAutoLogin() {
  const token = import.meta.env.VITE_ADMIN_TOKEN; // optional: store a token on client, but not password
  // Or you can omit the token and rely on the endpoint being called only from a protected route.
  // For simplicity, we'll use a token stored client‑side (still exposed, but it's not the password).
  if (!token) return null;

  try {
    const response = await fetch('/api/admin-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error('Admin login failed');

    const { session, user } = await response.json();

    // Set the session in the Supabase client
    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    return user;
  } catch (err) {
    console.error('Auto‑login error:', err);
    return null;
  }
}