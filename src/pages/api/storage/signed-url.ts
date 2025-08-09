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

  const { filePath } = req.body;

  if (!filePath) {
    return res.status(400).json({ error: 'filePath is required' });
  }

  try {
    const { data, error } = await supabaseAdmin.storage
      .from('images')
      .createSignedUrl(filePath, 60); // URL is valid for 60 seconds

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: 'File not found or could not generate URL' });
    }

    return res.status(200).json({ signedUrl: data.signedUrl });
  } catch (error: any) {
    console.error('Error creating signed URL:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
