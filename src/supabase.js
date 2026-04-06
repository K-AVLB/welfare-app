import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oaiukptspaedferkqzqd.supabase.co';
const supabaseKey = 'sb_publishable_8kk_fuqNm_-uqmEdn5xQag_QK4j1YSE';

const authOptions =
  typeof window === 'undefined'
    ? {}
    : {
        persistSession: true,
        storage: window.sessionStorage,
      };

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: authOptions,
});
