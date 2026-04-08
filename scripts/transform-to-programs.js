import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TAG_CATEGORY = '복지로 분류';
const SUPPORT_TAG_CATEGORY = '지원영역';
const MAX_RETRIES = Number(process.env.SUPABASE_MAX_RETRIES || 3);
const RETRY_DELAY_MS = Number(process.env.SUPABASE_RETRY_DELAY_MS || 1200);
const DETAIL_FETCH_DELAY_MS = Number(process.env.BOKJIRO_DETAIL_FETCH_DELAY_MS || 120);
const DETAIL_FETCH_TIMEOUT_MS = Number(process.env.BOKJIRO_DETAIL_FETCH_TIMEOUT_MS || 12000);
const SUPPORT_TAGS = [
  '학습지원',
  '진로지원',
  '돌봄·건강·안전지원',
  '심리·정서지원',
  '복지지원',
];
const ALWAYS_ALLOWED_MINISTRIES = new Set([
  '교육부',
  '보건복지부',
  '성평등가족부',
  '통일부',
]);
const CONDITIONALLY_ALLOWED_MINISTRIES = new Set([
  '고용노동부',
  '과학기술정보통신부',
  '문화체육관광부',
  '질병관리청',
  '행정안전부',
]);
const ALWAYS_EXCLUDED_MINISTRIES = new Set([
  '해양수산부',
  '농림축산식품부',
  '산림청',
  '금융위원회',
  '중소벤처기업부',
  '국가보훈부',
  '국토교통부',
  '환경부',
  '기획재정부',
  '대검찰청',
  '산업통상부',
  '기후에너지환경부',
  '방송통신위원회',
]);
const DETAILED_TAG_RULES = {
  북한이탈주민: ['통일부', '탈북', '북한이탈', '정착지원'],
  학교밖청소년: ['학교밖', '검정고시', '꿈드림'],
  특수교육대상자: ['특수교육'],
  다문화: ['다문화', '이주배경', '결혼이민', '외국인주민'],
  난민: ['난민'],
  한부모: ['한부모'],
  법정한부모: ['한부모가족'],
  장애: ['장애', '발달장애', '장애인'],
  질병: ['질환', '의료급여', '건강검진', '검진', '치료', '재활'],
  기초생활수급자: ['기초생활수급', '생계급여'],
  법정차상위: ['차상위'],
  기타저소득: ['저소득'],
  결식: ['급식', '결식'],
  비만: ['비만'],
  우울: ['우울'],
  불안: ['불안'],
  무기력: ['무기력'],
  학업중단위기: ['학업중단', '학교중단'],
  기초학습부족: ['기초학습'],
  교과부족: ['학습부진', '학업부진'],
};
const ALLOWED_THEMES = new Set([
  '교육',
  '보호·돌봄',
  '신체건강',
  '정신건강',
  '안전·위기',
  '보육',
  '입양·위탁',
]);
const STUDENT_FOCUS_KEYWORDS = [
  '학생',
  '청소년',
  '아동',
  '영유아',
  '유아',
  '학교',
  '학교밖',
  '학습',
  '학업',
  '교육',
  '장학',
  '진로',
  '상담',
  '심리',
  '정서',
  '돌봄',
  '보육',
  '육아',
  '안전',
  '보호',
  '위기',
  '자립',
  '방과후',
  '늘봄',
  '특수교육',
  '드림스타트',
  '다문화가족 자녀',
  '입양',
  '위탁',
];
const EXCLUDED_KEYWORDS = [
  '노인',
  '고령',
  '산재근로자',
  '근로자',
  '농업인',
  '어업인',
  '소상공인',
  '제대군인',
  '국가유공자',
  '독립유공자',
  '보훈',
  '고엽제',
  '진폐',
  '한센인',
  '영주귀국',
  '사할린',
  '임산부',
  '산모',
  '여성기업',
  '창업농',
  '청년도약계좌',
  '청년월세',
  '노후',
  '연금',
];
const CHILD_CONTEXT_KEYWORDS = [
  '아동',
  '자녀',
  '청소년',
  '학생',
  '영유아',
  '유아',
  '초등학생',
  '중학생',
  '고등학생',
  '학교밖',
  '학교 밖',
];
const FEMALE_GENDER_KEYWORDS = ['여성', '여학생', '여아'];
const MALE_GENDER_KEYWORDS = ['남성', '남학생', '남아'];
const detailMetadataCache = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error) {
  if (!error) return false;
  const message = String(error.message || error);
  return (
    message.includes('502') ||
    message.includes('Bad gateway') ||
    message.includes('statement timeout')
  );
}

async function withRetry(label, action) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error) || attempt === MAX_RETRIES) {
        throw error;
      }

      const delay = RETRY_DELAY_MS * attempt;
      console.warn(
        `${label} 실패 (${attempt}/${MAX_RETRIES}): ${error.message}. ${delay}ms 후 재시도합니다.`
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

function getOrganizationName(row) {
  const parts = [row.ministry_name, row.department_name]
    .map((value) => (value || '').trim())
    .filter(Boolean);

  return parts.join(' ') || '미분류 기관';
}

function normalizeText(value) {
  return (value || '').trim();
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&gt;/gi, '>')
    .replace(/&lt;/gi, '<')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripHtml(value) {
  return decodeHtmlEntities(String(value || ''))
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDetailPayloadFromHtml(html) {
  const match = html.match(/"dmWlfareInfo":"((?:\\.|[^"])*)"/);
  if (!match) return null;

  try {
    const decodedJson = JSON.parse(`"${match[1]}"`);
    return JSON.parse(decodedJson);
  } catch (error) {
    console.warn('복지로 상세 JSON 파싱 실패:', error.message);
    return null;
  }
}

function toAgeRange(minAge, maxAge) {
  return {
    min_age: Number.isFinite(minAge) ? minAge : null,
    max_age: Number.isFinite(maxAge) ? maxAge : null,
  };
}

function parseAgeRangeFromText(text) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return toAgeRange(null, null);
  }

  let match = normalized.match(/만?\s*(\d{1,2})\s*[~\-]\s*(\d{1,2})\s*세/);
  if (match) {
    return toAgeRange(Number(match[1]), Number(match[2]));
  }

  match = normalized.match(/만?\s*(\d{1,2})\s*세\s*이상\s*(\d{1,2})\s*세\s*(?:이하|미만)/);
  if (match) {
    return toAgeRange(Number(match[1]), Number(match[2]));
  }

  match = normalized.match(/만?\s*(\d{1,2})\s*세\s*(?:이하|미만)/);
  if (match) {
    const maxAge = Number(match[1]);
    return toAgeRange(0, normalized.includes('미만') ? maxAge - 1 : maxAge);
  }

  match = normalized.match(/만?\s*(\d{1,2})\s*세\s*이상/);
  if (match) {
    return toAgeRange(Number(match[1]), null);
  }

  return toAgeRange(null, null);
}

function getChildContextSegments(text) {
  return String(text || '')
    .split(/[\n.;]/)
    .map((segment) => segment.trim())
    .filter(
      (segment) =>
        segment &&
        CHILD_CONTEXT_KEYWORDS.some((keyword) => segment.includes(keyword))
    );
}

function extractChildAgeRangesFromSegment(segment) {
  const ranges = [];
  const childPattern = '(?:자녀|아동|청소년|학생|영유아|유아|학교밖|학교 밖)';
  const patterns = [
    new RegExp(`(\\d{1,2})\\s*세\\s*이상\\s*(\\d{1,2})\\s*세\\s*(?:이하|미만)\\s*(?:의\\s*)?${childPattern}`, 'g'),
    new RegExp(`(\\d{1,2})\\s*[~\\-]\\s*(\\d{1,2})\\s*세(?:\\s*의)?\\s*${childPattern}`, 'g'),
    new RegExp(`(\\d{1,2})\\s*세\\s*(?:이하|미만)\\s*(?:의\\s*)?${childPattern}`, 'g'),
  ];

  patterns.forEach((pattern, index) => {
    let match;
    while ((match = pattern.exec(segment)) !== null) {
      if (index === 0 || index === 1) {
        ranges.push(toAgeRange(Number(match[1]), Number(match[2])));
      } else {
        const maxAge = Number(match[1]);
        ranges.push(
          toAgeRange(0, segment.slice(match.index, pattern.lastIndex).includes('미만') ? maxAge - 1 : maxAge)
        );
      }
    }
  });

  return ranges;
}

function mergeAgeRanges(ranges) {
  const minValues = ranges
    .map((range) => range.min_age)
    .filter((value) => Number.isFinite(value));
  const maxValues = ranges
    .map((range) => range.max_age)
    .filter((value) => Number.isFinite(value));

  return {
    min_age: minValues.length > 0 ? Math.min(...minValues) : null,
    max_age: maxValues.length > 0 ? Math.max(...maxValues) : null,
  };
}

function extractAgeRange(detail) {
  const targetSegments = getChildContextSegments(detail.targetText);
  const segmentRanges = targetSegments
    .flatMap((segment) => extractChildAgeRangesFromSegment(segment))
    .filter(
      (range) =>
        Number.isFinite(range.min_age) || Number.isFinite(range.max_age)
    );

  if (segmentRanges.length > 0) {
    return mergeAgeRanges(segmentRanges);
  }

  const ageGroupRange = parseAgeRangeFromText(detail.ageGroup);
  if (
    Number.isFinite(ageGroupRange.min_age) ||
    Number.isFinite(ageGroupRange.max_age)
  ) {
    return ageGroupRange;
  }

  return toAgeRange(null, null);
}

function extractGender(detail) {
  const text = [detail.ageGroup, detail.targetText, detail.selectionText]
    .map(normalizeText)
    .join(' ');

  const hasFemale = FEMALE_GENDER_KEYWORDS.some((keyword) => text.includes(keyword));
  const hasMale = MALE_GENDER_KEYWORDS.some((keyword) => text.includes(keyword));

  if (hasFemale && !hasMale) return '여';
  if (hasMale && !hasFemale) return '남';
  return '무관';
}

function extractSchoolLevel(detail) {
  const text = [detail.ageGroup, detail.targetText, detail.selectionText]
    .map(normalizeText)
    .join(' ');
  const schoolLevels = new Set();

  if (/초등학생|초등학교/.test(text)) schoolLevels.add('초등');
  if (/중학생|중학교/.test(text)) schoolLevels.add('중등');
  if (/고등학생|고등학교/.test(text)) schoolLevels.add('고등');
  if (/학교밖|학교 밖|검정고시/.test(text)) schoolLevels.add('학교밖');

  return schoolLevels.size === 1 ? [...schoolLevels][0] : '무관';
}

async function fetchProgramEligibilityMetadata(row) {
  const detailLink = normalizeText(row.detail_link);
  if (!detailLink) {
    return {
      min_age: null,
      max_age: null,
      gender: '무관',
      school_level: '무관',
    };
  }

  if (detailMetadataCache.has(detailLink)) {
    return detailMetadataCache.get(detailLink);
  }

  const metadata = await withRetry(`복지로 상세 조회:${row.service_name}`, async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DETAIL_FETCH_TIMEOUT_MS);
    let response;

    try {
      response = await fetch(detailLink, {
        headers: {
          'user-agent': 'Mozilla/5.0',
          'accept-language': 'ko-KR,ko;q=0.9',
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(`상세 페이지 조회 실패(${response.status})`);
    }

    const html = await response.text();
    const payload = extractDetailPayloadFromHtml(html);

    if (!payload) {
      return {
        min_age: null,
        max_age: null,
        gender: '무관',
        school_level: '무관',
      };
    }

    const detail = {
      ageGroup: stripHtml(payload.wlfareInfoAggrpCdnm),
      targetText: stripHtml(payload.wlfareSprtTrgtCn),
      selectionText: stripHtml(payload.wlfareSprtTrgtSlcrCn),
    };
    const ageRange = extractAgeRange(detail);

    return {
      min_age: ageRange.min_age,
      max_age: ageRange.max_age,
      gender: extractGender(detail),
      school_level: extractSchoolLevel(detail),
    };
  });

  detailMetadataCache.set(detailLink, metadata);
  await sleep(DETAIL_FETCH_DELAY_MS);
  return metadata;
}

function buildDescription(row) {
  const parts = [];

  if (normalizeText(row.summary)) {
    parts.push(normalizeText(row.summary));
  }

  if (normalizeText(row.support_type)) {
    parts.push(`지원 방식: ${normalizeText(row.support_type)}`);
  }

  if (normalizeText(row.support_cycle)) {
    parts.push(`지원 주기: ${normalizeText(row.support_cycle)}`);
  }

  if (normalizeText(row.detail_link)) {
    parts.push(`상세 안내: ${normalizeText(row.detail_link)}`);
  }

  return parts.join('\n');
}

function getProgramKey(name, organizationName) {
  return `${normalizeText(name)}::${normalizeText(organizationName)}`;
}

function normalizeForMatch(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[·.,()\-_/]/g, '');
}

function getSupportTags(row) {
  const text = [
    row.service_name,
    row.summary,
    row.support_type,
    row.ministry_name,
    row.department_name,
    ...(row.themes || []),
  ]
    .map(normalizeText)
    .join(' ')
    .toLowerCase();

  const supportTags = [];
  const themes = new Set((row.themes || []).map(normalizeText));

  const hasLearningMatch =
    themes.has('교육') ||
    ['학습', '학업', '교육', '학교', '학교밖', '검정고시', '장학', '특수교육', '방과후', '늘봄'].some(
      (keyword) => text.includes(keyword.toLowerCase())
    );

  const hasCareerMatch =
    themes.has('일자리') ||
    ['진로', '취업', '직업', '직무', '훈련', '자립', '일자리', '근로', '창업'].some(
      (keyword) => text.includes(keyword.toLowerCase())
    );

  const hasCareMatch =
    ['보호·돌봄', '신체건강', '안전·위기', '보육', '입양·위탁'].some((theme) =>
      themes.has(theme)
    ) ||
    [
      '돌봄',
      '보육',
      '양육',
      '건강',
      '의료',
      '질병',
      '예방',
      '급식',
      '안전',
      '보호',
      '위기',
      '입양',
      '위탁',
      '재활',
      '언어발달',
    ].some((keyword) => text.includes(keyword.toLowerCase()));

  const hasEmotionMatch =
    themes.has('정신건강') ||
    ['심리', '정서', '상담', '우울', '불안', '중독', '자살', '회복', '치료'].some(
      (keyword) => text.includes(keyword.toLowerCase())
    );

  const hasWelfareMatch =
    ['생활지원', '서민금융', '주거', '법률', '임신·출산', '문화·여가', '에너지'].some((theme) =>
      themes.has(theme)
    ) ||
    [
      '복지',
      '지원',
      '수당',
      '급여',
      '보험료',
      '바우처',
      '주거',
      '금융',
      '저소득',
      '한부모',
      '다문화',
      '장애',
      '북한이탈',
      '난민',
    ].some((keyword) => text.includes(keyword.toLowerCase()));

  if (hasLearningMatch) supportTags.push('학습지원');
  if (hasCareerMatch) supportTags.push('진로지원');
  if (hasCareMatch) supportTags.push('돌봄·건강·안전지원');
  if (hasEmotionMatch) supportTags.push('심리·정서지원');
  if (hasWelfareMatch || supportTags.length === 0) supportTags.push('복지지원');

  return [...new Set(supportTags)];
}

function getDetailedTags(row) {
  const rawText = [
    row.service_name,
    row.summary,
    row.support_type,
    row.ministry_name,
    row.department_name,
    ...(row.themes || []),
  ]
    .map(normalizeText)
    .join(' ');
  const matchText = normalizeForMatch(rawText);
  const detailedTags = [];

  for (const [tagName, keywords] of Object.entries(DETAILED_TAG_RULES)) {
    const candidates = [...keywords, tagName]
      .map(normalizeForMatch)
      .filter(Boolean);

    if (candidates.some((keyword) => matchText.includes(keyword))) {
      detailedTags.push(tagName);
    }
  }

  return [...new Set(detailedTags)];
}

function isStudentWelfareProgram(row) {
  const text = [
    row.service_name,
    row.summary,
    row.support_type,
    row.ministry_name,
    row.department_name,
    ...(row.themes || []),
  ]
    .map(normalizeText)
    .join(' ')
    .toLowerCase();

  const hasExcludedKeyword = EXCLUDED_KEYWORDS.some((keyword) =>
    text.includes(keyword.toLowerCase())
  );
  if (hasExcludedKeyword) {
    return false;
  }

  const ministryName = normalizeText(row.ministry_name);
  if (ALWAYS_EXCLUDED_MINISTRIES.has(ministryName)) {
    return false;
  }

  const hasStudentKeyword = STUDENT_FOCUS_KEYWORDS.some((keyword) =>
    text.includes(keyword.toLowerCase())
  );
  const hasAllowedTheme = (row.themes || []).some((theme) =>
    ALLOWED_THEMES.has(normalizeText(theme))
  );
  const hasStrongStudentEvidence =
    hasStudentKeyword ||
    ['청소년', '아동', '영유아', '유아', '학교밖', '특수교육', '검정고시', '드림스타트'].some(
      (keyword) => text.includes(keyword.toLowerCase())
    );

  if (ALWAYS_ALLOWED_MINISTRIES.has(ministryName)) {
    return hasStudentKeyword || hasAllowedTheme;
  }

  if (CONDITIONALLY_ALLOWED_MINISTRIES.has(ministryName)) {
    return hasStrongStudentEvidence;
  }

  return false;
}

function dedupeRowsByProgramKey(rows) {
  const deduped = new Map();

  for (const row of [...rows].sort((a, b) => (b.raw_id || 0) - (a.raw_id || 0))) {
    const key = getProgramKey(row.service_name, getOrganizationName(row));

    if (!deduped.has(key)) {
      deduped.set(key, row);
    }
  }

  return [...deduped.values()].sort((a, b) => (a.raw_id || 0) - (b.raw_id || 0));
}

async function fetchNormalizedPrograms() {
  const { data, error } = await withRetry('정규화 데이터 조회', () =>
    supabase
      .from('api_programs_normalized')
      .select('*')
      .order('raw_id', { ascending: true })
  );

  if (error) {
    throw new Error(`정규화 데이터 조회 실패: ${error.message}`);
  }

  return data || [];
}

async function fetchOrganizations() {
  const { data, error } = await withRetry('기관 조회', () =>
    supabase.from('organizations').select('id, name, phone, address, contact_person')
  );

  if (error) {
    throw new Error(`기관 조회 실패: ${error.message}`);
  }

  return data || [];
}

async function fetchPrograms() {
  const { data, error } = await withRetry('사업 조회', () =>
    supabase.from('programs').select('id, name, organization, organization_id')
  );

  if (error) {
    throw new Error(`사업 조회 실패: ${error.message}`);
  }

  return data || [];
}

async function fetchTags() {
  const { data, error } = await withRetry('태그 조회', () =>
    supabase.from('tags').select('id, name, category, is_active')
  );

  if (error) {
    throw new Error(`태그 조회 실패: ${error.message}`);
  }

  return data || [];
}

async function syncTags(rows) {
  const existingTags = await fetchTags();
  const existingTagNames = new Set(existingTags.map((tag) => tag.name));
  const themeNames = new Set(SUPPORT_TAGS);

  for (const row of rows) {
    for (const theme of row.themes || []) {
      if (normalizeText(theme)) {
        themeNames.add(normalizeText(theme));
      }
    }
  }

  const missingThemeNames = [...themeNames].filter(
    (name) => !existingTagNames.has(name)
  );

  if (missingThemeNames.length === 0) {
    console.log('추가할 API 태그가 없습니다.');
    return;
  }

  const payload = missingThemeNames.map((name) => ({
    name,
    category: SUPPORT_TAGS.includes(name) ? SUPPORT_TAG_CATEGORY : TAG_CATEGORY,
    is_active: true,
  }));

  const { error } = await withRetry('태그 추가', () =>
    supabase.from('tags').insert(payload)
  );

  if (error) {
    throw new Error(`태그 추가 실패: ${error.message}`);
  }

  console.log(`API 태그 ${payload.length}건 추가`);
}

async function syncOrganizations(rows) {
  const existingOrganizations = await fetchOrganizations();
  const organizationMap = new Map(
    existingOrganizations.map((organization) => [organization.name, organization])
  );

  for (const row of rows) {
    const name = getOrganizationName(row);
    const phone = normalizeText(row.contact);

    if (organizationMap.has(name)) {
      const existing = organizationMap.get(name);

      if (phone && phone !== existing.phone) {
        const { data, error } = await withRetry(`기관 업데이트:${name}`, () =>
          supabase
            .from('organizations')
            .update({ phone })
            .eq('id', existing.id)
            .select()
            .single()
        );

        if (error) {
          throw new Error(`기관 업데이트 실패(${name}): ${error.message}`);
        }

        organizationMap.set(name, data);
      }

      continue;
    }

    const payload = {
      name,
      phone,
      address: '',
      contact_person: '',
    };

    const { data, error } = await withRetry(`기관 추가:${name}`, () =>
      supabase.from('organizations').insert(payload).select().single()
    );

    if (error) {
      throw new Error(`기관 추가 실패(${name}): ${error.message}`);
    }

    organizationMap.set(name, data);
    console.log('기관 추가:', name);
  }

  return organizationMap;
}

async function syncPrograms(rows, organizationMap) {
  const existingPrograms = await fetchPrograms();
  const programMap = new Map(
    existingPrograms.map((program) => [
      getProgramKey(program.name, program.organization),
      program,
    ])
  );

  let insertedCount = 0;
  let updatedCount = 0;

  for (const row of rows) {
    const organizationName = getOrganizationName(row);
    const organization = organizationMap.get(organizationName);
    const key = getProgramKey(row.service_name, organizationName);
    const eligibilityMetadata = await fetchProgramEligibilityMetadata(row);
    const payload = {
      name: normalizeText(row.service_name),
      organization: organizationName,
      organization_id: organization?.id || null,
      phone: normalizeText(row.contact),
      description: buildDescription(row),
      tags: [
        ...getDetailedTags(row),
        ...getSupportTags(row),
        ...(row.themes || []).map(normalizeText).filter(Boolean),
      ].filter(Boolean),
      priority: null,
      min_age: eligibilityMetadata.min_age,
      max_age: eligibilityMetadata.max_age,
      gender: eligibilityMetadata.gender,
      school_level: eligibilityMetadata.school_level,
    };

    if (programMap.has(key)) {
      const existing = programMap.get(key);
      const { data, error } = await withRetry(`사업 업데이트:${row.service_name}`, () =>
        supabase
          .from('programs')
          .update(payload)
          .eq('id', existing.id)
          .select('id, name, organization, organization_id')
          .single()
      );

      if (error) {
        throw new Error(`사업 업데이트 실패(${row.service_name}): ${error.message}`);
      }

      programMap.set(key, data);
      updatedCount += 1;
      continue;
    }

    const { data, error } = await withRetry(`사업 추가:${row.service_name}`, () =>
      supabase
        .from('programs')
        .insert(payload)
        .select('id, name, organization, organization_id')
        .single()
    );

    if (error) {
      throw new Error(`사업 추가 실패(${row.service_name}): ${error.message}`);
    }

    programMap.set(key, data);
    insertedCount += 1;
  }

  console.log(`사업 추가 ${insertedCount}건`);
  console.log(`사업 업데이트 ${updatedCount}건`);
}

async function removeExcludedPrograms(allRows, filteredRows) {
  const existingPrograms = await fetchPrograms();
  const allApiKeys = new Set(
    allRows.map((row) => getProgramKey(row.service_name, getOrganizationName(row)))
  );
  const allowedKeys = new Set(
    filteredRows.map((row) => getProgramKey(row.service_name, getOrganizationName(row)))
  );

  const deleteIds = existingPrograms
    .filter((program) => {
      const key = getProgramKey(program.name, program.organization);
      return allApiKeys.has(key) && !allowedKeys.has(key);
    })
    .map((program) => program.id);

  if (deleteIds.length === 0) {
    console.log('삭제할 제외 사업이 없습니다.');
    return;
  }

  const { error } = await withRetry('제외 사업 삭제', () =>
    supabase.from('programs').delete().in('id', deleteIds)
  );

  if (error) {
    throw new Error(`제외 사업 삭제 실패: ${error.message}`);
  }

  console.log(`제외 사업 ${deleteIds.length}건 삭제`);
}

async function removeUnusedImportedOrganizations(allRows) {
  const apiOrganizationNames = [...new Set(allRows.map((row) => getOrganizationName(row)))];
  const organizations = await fetchOrganizations();
  const programs = await fetchPrograms();
  const activeOrganizationIds = new Set(
    programs.map((program) => program.organization_id).filter(Boolean)
  );
  const deleteIds = organizations
    .filter(
      (organization) =>
        apiOrganizationNames.includes(organization.name) &&
        !activeOrganizationIds.has(organization.id)
    )
    .map((organization) => organization.id);

  if (deleteIds.length === 0) {
    console.log('삭제할 제외 기관이 없습니다.');
    return;
  }

  const { error } = await withRetry('제외 기관 삭제', () =>
    supabase.from('organizations').delete().in('id', deleteIds)
  );

  if (error) {
    throw new Error(`제외 기관 삭제 실패: ${error.message}`);
  }

  console.log(`제외 기관 ${deleteIds.length}건 삭제`);
}

async function main() {
  const rows = await fetchNormalizedPrograms();
  const filteredRows = dedupeRowsByProgramKey(rows.filter(isStudentWelfareProgram));

  console.log('정규화 사업 개수:', rows.length);
  console.log('학생 복지 필터 적용 개수:', filteredRows.length);

  if (filteredRows.length === 0) {
    console.log('동기화할 데이터가 없습니다.');
    return;
  }

  await syncTags(filteredRows);
  const organizationMap = await syncOrganizations(filteredRows);
  await syncPrograms(filteredRows, organizationMap);
  await removeExcludedPrograms(rows, filteredRows);
  await removeUnusedImportedOrganizations(rows);

  console.log('programs / organizations 동기화 완료');
}

main().catch((error) => {
  console.error('실행 오류:', error);
  process.exitCode = 1;
});
