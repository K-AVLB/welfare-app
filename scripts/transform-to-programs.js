import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function firstValue(value) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function splitThemes(value) {
  const text = firstValue(value);
  if (!text) return [];
  return text
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

async function main() {
  const { data, error } = await supabase
    .from('api_programs_raw')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('raw 조회 실패:', error);
    return;
  }

  console.log('raw 개수:', data.length);

  for (const item of data) {
    const payload = item.payload || {};

    const normalized = {
      raw_id: item.id,
      source_key: item.source_key,
      service_id: firstValue(payload.servId),
      service_name: firstValue(payload.servNm),
      ministry_name: firstValue(payload.jurMnofNm),
      department_name: firstValue(payload.jurOrgNm),
      summary: firstValue(payload.servDgst),
      contact: firstValue(payload.rprsCtadr),
      support_cycle: firstValue(payload.sprtCycNm),
      support_type: firstValue(payload.srvPvsnNm),
      online_apply_yn: firstValue(payload.onapPsbltYn),
      detail_link: firstValue(payload.servDtlLink),
      first_registered_at: firstValue(payload.svcfrstRegTs),
      themes: splitThemes(payload.intrsThemaArray)
    };

    const { error: upsertError } = await supabase
      .from('api_programs_normalized')
      .upsert([normalized], { onConflict: 'raw_id' });

    if (upsertError) {
      console.error('정규화 저장 실패:', item.source_key, upsertError);
    } else {
      console.log('정규화 저장:', normalized.service_name);
    }
  }

  console.log('정규화 완료');
}

main();