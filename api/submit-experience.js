// Vercel Serverless API Function: /api/submit-experience
// Receives user experience notes and stores them in Supabase PostgreSQL database.

export default async function handler(req, res) {
  // Handle CORS preflight request
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  try {
    const { text } = req.body || {};

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Text content is required.' });
    }

    const sanitizedText = text.trim().substring(0, 3000);

    let supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_ID;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

    // Development Mode Fallback if Supabase environment variables are not set yet
    if (!supabaseUrl || !supabaseKey) {
      console.log('[Dev Mode Submission Received]:', sanitizedText);
      return res.status(200).json({
        success: true,
        message: 'Submission received in Dev Mode! Configure SUPABASE_URL and SUPABASE_KEY in Vercel to store in database.'
      });
    }

    // Format URL: handles either full URL (https://xyz.supabase.co) or raw Project ID (xyz)
    if (!supabaseUrl.startsWith('http')) {
      supabaseUrl = `https://${supabaseUrl}.supabase.co`;
    }

    // Production Mode: Direct REST insertion into Supabase PostgreSQL
    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/experiences`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        text: sanitizedText,
        created_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase REST insertion error:', errorText);
      return res.status(500).json({ success: false, error: 'Failed to record experience in database.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Thank you! Your experience has been successfully recorded.'
    });
  } catch (err) {
    console.error('Serverless function error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
}
