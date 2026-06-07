import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://gyulikltojhxymkvlyih.supabase.co';
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY || 'sb_publishable_Lb4FoVS7RBBuFSEUfOXCLw_lNCKan9x';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
