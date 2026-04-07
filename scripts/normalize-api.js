import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

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
    .map((item) => item.trim())
    .filter(Boolean);
}

const run = async () => {
  const { data, error } = await supabase
    .from('api_programs_raw')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('조회 실패:', error);
    return;
  }

  console.log('raw 개수:', data.length);
  console.log('raw 첫 행:', JSON.stringify(data[0], null, 2));

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
      themes: splitThemes(payload.intrsThemaArray),
    };

    const { data: existing, error: selectError } = await supabase
      .from('api_programs_normalized')
      .select('id')
      .eq('raw_id', item.id)
      .maybeSingle();

    if (selectError) {
      console.error('기존 정규화 데이터 조회 실패:', item.id, selectError);
      continue;
    }

    const operation = existing
      ? supabase
          .from('api_programs_normalized')
          .update(normalized)
          .eq('id', existing.id)
      : supabase.from('api_programs_normalized').insert(normalized);

    const { error: insertError } = await operation;

    if (insertError) {
      console.error('저장 실패:', insertError);
    } else {
      console.log('정규화 저장:', normalized.service_name);
    }
  }

  console.log('정규화 완료');
};

run();
