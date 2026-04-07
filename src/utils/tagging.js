import { TAG_KEYWORD_MAP, TAG_PATTERN_MAP } from '../constants/appData';

const SUPPORT_TAG_KEYWORD_MAP = {
  법률: ['법률', '법률상담', '법률지원', '무료법률', '법률구조', '변호사', '소송', '가정폭력', '성폭력피해', '피해자지원'],
  주거: ['주거', '월세', '전세', '임대주택', '주거불안', '주택', '거처', '집이없', '살곳', '보증금'],
  일자리: ['일자리', '취업', '구직', '진로', '직업', '근로', '현장실습', '자립', '장려금'],
  생활지원: ['생활지원', '생계', '생활비', '긴급복지', '급여', '수당', '보험료', '의료비', '양육비', '복지지원'],
  서민금융: ['서민금융', '금융지원', '대출', '채무', '햇살론', '통장', '자산형성'],
  보호·돌봄: ['보호', '돌봄', '양육', '보육', '아이돌봄', '방임', '입양', '위탁', '급식'],
  안전·위기: ['안전', '위기', '폭력', '학대', '자해', '자살', '성폭력', '가정폭력', '학교폭력', '긴급'],
  정신건강: ['정신건강', '상담', '심리', '정서', '우울', '불안', '스트레스', '중독', '회복'],
};

export const normalizeCaseText = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[.,!?]/g, '');

export const createTagExtractor = (validTagNames) => (text) => {
  const normalized = normalizeCaseText(text);
  const found = [];

  const addTag = (tag) => {
    if (!validTagNames.has(tag)) return;
    found.push(tag);
  };

  const hasTag = (tag) => found.includes(tag);

  Object.entries(TAG_KEYWORD_MAP).forEach(([tag, keywords]) => {
    if (!validTagNames.has(tag)) return;

    const matched = keywords.some((keyword) =>
      normalized.includes(normalizeCaseText(keyword))
    );

    if (matched) addTag(tag);
  });

  Object.entries(TAG_PATTERN_MAP).forEach(([tag, patterns]) => {
    if (!validTagNames.has(tag)) return;

    const matched = patterns.some((pattern) =>
      normalized.includes(normalizeCaseText(pattern))
    );

    if (matched) addTag(tag);
  });

  Object.entries(SUPPORT_TAG_KEYWORD_MAP).forEach(([tag, keywords]) => {
    if (!validTagNames.has(tag)) return;

    const matched = keywords.some((keyword) =>
      normalized.includes(normalizeCaseText(keyword))
    );

    if (matched) addTag(tag);
  });

  if (
    (normalized.includes('괴롭') || normalized.includes('따돌') || normalized.includes('왕따')) &&
    (normalized.includes('학교가기싫') || normalized.includes('학교가기가싫') || normalized.includes('등교거부'))
  ) {
    addTag('학교폭력');
    addTag('학업중단위기');
  }

  if (
    (normalized.includes('친구') || normalized.includes('학교')) &&
    (normalized.includes('괴롭') ||
      normalized.includes('때리') ||
      normalized.includes('욕') ||
      normalized.includes('무시') ||
      normalized.includes('놀리') ||
      normalized.includes('따돌') ||
      normalized.includes('왕따'))
  ) {
    addTag('학교폭력');
  }

  if (
    hasTag('학교폭력') &&
    (normalized.includes('무섭') ||
      normalized.includes('불안') ||
      normalized.includes('학교가기싫') ||
      normalized.includes('학교가기무섭'))
  ) {
    addTag('불안');
    addTag('학업중단위기');
  }

  if (normalized.includes('학교가기무서') || normalized.includes('등교하기싫')) {
    addTag('학업중단위기');
  }

  if (normalized.includes('학교가기무서')) {
    addTag('불안');
  }

  if (
    normalized.includes('친구') &&
    (normalized.includes('어렵') ||
      normalized.includes('없') ||
      normalized.includes('힘들') ||
      normalized.includes('위축'))
  ) {
    addTag('불안');
  }

  if (
    normalized.includes('부모') &&
    (normalized.includes('싸우') || normalized.includes('갈등'))
  ) {
    addTag('가정급변');
  }

  if (
    normalized.includes('가정폭력') ||
    (normalized.includes('폭력') && normalized.includes('집'))
  ) {
    addTag('법률');
    addTag('안전·위기');
  }

  if (
    normalized.includes('집안') &&
    normalized.includes('분위기') &&
    (normalized.includes('안좋') || normalized.includes('나쁘'))
  ) {
    addTag('가정급변');
  }

  if (hasTag('학대방임') && (normalized.includes('학교') || normalized.includes('친구'))) {
    const index = found.indexOf('학대방임');
    if (index !== -1) found.splice(index, 1);
  }

  if (normalized.includes('공부') && normalized.includes('스트레스')) {
    addTag('교과부족');
    addTag('우울');
  }

  if (
    normalized.includes('공부') &&
    (normalized.includes('힘들') ||
      normalized.includes('어려') ||
      normalized.includes('버겁'))
  ) {
    addTag('교과부족');
  }

  if (normalized.includes('수업시간') && normalized.includes('집중을못')) {
    addTag('ADHD');
  }

  if (
    normalized.includes('한국어') &&
    (normalized.includes('어려') ||
      normalized.includes('못') ||
      normalized.includes('힘들') ||
      normalized.includes('서툴'))
  ) {
    addTag('다문화');
    addTag('기초학습부족');
  }

  if (
    normalized.includes('다문화') &&
    (normalized.includes('학교') ||
      normalized.includes('적응') ||
      normalized.includes('어려움') ||
      normalized.includes('힘들'))
  ) {
    addTag('다문화');
    addTag('기초학습부족');
  }

  if (
    normalized.includes('기초학습') ||
    normalized.includes('읽기') ||
    normalized.includes('쓰기') ||
    normalized.includes('셈하기')
  ) {
    addTag('기초학습부족');
  }

  if (
    normalized.includes('성적') &&
    (normalized.includes('떨어') || normalized.includes('낮'))
  ) {
    addTag('교과부족');
  }

  if (
    normalized.includes('충동') ||
    normalized.includes('가만히있지못') ||
    normalized.includes('행동문제')
  ) {
    addTag('ADHD');
  }

  if (
    normalized.includes('가족돌보') ||
    normalized.includes('동생돌보') ||
    normalized.includes('동생을돌보') ||
    normalized.includes('부모돌보') ||
    normalized.includes('부모를돌보') ||
    normalized.includes('형제돌보') ||
    normalized.includes('형제를돌보') ||
    normalized.includes('가족돌봄') ||
    normalized.includes('간병') ||
    normalized.includes('돌보느라') ||
    normalized.includes('돌보면서')
  ) {
    addTag('가족돌봄청소년');
  }

  if (
    normalized.includes('동생') &&
    (normalized.includes('키우') || normalized.includes('돌보'))
  ) {
    addTag('가족돌봄청소년');
  }

  if (
    hasTag('가족돌봄청소년') &&
    (normalized.includes('학교') ||
      normalized.includes('학업') ||
      normalized.includes('일상유지') ||
      normalized.includes('어려움') ||
      normalized.includes('힘들'))
  ) {
    addTag('학업중단위기');
    addTag('우울');
  }

  if (
    normalized.includes('수업') &&
    (normalized.includes('따라가기힘들') ||
      normalized.includes('못따라가') ||
      normalized.includes('어려'))
  ) {
    addTag('교과부족');
  }

  if (
    normalized.includes('형편') ||
    normalized.includes('생활비') ||
    normalized.includes('생계') ||
    normalized.includes('경제')
  ) {
    addTag('경제적어려움');
  }

  if (
    normalized.includes('돈') &&
    (normalized.includes('없') ||
      normalized.includes('부족') ||
      normalized.includes('힘들'))
  ) {
    addTag('경제적어려움');
  }

  if (normalized.includes('밥') && normalized.includes('못')) {
    addTag('결식');
  }

  if (hasTag('기타저소득')) {
    addTag('경제적어려움');
  }

  if (
    normalized.includes('또래') ||
    normalized.includes('관계갈등') ||
    normalized.includes('친구갈등') ||
    normalized.includes('위축')
  ) {
    addTag('불안');
  }

  if (
    normalized.includes('학교') &&
    (normalized.includes('가기싫') ||
      normalized.includes('나가기싫') ||
      normalized.includes('가기무섭') ||
      normalized.includes('가기두려') ||
      normalized.includes('결석') ||
      normalized.includes('등교거부'))
  ) {
    addTag('학업중단위기');
  }

  if (normalized.includes('학교나가기싫') || normalized.includes('학교가기싫')) {
    addTag('학업중단위기');
  }

  if (normalized.includes('놀림') && normalized.includes('위축')) {
    addTag('학교폭력');
    addTag('불안');
  }

  if (
    (normalized.includes('살') || normalized.includes('외모')) &&
    (normalized.includes('놀림') ||
      normalized.includes('따돌림') ||
      normalized.includes('괴롭힘') ||
      normalized.includes('괴롭') ||
      normalized.includes('왕따') ||
      normalized.includes('무시'))
  ) {
    addTag('비만');
    addTag('학교폭력');
    addTag('불안');
  }

  if (
    normalized.includes('부모') &&
    (normalized.includes('싸움') || normalized.includes('갈등'))
  ) {
    addTag('가정급변');
    addTag('우울');
  }

  if (
    normalized.includes('부모') &&
    (normalized.includes('집에안계') || normalized.includes('집에안있'))
  ) {
    addTag('부모부재');
  }

  if (
    (normalized.includes('부모') || normalized.includes('가정') || normalized.includes('집')) &&
    (normalized.includes('싸움') ||
      normalized.includes('갈등') ||
      normalized.includes('이혼') ||
      normalized.includes('별거') ||
      normalized.includes('가출') ||
      normalized.includes('폭력'))
  ) {
    addTag('가정급변');
  }

  if (
    normalized.includes('혼자') &&
    (normalized.includes('지냄') ||
      normalized.includes('집') ||
      normalized.includes('시간이많'))
  ) {
    addTag('부모부재');
  }

  if (
    found.length === 0 &&
    (normalized.includes('우울') ||
      normalized.includes('죽고싶') ||
      normalized.includes('의욕없') ||
      normalized.includes('아무것도하기싫') ||
      normalized.includes('기운이없'))
  ) {
    addTag('우울');
  }

  if (
    normalized.includes('무서') ||
    normalized.includes('걱정') ||
    normalized.includes('두려') ||
    normalized.includes('조마조마')
  ) {
    addTag('불안');
  }

  if (
    normalized.includes('아무것도하기싫') ||
    normalized.includes('기운이없') ||
    normalized.includes('움직이기싫')
  ) {
    addTag('무기력');
    addTag('우울');
  }

  if (
    (normalized.includes('친구') || normalized.includes('또래')) &&
    (normalized.includes('폭력') ||
      normalized.includes('폭행') ||
      normalized.includes('맞'))
  ) {
    addTag('학교폭력');
  }

  if (
    normalized.includes('몸이아파') ||
    normalized.includes('아파요') ||
    normalized.includes('몸이안좋')
  ) {
    addTag('질병');
  }

  if (
    normalized.includes('살집이없') ||
    normalized.includes('집이없') ||
    normalized.includes('갈곳이없') ||
    normalized.includes('잘곳이없')
  ) {
    addTag('주거위기');
  }

  if (
    found.includes('우울') &&
    (found.includes('경제적어려움') ||
      found.includes('가족돌봄청소년') ||
      found.includes('다문화') ||
      found.includes('기초학습부족') ||
      found.includes('교과부족') ||
      found.includes('부모부재') ||
      found.includes('가정급변'))
  ) {
    const index = found.indexOf('우울');
    if (index !== -1) found.splice(index, 1);
  }

  return [...new Set(found)];
};
