const STOPWORDS = new Set([
  '그리고',
  '하지만',
  '그런데',
  '너무',
  '정말',
  '조금',
  '많이',
  '관련',
  '지원',
  '사업',
  '학생',
  '상황',
  '문제',
  '때문',
  '있어요',
  '있음',
  '해요',
  '같아요',
  '싶어요',
  '어려워요',
  '힘들어요',
]);

const KOREAN_SUFFIXES = [
  '으로부터',
  '에게서',
  '이라서',
  '라서',
  '에서',
  '으로',
  '에게',
  '한테',
  '보다',
  '까지',
  '부터',
  '처럼',
  '같은',
  '같다',
  '필요함',
  '필요한',
  '필요해',
  '상담이',
  '지원이',
  '문제가',
  '위기가',
  '어려움',
  '어려워',
  '힘들어',
  '이라',
  '에서',
  '으로',
  '하다',
  '해야',
  '해요',
  '임',
  '함',
  '이',
  '가',
  '은',
  '는',
  '을',
  '를',
  '도',
  '만',
  '에',
  '와',
  '과',
];

export const normalizeRecommendationText = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[\n\r\t]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const stripSuffixes = (term) => {
  let current = term;

  for (const suffix of KOREAN_SUFFIXES) {
    if (current.length - suffix.length < 2) continue;
    if (current.endsWith(suffix)) {
      current = current.slice(0, -suffix.length);
      break;
    }
  }

  return current;
};

export const extractSearchTerms = (text) => {
  const normalized = normalizeRecommendationText(text);

  if (!normalized) return [];

  const rawTerms = normalized
    .split(' ')
    .map((term) => term.trim())
    .filter((term) => term.length >= 2 && !STOPWORDS.has(term));

  const variants = rawTerms.flatMap((term) => {
    const stripped = stripSuffixes(term);
    const result = [term];

    if (stripped.length >= 2 && stripped !== term) {
      result.push(stripped);
    }

    if (term.length >= 4) {
      result.push(term.slice(0, Math.max(2, term.length - 1)));
    }

    return result;
  });

  return [...new Set(variants.filter((term) => term.length >= 2))];
};

export const getProgramTextMatch = (program, searchTerms, organizationName) => {
  if (!searchTerms.length) {
    return { score: 0, matchedTerms: [] };
  }

  const fields = {
    name: normalizeRecommendationText(program.name),
    description: normalizeRecommendationText(program.description),
    organization: normalizeRecommendationText(
      organizationName || program.organization
    ),
    tags: normalizeRecommendationText(
      Array.isArray(program.tags) ? program.tags.join(' ') : ''
    ),
  };
  const compactFields = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, value.replace(/\s+/g, '')])
  );

  const matchedTerms = [];
  let score = 0;

  searchTerms.forEach((term) => {
    let matched = false;
    const compactTerm = term.replace(/\s+/g, '');

    if (fields.name.includes(term) || compactFields.name.includes(compactTerm)) {
      score += 28;
      matched = true;
    } else if (fields.tags.includes(term) || compactFields.tags.includes(compactTerm)) {
      score += 22;
      matched = true;
    } else if (
      fields.description.includes(term) ||
      compactFields.description.includes(compactTerm)
    ) {
      score += 16;
      matched = true;
    } else if (
      fields.organization.includes(term) ||
      compactFields.organization.includes(compactTerm)
    ) {
      score += 10;
      matched = true;
    }

    if (matched) {
      matchedTerms.push(term);
    }
  });

  return {
    score,
    matchedTerms: [...new Set(matchedTerms)],
  };
};
