import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

// Create a Supabase client with service role access
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // navigator.sendBeacon sends data as a string, so we need to parse it
  const { filePaths } = JSON.parse(req.body);

  if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
    return res.status(400).json({ error: 'filePaths array is required' });
  }

  try {
    const { data, error } = await supabaseAdmin.storage
      .from('images')
      .remove(filePaths);

    if (error) {
      throw error;
    }

    return res.status(200).json({ success: true, removed: data });
  } catch (error: unknown) {
    console.error('Error cleaning up files:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return res.status(500).json({ error: message });
  }
}
