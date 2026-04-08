import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import { splitProgramDescription } from '../src/utils/programDetail.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const OUTPUT_DIR = path.resolve(process.cwd(), 'exports');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'student-welfare-excel-tool.xlsx');

function text(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function tagText(tags) {
  return Array.isArray(tags) ? tags.filter(Boolean).join(', ') : '';
}

function buildSearchText(program) {
  return [
    text(program.name),
    text(program.organization),
    text(program.phone),
    tagText(program.tags),
    text(program.description),
  ]
    .filter(Boolean)
    .join(' ');
}

function addSheet(workbook, name, rows, widths = []) {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  if (widths.length > 0) {
    sheet['!cols'] = widths.map((wch) => ({ wch }));
  }
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

function createGuideRows() {
  return [
    ['학생복지이음 서비스 엑셀판'],
    [''],
    ['이 파일은 웹 서비스의 현장 운영용 엑셀 버전입니다.'],
    ['복잡한 자동 추천 대신, 입력-필터-정렬 방식으로 단순화했습니다.'],
    [''],
    ['사용 방법'],
    ['1. 입력 시트에 나이, 성별, 학령, 태그, 키워드를 적습니다.'],
    ['2. 추천필터 시트에서 각 행의 통과 여부와 점수를 확인합니다.'],
    ['3. 총점 열을 기준으로 내림차순 정렬합니다.'],
    ['4. 총점이 높고 필터통과가 1인 사업을 우선 검토합니다.'],
    [''],
    ['입력 규칙'],
    ['- 성별: 남 / 여 / 공란'],
    ['- 학령: 초등 / 중등 / 고등 / 학교밖 / 공란'],
    ['- 태그: 최대 5개까지 입력'],
    ['- 키워드: 최대 3개까지 입력'],
    [''],
    ['주의'],
    ['- 개인정보 원문을 저장하지 않는 용도로만 사용하세요.'],
    ['- 이 파일은 Excel/Numbers 호환성을 위해 수식을 단순화했습니다.'],
  ];
}

function createInputRows() {
  return [
    ['항목', '값', '설명'],
    ['나이', '', '숫자만 입력'],
    ['성별', '', '남 / 여 / 공란'],
    ['학령', '', '초등 / 중등 / 고등 / 학교밖 / 공란'],
    ['상황 메모', '', '상담 메모용'],
    [''],
    ['태그1', '', '예: 다문화'],
    ['태그2', '', '예: 경제적어려움'],
    ['태그3', '', '예: 조부모가정'],
    ['태그4', '', '필요 시 입력'],
    ['태그5', '', '필요 시 입력'],
    [''],
    ['키워드1', '', '설명 검색용'],
    ['키워드2', '', '설명 검색용'],
    ['키워드3', '', '설명 검색용'],
  ];
}

function createOrgRows(organizations) {
  return [
    ['기관명', '전화', '주소', '담당자'],
    ...organizations.map((org) => [
      text(org.name),
      text(org.phone),
      text(org.address),
      text(org.contact_person),
    ]),
  ];
}

function createProgramRows(programs) {
  return [
    ['사업명', '기관명', '전화', '최소연령', '최대연령', '성별', '학령', '태그', '설명', '상세링크', '검색텍스트'],
    ...programs.map((program) => {
      const { summary, detailLink } = splitProgramDescription(program.description || '');
      return [
        text(program.name),
        text(program.organization),
        text(program.phone),
        program.min_age ?? '',
        program.max_age ?? '',
        text(program.gender || '무관'),
        text(program.school_level || '무관'),
        tagText(program.tags),
        text(summary),
        text(detailLink),
        buildSearchText({ ...program, description: summary }),
      ];
    }),
  ];
}

function createFilterRows(programs) {
  const rows = [[
    '사업명',
    '기관명',
    '전화',
    '최소연령',
    '최대연령',
    '성별',
    '학령',
    '태그',
    '설명',
    '상세링크',
    '연령통과',
    '성별통과',
    '학령통과',
    '태그점수',
    '키워드점수',
    '총점',
  ]];

  for (let i = 0; i < programs.length; i += 1) {
    const row = i + 2;
    rows.push([
      { f: `=사업DB!A${row}` },
      { f: `=사업DB!B${row}` },
      { f: `=사업DB!C${row}` },
      { f: `=사업DB!D${row}` },
      { f: `=사업DB!E${row}` },
      { f: `=사업DB!F${row}` },
      { f: `=사업DB!G${row}` },
      { f: `=사업DB!H${row}` },
      { f: `=사업DB!I${row}` },
      { f: `=사업DB!J${row}` },
      { f: `=IF(입력!B2=\"\",1,IF(AND(D${row}=\"\",E${row}=\"\"),1,IF(AND(D${row}=\"\",입력!B2<=E${row}),1,IF(AND(E${row}=\"\",입력!B2>=D${row}),1,IF(AND(입력!B2>=D${row},입력!B2<=E${row}),1,0)))))` },
      { f: `=IF(OR(입력!B3=\"\",F${row}=\"\",F${row}=\"무관\",F${row}=입력!B3),1,0)` },
      { f: `=IF(OR(입력!B4=\"\",G${row}=\"\",G${row}=\"무관\",G${row}=입력!B4),1,0)` },
      { f: `=IF(입력!B7<>\"\",IF(ISNUMBER(SEARCH(입력!B7,H${row})),100,0),0)+IF(입력!B8<>\"\",IF(ISNUMBER(SEARCH(입력!B8,H${row})),100,0),0)+IF(입력!B9<>\"\",IF(ISNUMBER(SEARCH(입력!B9,H${row})),100,0),0)+IF(입력!B10<>\"\",IF(ISNUMBER(SEARCH(입력!B10,H${row})),100,0),0)+IF(입력!B11<>\"\",IF(ISNUMBER(SEARCH(입력!B11,H${row})),100,0),0)` },
      { f: `=IF(입력!B13<>\"\",IF(ISNUMBER(SEARCH(입력!B13,K${row})),15,0),0)+IF(입력!B14<>\"\",IF(ISNUMBER(SEARCH(입력!B14,K${row})),15,0),0)+IF(입력!B15<>\"\",IF(ISNUMBER(SEARCH(입력!B15,K${row})),15,0),0)` },
      { f: `=IF(AND(K${row}=1,L${row}=1,M${row}=1),N${row}+O${row},-1)` },
    ]);
  }

  return rows;
}

async function fetchPrograms() {
  const { data, error } = await supabase
    .from('programs')
    .select('name, organization, phone, description, tags, min_age, max_age, gender, school_level')
    .order('name', { ascending: true });

  if (error) throw new Error(`사업 조회 실패: ${error.message}`);
  return data || [];
}

async function fetchOrganizations() {
  const { data, error } = await supabase
    .from('organizations')
    .select('name, phone, address, contact_person')
    .order('name', { ascending: true });

  if (error) throw new Error(`기관 조회 실패: ${error.message}`);
  return data || [];
}

async function main() {
  const [programs, organizations] = await Promise.all([
    fetchPrograms(),
    fetchOrganizations(),
  ]);

  const workbook = XLSX.utils.book_new();

  addSheet(workbook, '사용안내', createGuideRows(), [70, 26, 46]);
  addSheet(workbook, '입력', createInputRows(), [16, 26, 34]);
  addSheet(workbook, '기관목록', createOrgRows(organizations), [28, 16, 34, 20]);
  addSheet(workbook, '사업DB', createProgramRows(programs), [34, 28, 16, 10, 10, 10, 12, 45, 70, 48, 90]);
  addSheet(workbook, '추천필터', createFilterRows(programs), [34, 28, 16, 10, 10, 10, 12, 40, 60, 45, 10, 10, 10, 10, 10, 10]);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  XLSX.writeFile(workbook, OUTPUT_PATH, { compression: true });

  console.log(`엑셀 도구 생성 완료: ${OUTPUT_PATH}`);
  console.log(`사업 ${programs.length}건, 기관 ${organizations.length}건 반영`);
}

main().catch((error) => {
  console.error('엑셀 도구 생성 실패:', error);
  process.exitCode = 1;
});
