import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oaiukptspaedferkqzqd.supabase.co';
const supabaseKey = 'sb_publishable_8kk_fuqNm_-uqmEdn5xQag_QK4j1YSE';

export const supabase = createClient(supabaseUrl, supabaseKey);