import { authConfig } from '../../server/services/supabase.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    return res.status(200).json(authConfig());
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'config_error' });
  }
}
