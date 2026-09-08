// supabase/functions/generate-tts/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

Deno.serve(async (req) => {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, languageCode, voiceName, speakingRate = 1.0, pitch = 0 } = await req.json()

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Missing "text" field' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const API_KEY = Deno.env.get('GOOGLE_CLOUD_API_KEY')
    if (!API_KEY) {
      throw new Error('GOOGLE_CLOUD_API_KEY not set')
    }

    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`
    const body = {
      input: { text },
      voice: {
        languageCode: languageCode || 'en-US',
        name: voiceName || 'en-US-Neural2-F',
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: speakingRate,
        pitch: pitch,
      },
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Google TTS API error:', errorText)
      throw new Error(`TTS API error: ${errorText}`)
    }

    const data = await response.json()
    const audioBase64 = data.audioContent
    if (!audioBase64) {
      throw new Error('No audio content returned from TTS')
    }

    const audioBinary = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const path = `tts/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.mp3`
    const { error: uploadError } = await supabase.storage
      .from('lesson-media')
      .upload(path, audioBinary, {
        contentType: 'audio/mpeg',
        cacheControl: '3600',
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      throw new Error(`Failed to upload audio: ${uploadError.message}`)
    }

    const { data: publicUrlData } = supabase.storage
      .from('lesson-media')
      .getPublicUrl(path)

    const publicUrl = publicUrlData.publicUrl

    return new Response(
      JSON.stringify({ url: publicUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Edge Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})