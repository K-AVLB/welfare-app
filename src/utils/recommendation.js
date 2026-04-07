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

export const normalizeRecommendationText = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[\n\r\t]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const extractSearchTerms = (text) => {
  const normalized = normalizeRecommendationText(text);

  if (!normalized) return [];

  return [
    ...new Set(
      normalized
        .split(' ')
        .map((term) => term.trim())
        .filter((term) => term.length >= 2 && !STOPWORDS.has(term))
    ),
  ];
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

  const matchedTerms = [];
  let score = 0;

  searchTerms.forEach((term) => {
    let matched = false;

    if (fields.name.includes(term)) {
      score += 28;
      matched = true;
    } else if (fields.tags.includes(term)) {
      score += 22;
      matched = true;
    } else if (fields.description.includes(term)) {
      score += 16;
      matched = true;
    } else if (fields.organization.includes(term)) {
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
