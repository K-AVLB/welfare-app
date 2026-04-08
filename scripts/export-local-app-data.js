import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { TAG_KEYWORD_MAP, TAG_PATTERN_MAP } from '../src/constants/appData.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const OUTPUT_DIR = path.resolve(process.cwd(), 'local-app', 'data');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'local-app-data.js');

async function fetchPrograms() {
  const { data, error } = await supabase
    .from('programs')
    .select('id, name, organization, organization_id, phone, description, tags, min_age, max_age, gender, school_level')
    .order('name', { ascending: true });

  if (error) throw new Error(`사업 조회 실패: ${error.message}`);
  return data || [];
}

async function fetchOrganizations() {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, phone, address, contact_person')
    .order('name', { ascending: true });

  if (error) throw new Error(`기관 조회 실패: ${error.message}`);
  return data || [];
}

async function fetchTags() {
  const { data, error } = await supabase
    .from('tags')
    .select('id, name, category, is_active')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw new Error(`태그 조회 실패: ${error.message}`);
  return data || [];
}

async function main() {
  const [programs, organizations, tags] = await Promise.all([
    fetchPrograms(),
    fetchOrganizations(),
    fetchTags(),
  ]);

  const payload = {
    generatedAt: new Date().toISOString(),
    programs,
    organizations,
    tags,
    tagKeywordMap: TAG_KEYWORD_MAP,
    tagPatternMap: TAG_PATTERN_MAP,
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(
    OUTPUT_PATH,
    `window.LOCAL_WELFARE_DATA = ${JSON.stringify(payload, null, 2)};\n`,
    'utf8'
  );

  console.log(`로컬 앱 데이터 생성 완료: ${OUTPUT_PATH}`);
  console.log(`사업 ${programs.length}건, 기관 ${organizations.length}건, 태그 ${tags.length}건 반영`);
}

main().catch((error) => {
  console.error('로컬 앱 데이터 생성 실패:', error);
  process.exitCode = 1;
});
