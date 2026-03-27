import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import './App1.css';





const CORE_PROBLEM_TAGS = [
  '자살위험',
  '자해위험',
  '학교폭력',
  '학대방임',
  '성폭력',
  '우울',
  '불안',
  '가정급변',
  '분노폭력',
  '학업중단위기'
];

const CONTEXT_TAGS = [
  '한부모',
  '조부모가정',
  '다문화',
  '친척돌봄',
  '기초생활수급자',
  '법정차상위',
  '기타저소득'
];

const CRITICAL_TAGS = ['자해위험', '학대방임', '학교폭력', '자살위험', '성폭력'];

const TAG_WEIGHTS = {
  자살위험: 110,
  자해위험: 105,
  학교폭력: 95,
  학대방임: 100,
  성폭력: 100,

  우울: 70,
  불안: 65,
  분노폭력: 80,
  무기력: 60,

  학업중단위기: 85,
  기초학습부족: 60,
  교과부족: 50,
  ADHD: 55,

  경제적어려움: 45,
  결식: 65,
  기초생활수급자: 40,
  법정차상위: 35,
  기타저소득: 30,

  가정급변: 85,
  부모부재: 80,
  가족돌봄청소년: 90,
  양육환경위기: 75,
  조부모가정: 50,
  친척돌봄: 50,
  한부모: 55,
  시설보호: 85,

  다문화: 50,
  장애: 65,
  질병: 55,
  비만: 40,

  북한이탈주민: 60,
  난민: 60,

  기타: 10
};

const HIGH_RISK_TAGS = ['자살위험', '자해위험'];

const MEDIUM_RISK_TAGS = ['학교폭력', '학대방임', '성폭력'];


const TAG_KEYWORD_MAP = {
  // 🔴 위기 / 긴급
  자살위험: [
    '자살', '죽고싶', '죽고 싶', '죽고싶다',
    '극단선택', '극단 선택', '삶을 포기',
    '사라지고싶', '사라지고 싶'
  ],

  자해위험: [
    '자해', '자해시도', '자해 시도',
    '손목긋', '손목 긋', '몸을 해침',
    '자기몸을 해침', '자기 몸을 해침'
  ],

  // 🟠 폭력 / 학대
  학교폭력: [
    '학교폭력', '따돌림', '왕따', '괴롭힘',
    '집단괴롭힘', '폭력 피해',
    '친구들이 때림', '맞고', '폭행',
    'bullying', '무시', '욕함', '욕먹'
  ],

  학대방임: [
    '학대', '방임', '방치', '유기',
    '맞고', '폭행', '보호받지 못',
    '돌봄없', '돌봄 없음', '혼자 방치'
  ],

  성폭력: [
    '성폭력', '성추행', '성희롱',
    '성적 피해', '성적 학대'
  ],

  // 🟡 경제 / 생활
  경제적어려움: [
    '경제적어려움', '경제적으로어려움', '경제적으로 어려움',
    '형편이어려움', '형편이 어려움',
    '생활이어려움', '생활이 어려움',
    '돈이없', '돈이 없', '돈없',
    '가난', '생계곤란', '생활비 부족'
  ],

  결식: [
    '결식', '밥을못', '밥을 못',
    '굶', '끼니', '식사를못', '식사를 못'
  ],

  기초생활수급자: [
    '기초생활수급자', '수급자',
    '생계급여', '의료급여'
  ],

  법정차상위: ['차상위', '법정차상위'],

  기타저소득: ['저소득'],

  // 🟢 정서 / 정신
  우울: [
    '우울', '우울감', '의욕없', '의욕 없',
    '무기력', '기운없', '기운 없',
    '아무것도 하기 싫', '무기력함'
  ],

  불안: [
    '불안', '초조', '긴장', '걱정',
    '두려움', '겁', '불안정',

    // 현실 표현
    '놀림', '놀림받', '놀림 받',
    '자신감없', '자신감 없',
    '자존감낮', '자존감 낮',
    '위축', '위축됨'
  ],

  분노폭력: [
    '분노', '화를참지', '화를 참지',
    '공격적', '난폭', '화가 많'
  ],

  무기력: [
    '무기력', '기운없', '기운 없',
    '의욕없', '의욕 없음'
  ],

  // 🔵 학업 / 학교
  학업중단위기: [
    '학교를그만', '학교를 그만',
    '자퇴', '퇴학', '등교거부',
    '학교안가', '학교 안 가'
  ],

  기초학습부족: [
    '기초학습부족', '기초학습 부족',
    '읽기어려움', '읽기 어려움',
    '쓰기어려움', '쓰기 어려움',
    '셈하기어려움', '기초가부족'
  ],

  교과부족: [
    '학습부진', '성적저하',
    '공부를못', '공부를 못',
    '성적이 낮'
  ],

  ADHD: [
    'adhd', '주의력결핍',
    '과잉행동', '집중못', '집중 못',
    '산만'
  ],

  학교밖청소년: [
    '학교밖', '검정고시',
    '학교밖청소년'
  ],

  // 🟣 가족 / 돌봄
  가정급변: [
    '이혼', '별거', '실직',
    '보호자사망', '가정불화',
    '집안문제', '가정위기'
  ],

  부모부재: [
    '부모없', '부모 없',
    '보호자없', '보호자 없음'
  ],

  가족돌봄청소년: [
    '가족돌봄', '간병',
    '부모를돌봄', '동생을 돌봄'
  ],

  양육환경위기: [
    '양육어려움', '양육이안됨',
    '돌봄공백'
  ],

  조부모가정: [
    '조부모', '조손',
    '할머니와', '할아버지와'
  ],

  친척돌봄: [
    '친척이 돌봄',
    '삼촌이 키움', '이모가 키움'
  ],

  한부모: [
    '한부모', '편부모',
    '편모', '편부'
  ],

  시설보호: [
    '시설보호', '보호시설',
    '쉼터', '그룹홈'
  ],

  // 🟤 사회 / 특성
  다문화: [
    '다문화', '외국인',
    '이주배경', '국제결혼'
  ],

  장애: [
    '장애', '장애인',
    '발달장애', '지적장애',
    '자폐'
  ],

  질병: [
    '질병', '병이있', '병이 있',
    '만성질환'
  ],

  비만: [
    '비만', '과체중',
    '체중증가', '체중 증가',
    '살이쪘', '살이 쪘',
    '뚱뚱', '체중이'
  ],

  북한이탈주민: [
    '탈북', '북한이탈', '북한에서'
  ],

  난민: ['난민'],

  기타: ['기타']
};

const TAG_PATTERN_MAP = {
  자살위험: [
    '사는게 의미가 없',
    '살고싶지 않',
    '그만 살고 싶',
    '사라지고 싶',
    '모든걸 끝내고 싶'
  ],

  우울: [
    '아무것도 하기 싫',
    '기운이 없',
    '너무 힘들',
    '지쳐',
    '의욕이 없'
  ],

  불안: [
    '계속 걱정',
    '마음이 불안',
    '긴장이 된다',
    '무서워',
    '겁난다'
  ],

  학교폭력: [
    '친구들이 나를 무시',
    '학교에서 힘들',
    '친구 관계가 어렵',
    '친구들이 괴롭힌다'
  ],

  경제적어려움: [
    '생활이 어렵',
    '돈이 부족',
    '경제적으로 힘들',
    '형편이 안 좋'
  ]
};

const normalizeText = (text) => {
  return text
    .toLowerCase()
    .replace(/\s+/g, '')      // 공백 제거
    .replace(/[.,!?]/g, '');  // 특수문자 제거
};


function App() {
  const [programs, setPrograms] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [tags, setTags] = useState([]);

  const [autoSelectedTags, setAutoSelectedTags] = useState([]);
  const [manualSelectedTags, setManualSelectedTags] = useState([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [openProgramId, setOpenProgramId] = useState(null);

  const [viewMode, setViewMode] = useState('recommend');

  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [schoolLevel, setSchoolLevel] = useState('');
  const [searchText, setSearchText] = useState('');
  const [tagSearch, setTagSearch] = useState('');

  const [user, setUser] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [orgEditingId, setOrgEditingId] = useState(null);
  const [tagEditingId, setTagEditingId] = useState(null);

  const formRef = useRef(null);
  const orgFormRef = useRef(null);

  const [selectedProgramIds, setSelectedProgramIds] = useState([]);
  const [selectedOrganizationIds, setSelectedOrganizationIds] = useState([]);

  const [orgSearch, setOrgSearch] = useState('');
  const [adminOrgSearch, setAdminOrgSearch] = useState('');
  const [adminTagSearch, setAdminTagSearch] = useState('');
  const [allProgramSearch, setAllProgramSearch] = useState('');
  const [openTag, setOpenTag] = useState(null);

  const [form, setForm] = useState({
    name: '',
    organization: '',
    organization_id: '',
    phone: '',
    description: '',
    tags: [],
    min_age: '',
    max_age: '',
    gender: '무관',
    school_level: '무관',
  });

  const [orgForm, setOrgForm] = useState({
    name: '',
    phone: '',
    address: '',
    contact_person: '',
  });

  const [tagForm, setTagForm] = useState({
    name: '',
    category: '',
    is_active: true,
  });

  const [orgUploadPreview, setOrgUploadPreview] = useState([]);
  const [programUploadPreview, setProgramUploadPreview] = useState([]);

  const resultRef = useRef(null);

  const ADMIN_EMAIL = 'gsadmin@ai.cne.go.kr';
  const isAdmin = user?.email === ADMIN_EMAIL;

  const selectedTags = useMemo(() => {
    return [...new Set([...autoSelectedTags, ...manualSelectedTags])];
  }, [autoSelectedTags, manualSelectedTags]);

  useEffect(() => {
    fetchPrograms();
    fetchOrganizations();
    fetchTags();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  useEffect(() => {
    setSelectedOrganizationId('');
  }, [orgSearch]);

  const fetchPrograms = async () => {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setPrograms(data || []);
  };

  const fetchOrganizations = async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setOrganizations(data || []);
  };

  const fetchTags = async () => {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setTags(data || []);
  };

  const getOrganizationName = useCallback((organizationId, fallbackName) => {
  const org = organizations.find((item) => item.id === organizationId);
  return org?.name || fallbackName || '기관 없음';
}, [organizations]);

  const getOrganizationById = (organizationId) => {
    return organizations.find((item) => item.id === organizationId) || null;
  };

  const validTagNames = useMemo(() => {
    return new Set((tags || []).map((tag) => tag.name));
  }, [tags]);

const extractTagsFromText = (text) => {
  const normalized = normalizeText(text);
  const found = [];

  // 🔹 키워드 매칭
  Object.entries(TAG_KEYWORD_MAP).forEach(([tag, keywords]) => {
    if (!validTagNames.has(tag)) return;

    const matched = keywords.some((keyword) => {
      const normalizedKeyword = normalizeText(keyword);
      return normalized.includes(normalizedKeyword);
    });

    if (matched) found.push(tag);
  });

  // 🔥 패턴 매칭
  Object.entries(TAG_PATTERN_MAP).forEach(([tag, patterns]) => {
    if (!validTagNames.has(tag)) return;

    const matched = patterns.some((pattern) => {
      const normalizedPattern = normalizeText(pattern);
      return normalized.includes(normalizedPattern);
    });

    if (matched && !found.includes(tag)) {
      found.push(tag);
    }
  });

 // 🔥🔥🔥 문맥 조합 룰
if (
  normalized.includes('살') &&
  (
    normalized.includes('놀림') ||
    normalized.includes('따돌림') ||
    normalized.includes('괴롭힘') ||
    normalized.includes('왕따') ||
    normalized.includes('무시')
  )
) {
  found.push('비만');
  found.push('학교폭력');
}

if (
  normalized.includes('학교') &&
  (
    normalized.includes('무서') ||
    normalized.includes('가기싫') ||
    normalized.includes('가기싫어') ||
    normalized.includes('가기두려') ||
    normalized.includes('괴롭힘') ||
    normalized.includes('따돌림')
  )
) {
  found.push('학교폭력');
}

if (
  normalized.includes('집') &&
  (
    normalized.includes('힘들') ||
    normalized.includes('무섭') ||
    normalized.includes('불안') ||
    normalized.includes('싸움') ||
    normalized.includes('혼자')
  )
) {
  found.push('가정급변');
}

// 🔥🔥🔥 문맥 조합 룰 (실전용)

// 🔴 자살 / 자해
if (
  normalized.includes('죽고싶') ||
  normalized.includes('살기싫') ||
  normalized.includes('끝내고싶') ||
  normalized.includes('사라지고싶')
) {
  found.push('자살위험');
}

if (
  normalized.includes('자해') ||
  normalized.includes('손목') ||
  normalized.includes('몸을해')
) {
  found.push('자해위험');
}

// 🟠 학교폭력 / 괴롭힘
if (
  normalized.includes('따돌림') ||
  normalized.includes('왕따') ||
  normalized.includes('괴롭힘') ||
  normalized.includes('폭행') ||
  normalized.includes('맞고')
) {
  found.push('학교폭력');
}

// 🟠 외모 + 괴롭힘
if (
  normalized.includes('살') &&
  (
    normalized.includes('놀림') ||
    normalized.includes('따돌림') ||
    normalized.includes('괴롭힘') ||
    normalized.includes('왕따') ||
    normalized.includes('무시')
  )
) {
  found.push('비만');
  found.push('학교폭력');
}

// 🟢 우울 / 정서
if (
  normalized.includes('힘들') ||
  normalized.includes('지쳤') ||
  normalized.includes('의욕없') ||
  normalized.includes('무기력')
) {
  found.push('우울');
}

if (
  normalized.includes('불안') ||
  normalized.includes('걱정') ||
  normalized.includes('무서') ||
  normalized.includes('두려')
) {
  found.push('불안');
}

// 🔵 학교 / 등교 문제
if (
  normalized.includes('학교') &&
  (
    normalized.includes('가기싫') ||
    normalized.includes('가기싫어') ||
    normalized.includes('가기두려') ||
    normalized.includes('무서')
  )
) {
  found.push('학교폭력');
  found.push('학업중단위기');
}

// 🟣 가정 문제
if (
  normalized.includes('집') &&
  (
    normalized.includes('힘들') ||
    normalized.includes('무섭') ||
    normalized.includes('싸움') ||
    normalized.includes('불안') ||
    normalized.includes('혼자')
  )
) {
  found.push('가정급변');
}

// 🟡 경제 문제
if (
  normalized.includes('돈') &&
  (
    normalized.includes('없') ||
    normalized.includes('부족') ||
    normalized.includes('힘들')
  )
) {
  found.push('경제적어려움');
}

// 🟣 부모 부재
if (
  normalized.includes('혼자') &&
  (
    normalized.includes('집') ||
    normalized.includes('지냄')
  )
) {
  found.push('부모부재');
}

// 🟤 다문화
if (
  normalized.includes('한국어') &&
  normalized.includes('어려')
) {
  found.push('다문화');
}

// 🟤 장애 + 학습
if (
  normalized.includes('장애') &&
  (
    normalized.includes('공부') ||
    normalized.includes('학교')
  )
) {
  found.push('장애');
  found.push('기초학습부족');
}

  // 🔥🔥🔥 문맥 조합 룰 (추가)

  // 다문화 + 학교 적응
  if (
    normalized.includes('다문화') &&
    (
      normalized.includes('학교') ||
      normalized.includes('적응') ||
      normalized.includes('어려움') ||
      normalized.includes('힘들')
    )
  ) {
    found.push('다문화');
    found.push('기초학습부족');
    found.push('우울');
  }

  if (
    normalized.includes('한국어') &&
    (
      normalized.includes('못') ||
      normalized.includes('어려') ||
      normalized.includes('힘들')
    )
  ) {
    found.push('다문화');
    found.push('기초학습부족');
  }

  // 친구 관계 문제
  if (
    normalized.includes('친구') &&
    (
      normalized.includes('힘들') ||
      normalized.includes('어려') ||
      normalized.includes('문제')
    )
  ) {
    found.push('우울');
  }

  if (
    normalized.includes('친구') &&
    (
      normalized.includes('무시') ||
      normalized.includes('괴롭힘') ||
      normalized.includes('따돌림')
    )
  ) {
    found.push('학교폭력');
  }

  // 자존감 / 외모 / 위축
  if (
    normalized.includes('자신감') ||
    normalized.includes('자존감')
  ) {
    found.push('불안');
    found.push('우울');
  }

  if (
    normalized.includes('위축') ||
    normalized.includes('눈치')
  ) {
    found.push('불안');
  }

  // 가정 문제 확장
  if (
    normalized.includes('부모') &&
    (
      normalized.includes('싸움') ||
      normalized.includes('갈등')
    )
  ) {
    found.push('가정급변');
    found.push('우울');
  }

  if (
    normalized.includes('집') &&
    normalized.includes('가기싫')
  ) {
    found.push('가정급변');
  }

  // 공부 / 학습 문제
  if (
    normalized.includes('공부') &&
    (
      normalized.includes('힘들') ||
      normalized.includes('못') ||
      normalized.includes('어려')
    )
  ) {
    found.push('교과부족');
  }

  if (
    normalized.includes('학교') &&
    normalized.includes('싫')
  ) {
    found.push('학업중단위기');
  }

  // 경제 + 생활
  if (
    normalized.includes('돈') &&
    normalized.includes('없')
  ) {
    found.push('경제적어려움');
  }

  if (
    normalized.includes('밥') &&
    normalized.includes('못')
  ) {
    found.push('결식');
  }

  // 고립 / 혼자
  if (
    normalized.includes('혼자') &&
    normalized.includes('외로')
  ) {
    found.push('우울');
  }

  if (
    normalized.includes('혼자') &&
    normalized.includes('지냄')
  ) {
    found.push('부모부재');
  }

  // 외모 + 따돌림
  if (
    normalized.includes('살') &&
    (
      normalized.includes('놀림') ||
      normalized.includes('따돌림') ||
      normalized.includes('괴롭힘') ||
      normalized.includes('왕따') ||
      normalized.includes('무시')
    )
  ) {
    found.push('비만');
    found.push('학교폭력');
  }

  // 학교 + 무서움
  if (
    normalized.includes('학교') &&
    (
      normalized.includes('무서') ||
      normalized.includes('가기싫') ||
      normalized.includes('가기두려') ||
      normalized.includes('괴롭힘') ||
      normalized.includes('따돌림')
    )
  ) {
    found.push('학교폭력');
    found.push('학업중단위기');
  }

  // 집 + 힘듦
  if (
    normalized.includes('집') &&
    (
      normalized.includes('힘들') ||
      normalized.includes('무섭') ||
      normalized.includes('불안') ||
      normalized.includes('싸움') ||
      normalized.includes('혼자')
    )
  ) {
    found.push('가정급변');
  }

  // 🔥🔥🔥 실제 테스트 기반 보강 룰

// 학교폭력 + 학교 회피 → 학업중단위기
if (
  found.includes('학교폭력') &&
  (
    normalized.includes('학교가기싫') ||
    normalized.includes('학교가기무섭') ||
    normalized.includes('결석') ||
    normalized.includes('등교거부')
  )
) {
  found.push('학업중단위기');
}

// 폭행은 학교폭력이지 학대방임 아님 → 제거
if (
  found.includes('학대방임') &&
  (
    normalized.includes('학교') ||
    normalized.includes('친구')
  )
) {
  const idx = found.indexOf('학대방임');
  if (idx !== -1) found.splice(idx, 1);
}

// 놀림 + 위축 → 불안 + 학교폭력
if (
  normalized.includes('놀림') &&
  normalized.includes('위축')
) {
  found.push('학교폭력');
  found.push('불안');
}

// 우울 → 무기력 자동 추가
if (found.includes('우울')) {
  found.push('무기력');
}

// 경제 관련 강화
if (
  normalized.includes('형편') ||
  normalized.includes('생활비') ||
  normalized.includes('생계') ||
  normalized.includes('경제')
) {
  found.push('경제적어려움');
}

// 저소득 → 경제적어려움도 같이
if (found.includes('기타저소득')) {
  found.push('경제적어려움');
}

// 다문화 + 언어 문제
if (
  normalized.includes('한국어') &&
  (
    normalized.includes('어려') ||
    normalized.includes('못') ||
    normalized.includes('힘들')
  )
) {
  found.push('다문화');
  found.push('기초학습부족');
}

// 다문화 + 학교 적응
if (
  normalized.includes('다문화') &&
  normalized.includes('학교')
) {
  found.push('기초학습부족');
}

// 기초학습 직접 표현
if (
  normalized.includes('읽기') ||
  normalized.includes('쓰기') ||
  normalized.includes('기초학습')
) {
  found.push('기초학습부족');
}

// 성적 저하 → 교과부족
if (
  normalized.includes('성적') &&
  normalized.includes('떨어')
) {
  found.push('교과부족');
}

// 학교 가기 싫음 → 학업중단위기
if (
  normalized.includes('학교가기싫') ||
  normalized.includes('결석') ||
  normalized.includes('등교거부')
) {
  found.push('학업중단위기');
}

// 충동성 / 행동문제
if (
  normalized.includes('충동') ||
  normalized.includes('가만히있지못') ||
  normalized.includes('행동문제')
) {
  found.push('ADHD');
}

// 외모 + 놀림
if (
  normalized.includes('외모') &&
  normalized.includes('놀림')
) {
  found.push('학교폭력');
  found.push('불안');
}

// 가족돌봄
if (
  normalized.includes('동생돌봄') ||
  normalized.includes('가족돌봄') ||
  normalized.includes('간병')
) {
  found.push('가족돌봄청소년');
}

// 돌봄 + 학업 어려움
if (
  found.includes('가족돌봄청소년') &&
  (
    normalized.includes('학교') ||
    normalized.includes('학업')
  )
) {
  found.push('학업중단위기');
}

// 부모 부재
if (
  normalized.includes('부모부재') ||
  normalized.includes('혼자지냄')
) {
  found.push('부모부재');
}

// 경제 + 불안 같이 표현
if (
  found.includes('경제적어려움') &&
  normalized.includes('힘들')
) {
  found.push('우울');
}

  // 🔥 중복 제거
  return [...new Set(found)];
};

  const handleLiveCaseInput = (value) => {
    setSearchText(value);

    if (!value.trim()) {
      setAutoSelectedTags([]);
      setManualSelectedTags([]);
      return;
    }

    const extracted = extractTagsFromText(value);
    setAutoSelectedTags(extracted);
    setManualSelectedTags([]);
  };

  const activeTags = useMemo(
    () => tags.filter((tag) => tag.is_active),
    [tags]
  );

  const groupedActiveTags = useMemo(() => {
    return activeTags.reduce((acc, tag) => {
      const category = tag.category || '기타';
      if (!acc[category]) acc[category] = [];
      acc[category].push(tag);
      return acc;
    }, {});
  }, [activeTags]);

  const filteredGroupedTags = useMemo(() => {
    const lower = tagSearch.toLowerCase();

    const filtered = activeTags.filter(
      (tag) =>
        tag.name.toLowerCase().includes(lower) ||
        (tag.category || '').toLowerCase().includes(lower)
    );

    return filtered.reduce((acc, tag) => {
      const category = tag.category || '기타';
      if (!acc[category]) acc[category] = [];
      acc[category].push(tag);
      return acc;
    }, {});
  }, [activeTags, tagSearch]);

  const filteredAdminTags = useMemo(() => {
    const keyword = adminTagSearch.trim().toLowerCase();

    if (!keyword) return tags;

    return tags.filter((tag) => {
      const name = (tag.name || '').toLowerCase();
      const category = (tag.category || '').toLowerCase();

      return name.includes(keyword) || category.includes(keyword);
    });
  }, [tags, adminTagSearch]);

  const passesRequiredFilters = useCallback((program) => {
    const userAge = age === '' ? null : Number(age);

    if (userAge !== null) {
      if (
        program.min_age !== null &&
        program.min_age !== undefined &&
        userAge < program.min_age
      ) {
        return false;
      }
      if (
        program.max_age !== null &&
        program.max_age !== undefined &&
        userAge > program.max_age
      ) {
        return false;
      }
    }

    if (
      gender &&
      program.gender &&
      program.gender !== '무관' &&
      program.gender !== gender
    ) {
      return false;
    }

    if (
      schoolLevel &&
      program.school_level &&
      program.school_level !== '무관' &&
      program.school_level !== schoolLevel
    ) {
      return false;
    }

    return true;
  }, [age, gender, schoolLevel]);

const calculateRecommendationScore = useCallback((program) => {
  const programTags = Array.isArray(program.tags) ? program.tags : [];

  if (selectedTags.length === 0) {
    return {
      ...program,
      score: 0,
      matchedTags: [],
      matchCount: 0,
      matchRatio: 0,
      hasCriticalMatch: false,
      criticalMatchCount: 0,
    };
  }

  let score = 0;
  const matchedTags = [];

  for (const tag of selectedTags) {
    if (programTags.includes(tag)) {
      let weight = TAG_WEIGHTS[tag] || 20;

      // 조건 태그는 점수 약화
      if (CONTEXT_TAGS.includes(tag)) {
        weight = weight * 0.4;
      }

      score += weight;
      matchedTags.push(tag);
    }
  }

  const matchCount = matchedTags.length;
  const matchRatio = matchCount / selectedTags.length;

  const selectedCoreTags = selectedTags.filter((tag) =>
    CORE_PROBLEM_TAGS.includes(tag)
  );

  const matchedCoreTags = matchedTags.filter((tag) =>
    CORE_PROBLEM_TAGS.includes(tag)
  );

  const criticalMatchCount = matchedTags.filter((tag) =>
    CRITICAL_TAGS.includes(tag)
  ).length;

  const hasCriticalMatch = criticalMatchCount > 0;

  // 핵심 태그 맞으면 보너스
  if (matchedCoreTags.length > 0) {
    score += matchedCoreTags.length * 40;
  }

  // 핵심 태그 있는데 하나도 못 맞추면 약하게 감점
  if (selectedCoreTags.length > 0 && matchedCoreTags.length === 0) {
    score -= 40;
  }

  return {
    ...program,
    score,
    matchedTags,
    matchCount,
    matchRatio,
    hasCriticalMatch,
    criticalMatchCount,
  };
}, [selectedTags]);

const recommendedPrograms = useMemo(() => {
  return programs
    .filter((program) => passesRequiredFilters(program))
    .map((program) => calculateRecommendationScore(program))
    .filter((program) => {
      if (selectedTags.length === 0) return false;

      if (program.hasCriticalMatch) return true;

      const hasCore = selectedTags.some((tag) =>
        CORE_PROBLEM_TAGS.includes(tag)
      );

      const matchedCoreTags = (program.matchedTags || []).filter((tag) =>
        CORE_PROBLEM_TAGS.includes(tag)
      );

      // 핵심 태그 하나라도 맞으면 통과
      if (matchedCoreTags.length > 0) return true;

      // 핵심 문제 입력이면 약간 엄격
      if (hasCore) {
        return program.matchCount >= 1 && program.matchRatio >= 0.3;
      }

      // 조건만 있는 경우 넓게 추천
      return program.matchCount >= 1;
    })
    .sort((a, b) => {
      if (a.hasCriticalMatch && !b.hasCriticalMatch) return -1;
      if (!a.hasCriticalMatch && b.hasCriticalMatch) return 1;

      if (b.criticalMatchCount !== a.criticalMatchCount) {
        return b.criticalMatchCount - a.criticalMatchCount;
      }

      if (b.score !== a.score) return b.score - a.score;
      if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
      if (b.matchRatio !== a.matchRatio) return b.matchRatio - a.matchRatio;

      return a.name.localeCompare(b.name);
    });
}, [programs, passesRequiredFilters, calculateRecommendationScore, selectedTags]);
 
const groupedPrograms = useMemo(() => {
  const result = {};

  recommendedPrograms.forEach((program) => {
    const tags = program.matchedTags || [];

    tags.forEach((tag) => {
      if (!result[tag]) result[tag] = {};

      const orgName = getOrganizationName(
        program.organization_id,
        program.organization
      );

      if (!result[tag][orgName]) result[tag][orgName] = [];

      result[tag][orgName].push(program);
    });
  });

  return result;
}, [recommendedPrograms, getOrganizationName]);

const allPrograms = useMemo(() => {
  const keyword = allProgramSearch.trim().toLowerCase();

  return programs
    .filter((program) => passesRequiredFilters(program))
    .filter((program) => {
      if (!keyword) return true;

      const name = (program.name || '').toLowerCase();
      const description = (program.description || '').toLowerCase();
      const organization = getOrganizationName(
        program.organization_id,
        program.organization
      ).toLowerCase();
      const phone = (program.phone || '').toLowerCase();
      const tagsText = Array.isArray(program.tags)
        ? program.tags.join(' ').toLowerCase()
        : '';

      return (
        name.includes(keyword) ||
        description.includes(keyword) ||
        organization.includes(keyword) ||
        phone.includes(keyword) ||
        tagsText.includes(keyword)
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}, [programs, passesRequiredFilters, allProgramSearch, getOrganizationName]);

  const organizationPrograms = useMemo(() => {
    if (!selectedOrganizationId) return [];
    return programs.filter(
      (program) => program.organization_id === selectedOrganizationId
    );
  }, [programs, selectedOrganizationId]);

  const filteredOrganizations = useMemo(() => {
    const keyword = orgSearch.trim().toLowerCase();

    if (!keyword) return organizations;

    return organizations.filter((org) => {
      const name = (org.name || '').toLowerCase();
      const address = (org.address || '').toLowerCase();
      const phone = (org.phone || '').toLowerCase();

      return (
        name.includes(keyword) ||
        address.includes(keyword) ||
        phone.includes(keyword)
      );
    });
  }, [organizations, orgSearch]);

  const filteredAdminOrganizations = useMemo(() => {
    const keyword = adminOrgSearch.trim().toLowerCase();

    if (!keyword) return organizations;

    return organizations.filter((org) => {
      const name = (org.name || '').toLowerCase();
      const address = (org.address || '').toLowerCase();
      const phone = (org.phone || '').toLowerCase();

      return (
        name.includes(keyword) ||
        address.includes(keyword) ||
        phone.includes(keyword)
      );
    });
  }, [organizations, adminOrgSearch]);

  const autoTagging = (text) => {
    if (!text.trim()) {
      setAutoSelectedTags([]);
      setManualSelectedTags([]);
      return;
    }

    const extracted = extractTagsFromText(text);
    setAutoSelectedTags(extracted);
    setManualSelectedTags([]);
  };

  const removeTagCompletely = (tagName) => {
    setAutoSelectedTags((prev) => prev.filter((t) => t !== tagName));
    setManualSelectedTags((prev) => prev.filter((t) => t !== tagName));
  };

  const toggleManualTag = (tagName) => {
    const isSelected = selectedTags.includes(tagName);

    if (isSelected) {
      removeTagCompletely(tagName);
      return;
    }

    setManualSelectedTags((prev) => [...new Set([...prev, tagName])]);
  };

  const handleResetRecommendFilters = () => {
    setAge('');
    setGender('');
    setSchoolLevel('');
    setSearchText('');
    setAutoSelectedTags([]);
    setManualSelectedTags([]);
  };

  const handleLogin = async () => {
    const email = prompt('이메일 입력');
    const password = prompt('비밀번호 입력');

    if (!email || !password) return;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    const { data } = await supabase.auth.getUser();
    setUser(data.user);
    alert('로그인 성공');
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert('로그아웃 실패');
      console.error(error);
      return;
    }

    setUser(null);
    setAutoSelectedTags([]);
    setManualSelectedTags([]);
    setSelectedProgram(null);
    setSelectedOrganizationId('');
    setViewMode('recommend');
    setAge('');
    setGender('');
    setSchoolLevel('');
    setSearchText('');
    setTagSearch('');
    setEditingId(null);
    setOrgEditingId(null);
    setTagEditingId(null);
    setOrgUploadPreview([]);
    setProgramUploadPreview([]);
    setOpenProgramId(null);
    setSelectedProgramIds([]);
    setSelectedOrganizationIds([]);
    setOrgSearch('');
    setAdminOrgSearch('');
    setAdminTagSearch('');
    setAllProgramSearch('');

    setForm({
      name: '',
      organization: '',
      organization_id: '',
      phone: '',
      description: '',
      tags: [],
      min_age: '',
      max_age: '',
      gender: '무관',
      school_level: '무관',
    });

    setOrgForm({
      name: '',
      phone: '',
      address: '',
      contact_person: '',
    });

    setTagForm({
      name: '',
      category: '',
      is_active: true,
    });

    alert('로그아웃 되었습니다.');
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: '',
      organization: '',
      organization_id: '',
      phone: '',
      description: '',
      tags: [],
      min_age: '',
      max_age: '',
      gender: '무관',
      school_level: '무관',
    });
  };

  const resetOrgForm = () => {
    setOrgEditingId(null);
    setOrgForm({
      name: '',
      phone: '',
      address: '',
      contact_person: '',
    });
  };

  const resetTagForm = () => {
    setTagEditingId(null);
    setTagForm({
      name: '',
      category: '',
      is_active: true,
    });
  };

  const handleSaveProgram = async () => {
    const normalizedOrganizationId =
      form.organization_id === '' ? null : form.organization_id;

    const normalizedPhone = (form.phone || '').trim();
    const normalizedName = (form.name || '').trim();

    if (!normalizedName) {
      alert('사업명은 필수입니다.');
      return;
    }

    if (!normalizedOrganizationId) {
      alert('기관 선택은 필수입니다.');
      return;
    }

    if (!normalizedPhone) {
      alert('전화번호는 필수입니다.');
      return;
    }

    const selectedOrg = organizations.find(
      (org) => String(org.id) === String(normalizedOrganizationId)
    );

    const payload = {
      name: normalizedName,
      organization: selectedOrg ? selectedOrg.name : form.organization || '',
      organization_id: normalizedOrganizationId,
      phone: normalizedPhone,
      description: form.description || '',
      tags: Array.isArray(form.tags) ? form.tags : [],
      min_age: form.min_age === '' ? null : Number(form.min_age),
      max_age: form.max_age === '' ? null : Number(form.max_age),
      gender: form.gender || '무관',
      school_level: form.school_level || '무관',
    };

    if (editingId) {
      const { data, error } = await supabase
        .from('programs')
        .update(payload)
        .eq('id', editingId)
        .select();

      if (error) {
        alert(`수정 실패: ${error.message}`);
        console.error('program update error:', error);
        return;
      }

      console.log('수정 결과:', data);
      alert('수정 완료');
    } else {
      const { data, error } = await supabase
        .from('programs')
        .insert([payload])
        .select();

      if (error) {
        alert(`추가 실패: ${error.message}`);
        console.error('program insert error:', error);
        return;
      }

      console.log('추가 결과:', data);
      alert('추가 완료');
    }

    resetForm();
    fetchPrograms();
  };

  const handleDeleteProgram = async (id) => {
    const ok = window.confirm('정말 삭제할까요?');
    if (!ok) return;

    const { error } = await supabase.from('programs').delete().eq('id', id);

    if (error) {
      alert('삭제 실패');
      console.error(error);
      return;
    }

    if (selectedProgram?.id === id) setSelectedProgram(null);
    if (openProgramId === id) setOpenProgramId(null);

    alert('삭제 완료');
    fetchPrograms();
  };

  const handleDeleteSelectedPrograms = async () => {
    if (selectedProgramIds.length === 0) {
      alert('선택된 사업이 없습니다.');
      return;
    }

    const ok = window.confirm(
      `선택한 사업 ${selectedProgramIds.length}개를 삭제할까요?`
    );
    if (!ok) return;

    const { error } = await supabase
      .from('programs')
      .delete()
      .in('id', selectedProgramIds);

    if (error) {
      alert('선택 삭제 실패');
      console.error(error);
      return;
    }

    alert(`사업 ${selectedProgramIds.length}개 삭제 완료`);
    setSelectedProgramIds([]);
    setOpenProgramId(null);
    fetchPrograms();
  };

  const handleEditProgram = (program) => {
    const selectedOrg = organizations.find(
      (org) => String(org.id) === String(program.organization_id)
    );

    setEditingId(program.id);
    setForm({
      name: program.name || '',
      organization: selectedOrg?.name || program.organization || '',
      organization_id: program.organization_id || '',
      phone: program.phone || '',
      description: program.description || '',
      tags: Array.isArray(program.tags) ? program.tags : [],
      min_age:
        program.min_age === null || program.min_age === undefined
          ? ''
          : String(program.min_age),
      max_age:
        program.max_age === null || program.max_age === undefined
          ? ''
          : String(program.max_age),
      gender: program.gender || '무관',
      school_level: program.school_level || '무관',
    });

    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSaveOrganization = async () => {
    if (!orgForm.name) {
      alert('기관명은 필수입니다.');
      return;
    }

    if (orgEditingId) {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: orgForm.name,
          phone: orgForm.phone,
          address: orgForm.address,
          contact_person: orgForm.contact_person,
        })
        .eq('id', orgEditingId);

      if (error) {
        alert('기관 수정 실패');
        console.error(error);
        return;
      }

      const { error: syncError } = await supabase
        .from('programs')
        .update({ organization: orgForm.name })
        .eq('organization_id', orgEditingId);

      if (syncError) {
        alert('기관 수정은 되었지만 사업명 동기화는 실패했습니다.');
        console.error(syncError);
      } else {
        alert('기관 수정 완료');
      }
    } else {
      const { error } = await supabase.from('organizations').insert([
        {
          name: orgForm.name,
          phone: orgForm.phone,
          address: orgForm.address,
          contact_person: orgForm.contact_person,
        },
      ]);

      if (error) {
        alert('기관 추가 실패');
        console.error(error);
        return;
      }

      alert('기관 추가 완료');
    }

    resetOrgForm();
    fetchOrganizations();
    fetchPrograms();
  };

  const handleEditOrganization = (org) => {
    setOrgEditingId(org.id);
    setOrgForm({
      name: org.name || '',
      phone: org.phone || '',
      address: org.address || '',
      contact_person: org.contact_person || '',
    });

    setTimeout(() => {
      orgFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleDeleteOrganization = async (id) => {
    const org = organizations.find((item) => item.id === id);
    const ok = window.confirm(
      `정말 기관을 삭제할까요?\n기관명: ${org?.name || '알 수 없음'}`
    );
    if (!ok) return;

    const { data: linkedPrograms, error: checkError } = await supabase
      .from('programs')
      .select('id, name')
      .eq('organization_id', id);

    if (checkError) {
      alert('기관 사용 여부 확인 실패');
      console.error(checkError);
      return;
    }

    if (linkedPrograms && linkedPrograms.length > 0) {
      const names = linkedPrograms.map((p) => p.name).join(', ');
      alert(
        `이 기관을 사용하는 사업이 있어서 삭제할 수 없습니다.\n연결된 사업: ${names}`
      );
      return;
    }

    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id);

    if (error) {
      alert('기관 삭제 실패');
      console.error(error);
      return;
    }

    alert('기관 삭제 완료');
    fetchOrganizations();
  };

  const handleDeleteSelectedOrganizations = async () => {
    if (selectedOrganizationIds.length === 0) {
      alert('선택된 기관이 없습니다.');
      return;
    }

    const ok = window.confirm(
      `선택한 기관 ${selectedOrganizationIds.length}개를 삭제할까요?\n연결된 사업이 있는 기관은 제외됩니다.`
    );
    if (!ok) return;

    const deletableIds = [];
    const blockedNames = [];

    for (const orgId of selectedOrganizationIds) {
      const org = organizations.find((item) => item.id === orgId);

      const { data: linkedPrograms, error: checkError } = await supabase
        .from('programs')
        .select('id')
        .eq('organization_id', orgId);

      if (checkError) {
        console.error(checkError);
        blockedNames.push(`${org?.name || '알 수 없는 기관'}(확인 실패)`);
        continue;
      }

      if (linkedPrograms && linkedPrograms.length > 0) {
        blockedNames.push(org?.name || '알 수 없는 기관');
      } else {
        deletableIds.push(orgId);
      }
    }

    if (deletableIds.length > 0) {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .in('id', deletableIds);

      if (error) {
        alert('기관 선택 삭제 실패');
        console.error(error);
        return;
      }
    }

    let message = '';
    if (deletableIds.length > 0) {
      message += `기관 ${deletableIds.length}개 삭제 완료`;
    }
    if (blockedNames.length > 0) {
      message += `\n삭제 제외(연결된 사업 있음): ${blockedNames.join(', ')}`;
    }
    if (!message) {
      message = '삭제된 기관이 없습니다.';
    }

    alert(message);
    setSelectedOrganizationIds([]);
    fetchOrganizations();
  };

  const handleSaveTag = async () => {
    if (!tagForm.name || !tagForm.category) {
      alert('태그명과 카테고리는 필수입니다.');
      return;
    }

    if (tagEditingId) {
      const oldTag = tags.find((t) => t.id === tagEditingId);

      const { error } = await supabase
        .from('tags')
        .update({
          name: tagForm.name,
          category: tagForm.category,
          is_active: tagForm.is_active,
        })
        .eq('id', tagEditingId);

      if (error) {
        alert('태그 수정 실패');
        console.error(error);
        return;
      }

      if (oldTag && oldTag.name !== tagForm.name) {
        const affectedPrograms = programs.filter((p) =>
          (p.tags || []).includes(oldTag.name)
        );

        for (const program of affectedPrograms) {
          const updatedTags = (program.tags || []).map((tag) =>
            tag === oldTag.name ? tagForm.name : tag
          );

          const { error: syncError } = await supabase
            .from('programs')
            .update({ tags: updatedTags })
            .eq('id', program.id);

          if (syncError) console.error(syncError);
        }
      }

      alert('태그 수정 완료');
    } else {
      const { error } = await supabase.from('tags').insert([
        {
          name: tagForm.name,
          category: tagForm.category,
          is_active: tagForm.is_active,
        },
      ]);

      if (error) {
        alert('태그 추가 실패');
        console.error(error);
        return;
      }

      alert('태그 추가 완료');
    }

    resetTagForm();
    fetchTags();
    fetchPrograms();
  };

  const handleEditTag = (tag) => {
    setTagEditingId(tag.id);
    setTagForm({
      name: tag.name || '',
      category: tag.category || '',
      is_active: !!tag.is_active,
    });
  };

  const handleDeleteTag = async (id) => {
    const targetTag = tags.find((t) => t.id === id);
    const ok = window.confirm(
      `정말 태그를 삭제할까요?\n태그명: ${targetTag?.name || '알 수 없음'}`
    );
    if (!ok) return;

    if (!targetTag) return;

    const affectedPrograms = programs.filter((p) =>
      (p.tags || []).includes(targetTag.name)
    );

    if (affectedPrograms.length > 0) {
      const names = affectedPrograms.map((p) => p.name).join(', ');
      alert(
        `이 태그를 사용하는 사업이 있어서 바로 삭제하는 것은 위험합니다.\n연결된 사업: ${names}\n삭제 대신 비활성화를 권장합니다.`
      );
      return;
    }

    const { error } = await supabase.from('tags').delete().eq('id', id);

    if (error) {
      alert('태그 삭제 실패');
      console.error(error);
      return;
    }

    alert('태그 삭제 완료');
    fetchTags();
  };

  const handleDeactivateTag = async (id) => {
    const { error } = await supabase
      .from('tags')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      alert('태그 비활성화 실패');
      console.error(error);
      return;
    }

    alert('태그 비활성화 완료');
    fetchTags();
  };

  const parseExcelRows = async (file) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const cleanedRows =
      rows.length > 0 && rows[0] && rows[0][0] === '표 1'
        ? rows.slice(1)
        : rows;

    const headers = cleanedRows[0];
    const body = cleanedRows.slice(1);

    return body.map((row) => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
  };

  const handleOrgExcelSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const rows = await parseExcelRows(file);

      const preview = rows.map((row) => ({
        name: row['기관명'] || '',
        phone: row['전화번호'] || '',
        address: row['주소'] || '',
        contact_person: row['담당자'] || '',
      }));

      setOrgUploadPreview(preview.filter((row) => row.name));
    } catch (error) {
      console.error(error);
      alert('기관 엑셀 읽기 실패');
    }
  };

  const handleProgramExcelSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const rows = await parseExcelRows(file);

      const preview = rows.map((row) => {
        const orgName = String(row['기관명'] || '').trim();
        const matchedOrg = organizations.find(
          (org) => org.name.trim() === orgName
        );

        const parsedTags = String(row['태그'] || '')
          .split(/[,/]/)
          .map((tag) => tag.trim())
          .filter(Boolean);

        return {
          name: row['사업명'] || '',
          organization: orgName,
          organization_id: matchedOrg ? matchedOrg.id : '',
          phone: row['전화번호'] || '',
          description: row['설명'] || '',
          tags: parsedTags,
          min_age:
            row['최소연령'] === undefined || row['최소연령'] === ''
              ? null
              : Number(row['최소연령']),
          max_age:
            row['최대연령'] === undefined || row['최대연령'] === ''
              ? null
              : Number(row['최대연령']),
          gender: row['성별'] || '무관',
          school_level: row['학령'] || '무관',
          orgMatched: !!matchedOrg,
        };
      });

      setProgramUploadPreview(preview.filter((row) => row.name));
    } catch (error) {
      console.error(error);
      alert('사업 엑셀 읽기 실패');
    }
  };

  const handleUploadOrganizations = async () => {
    if (orgUploadPreview.length === 0) {
      alert('업로드할 기관 데이터가 없습니다.');
      return;
    }

    const payload = orgUploadPreview.map((row) => ({
      name: row.name,
      phone: row.phone,
      address: row.address,
      contact_person: row.contact_person,
    }));

    const { error } = await supabase
      .from('organizations')
      .upsert(payload, { onConflict: 'name' });

    if (error) {
      alert('기관 엑셀 업로드 실패');
      console.error(error);
      return;
    }

    alert('기관 엑셀 업로드 완료');
    setOrgUploadPreview([]);
    fetchOrganizations();
  };

  const handleUploadPrograms = async () => {
    if (programUploadPreview.length === 0) {
      alert('업로드할 사업 데이터가 없습니다.');
      return;
    }

    const matched = programUploadPreview.filter((row) => row.orgMatched);
    const unmatched = programUploadPreview.filter((row) => !row.orgMatched);

    if (matched.length === 0) {
      alert(`업로드 불가\n기관 매칭 실패: ${unmatched.length}건`);
      return;
    }

    const excelUniqueMap = new Map();
    const excelDuplicateRows = [];

    for (const row of matched) {
      const key = `${row.name.trim()}_${row.organization_id}`;
      if (excelUniqueMap.has(key)) {
        excelDuplicateRows.push(row);
      } else {
        excelUniqueMap.set(key, row);
      }
    }

    const excelUniqueRows = Array.from(excelUniqueMap.values());

    const dbDuplicateRows = [];
    const finalRows = [];

    for (const row of excelUniqueRows) {
      const isDuplicate = programs.some(
        (program) =>
          String(program.name || '').trim() === String(row.name || '').trim() &&
          String(program.organization_id || '') ===
            String(row.organization_id || '')
      );

      if (isDuplicate) {
        dbDuplicateRows.push(row);
      } else {
        finalRows.push(row);
      }
    }

    if (finalRows.length === 0) {
      alert(
        `업로드할 신규 데이터 없음\n기관 미매칭: ${unmatched.length}건\n엑셀 중복: ${excelDuplicateRows.length}건\nDB 중복: ${dbDuplicateRows.length}건`
      );
      return;
    }

    const payload = finalRows.map((row) => ({
      name: row.name,
      organization: row.organization,
      organization_id: row.organization_id,
      phone: row.phone,
      description: row.description,
      tags: row.tags,
      min_age: row.min_age,
      max_age: row.max_age,
      gender: row.gender || '무관',
      school_level: row.school_level || '무관',
    }));

    const { error } = await supabase.from('programs').insert(payload);

    if (error) {
      alert(`업로드 실패: ${error.message}`);
      console.error(error);
      return;
    }

    alert(
      `업로드 완료\n성공: ${finalRows.length}건\n기관 미매칭: ${unmatched.length}건\n엑셀 중복: ${excelDuplicateRows.length}건\nDB 중복: ${dbDuplicateRows.length}건`
    );

    setProgramUploadPreview([]);
    fetchPrograms();
  };

  const handleExportOrganizations = () => {
    if (organizations.length === 0) {
      alert('내보낼 기관 데이터가 없습니다.');
      return;
    }

    const exportRows = organizations.map((org, index) => ({
      순번: index + 1,
      기관명: org.name || '',
      전화번호: org.phone || '',
      주소: org.address || '',
      담당자: org.contact_person || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '기관리스트');

    XLSX.writeFile(workbook, '기관리스트.xlsx');
  };

  const handleExportPrograms = () => {
    if (programs.length === 0) {
      alert('내보낼 사업 데이터가 없습니다.');
      return;
    }

    const exportRows = programs.map((program, index) => ({
      순번: index + 1,
      사업명: program.name || '',
      기관명: getOrganizationName(program.organization_id, program.organization),
      전화번호: program.phone || '',
      설명: program.description || '',
      태그: Array.isArray(program.tags) ? program.tags.join(',') : '',
      최소연령:
        program.min_age === null || program.min_age === undefined
          ? ''
          : program.min_age,
      최대연령:
        program.max_age === null || program.max_age === undefined
          ? ''
          : program.max_age,
      성별: program.gender || '무관',
      학령: program.school_level || '무관',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '사업리스트');

    XLSX.writeFile(workbook, '사업리스트.xlsx');
  };

  const renderProgramCard = (p, index = null, showScore = false) => {
    const isOpen = openProgramId === p.id;
    const org = getOrganizationById(p.organization_id);
    const isCritical = p.tags?.some((tag) => CRITICAL_TAGS.includes(tag));
    const isTop = index !== null && index < 3;

    return (
      <div
        key={p.id}
        className={`program-card ${isCritical ? 'critical' : isTop ? 'top' : ''}`}
        onClick={() =>
          setOpenProgramId((prev) => (prev === p.id ? null : p.id))
        }
      >
        {isAdmin && (
          <div
            style={{ marginBottom: 10 }}
            onClick={(e) => e.stopPropagation()}
          >
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={selectedProgramIds.includes(p.id)}
                onChange={() => {
                  setSelectedProgramIds((prev) =>
                    prev.includes(p.id)
                      ? prev.filter((id) => id !== p.id)
                      : [...prev, p.id]
                  );
                }}
              />
              <span>선택</span>
            </label>
          </div>
        )}

        <div className="program-card-head">
          <div>
            {isCritical && (
              <div className="program-badge critical">🚨 긴급 지원 필요</div>
            )}
            {isTop && (
              <div className="program-badge top">⭐ 추천 TOP {index + 1}</div>
            )}
            <h3 className="program-title">{p.name}</h3>
            <p className="program-sub">
              {getOrganizationName(p.organization_id, p.organization)}
            </p>
          </div>

          <div className="program-head-right">
            {showScore && <div className="score-chip">{p.score}점</div>}
            <div className="detail-toggle">
              {isOpen ? '상세 닫기 ▲' : '상세 보기 ▼'}
            </div>
          </div>
        </div>

        <div className="program-summary">
          <p>{p.description || '설명 없음'}</p>
          {showScore && p.matchedTags && p.matchedTags.length > 0 && (
            <p className="program-match">
              일치 태그: {p.matchedTags.join(', ')}
            </p>
          )}
          {showScore && p.hasCriticalMatch && (
            <p className="program-match" style={{ color: '#dc2626', fontWeight: 700 }}>
              긴급 태그 일치: {p.matchedTags.filter((tag) => CRITICAL_TAGS.includes(tag)).join(', ')}
            </p>
          )}
        </div>

        {isOpen && (
          <div
            className="program-detail"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="detail-grid">
              <div className="detail-block">
                <h4>사업 정보</h4>
                <p><strong>설명</strong><br />{p.description || '설명 없음'}</p>
                <p>
                  <strong>대상 연령</strong><br />
                  {p.min_age ?? '무관'} ~ {p.max_age ?? '무관'}
                </p>
                <p><strong>대상 성별</strong><br />{p.gender || '무관'}</p>
                <p><strong>학령</strong><br />{p.school_level || '무관'}</p>
                <p>
                  <strong>전체 태그</strong><br />
                  {p.tags ? p.tags.join(', ') : '없음'}
                </p>
              </div>

              <div className="detail-block">
                <h4>연계 기관</h4>
                <p><strong>기관명</strong><br />{org?.name || p.organization || '기관 없음'}</p>
                <p><strong>대표전화</strong><br />{org?.phone || p.phone || '연락처 없음'}</p>
                <p><strong>주소</strong><br />{org?.address || '주소 없음'}</p>
                <p><strong>담당자</strong><br />{org?.contact_person || '담당자 없음'}</p>
              </div>
            </div>

            <div className="detail-actions">
              {(org?.phone || p.phone) && (
                <a href={`tel:${org?.phone || p.phone}`}>
                  <button className="btn btn-primary">전화하기</button>
                </a>
              )}

              {isAdmin && (
                <>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleEditProgram(p)}
                  >
                    수정
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDeleteProgram(p.id)}
                  >
                    삭제
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <img src="/logo.png" alt="logo" />
          </div>
          <div>
            <div className="brand-title">금산교육지원청</div>
            <div className="brand-sub">학생맞춤통합지원</div>
          </div>
        </div>

        <nav className="nav">
          <button
            className={`nav-btn ${viewMode === 'recommend' ? 'active' : ''}`}
            onClick={() => {
              setViewMode('recommend');
              setSelectedProgram(null);
            }}
          >
            추천 보기
          </button>

          <button
            className={`nav-btn ${viewMode === 'all' ? 'active' : ''}`}
            onClick={() => setViewMode('all')}
          >
            전체 보기
          </button>

          <button
            className={`nav-btn ${viewMode === 'organization' ? 'active' : ''}`}
            onClick={() => setViewMode('organization')}
          >
            기관별 보기
          </button>
        </nav>

        <div className="sidebar-bottom">
          {isAdmin ? (
            <button className="btn btn-secondary full" onClick={handleLogout}>
              로그아웃
            </button>
          ) : (
            <button className="btn btn-primary full" onClick={handleLogin}>
              관리자 로그인
            </button>
          )}
        </div>
      </aside>

      <main className="main">
        <section className="hero">
          <div>
            <h1>학생 상황에 맞는 복지 사업을 빠르게 찾으세요</h1>
            <p>
              연령, 성별, 학령, 상황 태그를 바탕으로 관련 사업을 추천하고
              유관기관까지 바로 연결합니다.
            </p>
          </div>
          <div className="hero-stat">
            <div className="stat-card">
              <span>기관 수</span>
              <strong>{organizations.length}</strong>
            </div>
            <div className="stat-card">
              <span>사업 수</span>
              <strong>{programs.length}</strong>
            </div>
            <div className="stat-card">
              <span>태그 수</span>
              <strong>{activeTags.length}</strong>
            </div>
          </div>
        </section>

        {viewMode === 'recommend' && (
          <>
            <section className="result-head" ref={resultRef}>
              <div>
                <h2>추천 사업</h2>
                <p>선택한 조건과 태그를 기반으로 추천됩니다</p>
              </div>
              <div className="result-count">
                {recommendedPrograms.length}개 결과
              </div>
            </section>

            {isAdmin && recommendedPrograms.length > 0 && (
              <section className="panel" style={{ marginBottom: 16 }}>
                <div className="action-row">
                  <button
                    className="btn btn-secondary"
                    onClick={() =>
                      setSelectedProgramIds(recommendedPrograms.map((p) => p.id))
                    }
                  >
                    추천 목록 전체 선택
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={() => setSelectedProgramIds([])}
                  >
                    선택 해제
                  </button>

                  <button
                    className="btn btn-danger"
                    onClick={handleDeleteSelectedPrograms}
                  >
                    선택 삭제 ({selectedProgramIds.length})
                  </button>
                </div>
              </section>
            )}

            {recommendedPrograms.length === 0 ? (
              <div className="empty-state">
                <h3>아직 추천 결과가 없습니다</h3>
                <p>아래에서 조건이나 태그를 입력해보세요</p>
              </div>
            ) : (
              <div className="cards scroll-box recommend-scroll">

  {Object.entries(groupedPrograms).map(([tag, orgs]) => {
  const totalCount = Object.values(orgs).flat().length;
  const isOpen = openTag === tag;
  const isHighRisk = HIGH_RISK_TAGS.includes(tag);
  const isMediumRisk = MEDIUM_RISK_TAGS.includes(tag);

  return (
    <div key={tag} className="tag-section">
      <button
        type="button"
        className={`tag-header ${isHighRisk ? 'high-risk' : ''} ${isMediumRisk ? 'medium-risk' : ''}`}
        onClick={() => setOpenTag((prev) => (prev === tag ? null : tag))}
      >
        <span className="tag-title">
          {isHighRisk && '🚨 '}
          {isMediumRisk && '⚠️ '}
          #{tag} 관련 지원 ({totalCount})
        </span>

        <span className="tag-toggle">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <div className="tag-section-scroll">
          {Object.entries(orgs).map(([orgName, programs]) => (
            <div key={orgName} className="org-group">
              <h4 className="org-title">
                {orgName} ({programs.length})
              </h4>

              <div className="program-list">
                {programs.map((p) => (
                  <div key={p.id} className="program-simple">
                    <button
                      type="button"
                      className="program-simple-title"
                      onClick={() =>
                        setOpenProgramId((prev) => (prev === p.id ? null : p.id))
                      }
                    >
                      {p.name}
                    </button>

                    {openProgramId === p.id && (
                      <div className="program-detail-box">
                        <p>{p.description || '설명 없음'}</p>
                        <p>📞 {p.phone || '연락처 없음'}</p>
                        <p>👤 {p.min_age ?? '무관'} ~ {p.max_age ?? '무관'}</p>
                        <p>🏫 {p.school_level || '무관'}</p>
                        <p>🏷 {p.tags?.join(', ') || '없음'}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
})}

</div>
            )}

            <section className="panel glass">
              <div className="panel-header">
                <h2>조건 설정</h2>
                <p>학생 정보를 입력하면 추천이 더 정확해집니다</p>
              </div>

              <div className="filter-grid">
                <input
                  className="field"
                  type="number"
                  placeholder="나이"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />

                <select
                  className="field"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">성별 선택</option>
                  <option value="남">남</option>
                  <option value="여">여</option>
                </select>

                <select
                  className="field"
                  value={schoolLevel}
                  onChange={(e) => setSchoolLevel(e.target.value)}
                >
                  <option value="">학령 선택</option>
                  <option value="초등">초등</option>
                  <option value="중등">중등</option>
                  <option value="고등">고등</option>
                  <option value="학교밖">학교밖</option>
                  <option value="무관">무관</option>
                </select>
              </div>

              <div className="search-row">
                <input
                  className="field full"
                  placeholder="상황을 자유롭게 입력하세요 (예: 우울, 가정문제, 경제적으로 어려움)"
                  value={searchText}
                  onChange={(e) => handleLiveCaseInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setTimeout(() => {
                        resultRef.current?.scrollIntoView({
                          behavior: 'smooth',
                        });
                      }, 100);
                    }
                  }}
                />

                <button
                  className="btn btn-primary"
                  onClick={() => {
                    autoTagging(searchText);
                    setTimeout(() => {
                      resultRef.current?.scrollIntoView({
                        behavior: 'smooth',
                      });
                    }, 100);
                  }}
                >
                  태그 반영
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={handleResetRecommendFilters}
                >
                  조건 초기화
                </button>
              </div>

              <section className="panel sub-panel">
                <div className="panel-header compact">
                  <h3>태그 선택</h3>
                  <p>자동 태그 + 직접 선택 가능</p>
                </div>

                <input
                  className="field full"
                  placeholder="태그 검색"
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                />

                {selectedTags.length > 0 && (
                  <div className="chip-wrap">
                    {selectedTags.map((tag) => (
                      <span key={tag} className="chip">
                        {tag}
                        <button
                          className="chip-remove"
                          onClick={() => removeTagCompletely(tag)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="tag-groups">
                  {Object.entries(filteredGroupedTags).map(([category, items]) => (
                    <div key={category} className="tag-group">
                      <div className="tag-group-title">{category}</div>

                      <div className="tag-list">
                        {items.map((tag) => (
                          <label key={tag.id} className="tag-option">
                            <input
                              type="checkbox"
                              checked={selectedTags.includes(tag.name)}
                              onChange={() => toggleManualTag(tag.name)}
                            />
                            <span>{tag.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}

                  {Object.keys(filteredGroupedTags).length === 0 && (
                    <p className="empty-text">검색 결과 없음</p>
                  )}
                </div>
              </section>
            </section>
          </>
        )}

        {viewMode === 'all' && (
          <>
            <section className="result-head">
              <div>
                <h2>전체 사업 보기</h2>
                <p>기본 조건에 맞는 모든 사업을 탐색할 수 있습니다.</p>
              </div>
              <div className="result-count">{allPrograms.length}개 결과</div>
            </section>

            <div style={{ marginBottom: 16 }}>
  <input
    className="field full"
    placeholder="사업명, 기관명, 설명, 태그로 검색"
    value={allProgramSearch}
    onChange={(e) => setAllProgramSearch(e.target.value)}
  />
</div>

            {isAdmin && allPrograms.length > 0 && (
              <section className="panel" style={{ marginBottom: 16 }}>
                <div className="action-row">
                  <button
                    className="btn btn-secondary"
                    onClick={() =>
                      setSelectedProgramIds(allPrograms.map((p) => p.id))
                    }
                  >
                    전체 사업 선택
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={() => setSelectedProgramIds([])}
                  >
                    선택 해제
                  </button>

                  <button
                    className="btn btn-danger"
                    onClick={handleDeleteSelectedPrograms}
                  >
                    선택 삭제 ({selectedProgramIds.length})
                  </button>
                </div>
              </section>
            )}

            {allPrograms.length === 0 ? (
              <div className="empty-state">
                <h3>조건에 맞는 사업이 없습니다</h3>
              </div>
            ) : (
              <div className="cards scroll-box recommend-scroll">
                {allPrograms.map((p) => renderProgramCard(p))}
              </div>
            )}
          </>
        )}

        {viewMode === 'organization' && (
          <>
            <section className="panel glass">
              <div className="panel-header">
                <h2>기관별 사업 보기</h2>
                <p>기관명을 검색하거나 선택하면 해당 기관이 운영하는 사업만 볼 수 있습니다.</p>
              </div>

              <input
                className="field"
                placeholder="기관명 검색 (예: 금산, 청소년, 상담)"
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
                style={{ marginBottom: 12 }}
              />

              <p style={{ marginBottom: 12 }}>
                검색 결과: {filteredOrganizations.length}개
              </p>

              {filteredOrganizations.length === 0 ? (
                <p style={{ padding: 12 }}>검색 결과가 없습니다.</p>
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
                    {filteredOrganizations.slice(0, 20).map((org) => (
                      <button
                        key={org.id}
                        className="btn btn-secondary"
                        onClick={() => setSelectedOrganizationId(org.id)}
                      >
                        {org.name}
                      </button>
                    ))}
                  </div>

                  <select
                    className="field"
                    value={selectedOrganizationId}
                    onChange={(e) => setSelectedOrganizationId(e.target.value)}
                  >
                    <option value="">기관 선택</option>
                    {filteredOrganizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </section>

            {selectedOrganizationId && (
              <>
                <section className="panel">
                  {(() => {
                    const org = getOrganizationById(selectedOrganizationId);
                    return (
                      <div className="org-hero">
                        <div>
                          <h2>{org?.name || '기관 없음'}</h2>
                          <p>📞 {org?.phone || '연락처 없음'}</p>
                          <p>{org?.address || '주소 없음'}</p>
                          <p>담당자: {org?.contact_person || '담당자 없음'}</p>
                        </div>
                      </div>
                    );
                  })()}
                </section>

                <section className="result-head">
                  <div>
                    <h2>이 기관의 사업</h2>
                  </div>
                  <div className="result-count">
                    {organizationPrograms.length}개
                  </div>
                </section>

                {organizationPrograms.length === 0 ? (
                  <div className="empty-state">
                    <h3>등록된 사업이 없습니다</h3>
                  </div>
                ) : (
                  <div className="cards scroll-box recommend-scroll">
                    {organizationPrograms.map((p) => renderProgramCard(p))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {isAdmin && (
          <section className="admin-section">
            <div className="admin-head">
              <h2>관리자 센터</h2>
              <p>사업, 기관, 태그, 엑셀 업로드를 한 곳에서 관리합니다.</p>
            </div>

            <div className="action-row" style={{ marginBottom: 16 }}>
              <button
                className="btn btn-secondary"
                onClick={handleExportOrganizations}
              >
                기관 리스트 엑셀 다운로드
              </button>

              <button
                className="btn btn-secondary"
                onClick={handleExportPrograms}
              >
                사업 리스트 엑셀 다운로드
              </button>
            </div>

            <div className="admin-grid">
              <div className="panel admin-panel-scroll" ref={formRef}>
                <div className="panel-header compact">
                  <h3>{editingId ? '사업 수정 중' : '사업 추가'}</h3>
                  {editingId && (
                    <p style={{ color: '#1d4ed8', fontWeight: 700 }}>
                      현재 선택한 사업을 수정 중입니다.
                    </p>
                  )}
                </div>

                <div className="form-grid">
                  <input
                    className="field"
                    placeholder="사업명"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />

                  <select
                    className="field"
                    value={form.organization_id}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedOrg = organizations.find(
                        (org) => String(org.id) === String(selectedId)
                      );

                      setForm((prev) => ({
                        ...prev,
                        organization_id: selectedId,
                        organization: selectedOrg ? selectedOrg.name : '',
                      }));
                    }}
                  >
                    <option value="">기관 선택</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>

                  <input
                    className="field"
                    placeholder="전화번호"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />

                  <input
                    className="field"
                    placeholder="설명"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />

                  <input
                    className="field"
                    type="number"
                    placeholder="최소 연령"
                    value={form.min_age}
                    onChange={(e) =>
                      setForm({ ...form, min_age: e.target.value })
                    }
                  />

                  <input
                    className="field"
                    type="number"
                    placeholder="최대 연령"
                    value={form.max_age}
                    onChange={(e) =>
                      setForm({ ...form, max_age: e.target.value })
                    }
                  />

                  <select
                    className="field"
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  >
                    <option value="무관">성별 무관</option>
                    <option value="남">남</option>
                    <option value="여">여</option>
                  </select>

                  <select
                    className="field"
                    value={form.school_level}
                    onChange={(e) =>
                      setForm({ ...form, school_level: e.target.value })
                    }
                  >
                    <option value="무관">학령 무관</option>
                    <option value="초등">초등</option>
                    <option value="중등">중등</option>
                    <option value="고등">고등</option>
                    <option value="학교밖">학교밖</option>
                  </select>
                </div>

                <div className="tag-groups admin-tags">
                  {Object.entries(groupedActiveTags).map(([category, items]) => (
                    <div key={category} className="tag-group">
                      <div className="tag-group-title">{category}</div>
                      <div className="tag-list">
                        {items.map((tag) => (
                          <label key={tag.id} className="tag-option">
                            <input
                              type="checkbox"
                              checked={form.tags.includes(tag.name)}
                              onChange={() => {
                                setForm((prev) => ({
                                  ...prev,
                                  tags: prev.tags.includes(tag.name)
                                    ? prev.tags.filter((t) => t !== tag.name)
                                    : [...prev.tags, tag.name],
                                }));
                              }}
                            />
                            <span>{tag.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="action-row">
                  <button className="btn btn-primary" onClick={handleSaveProgram}>
                    {editingId ? '수정 저장' : '사업 추가'}
                  </button>
                  {editingId && (
                    <button className="btn btn-secondary" onClick={resetForm}>
                      수정 취소
                    </button>
                  )}
                </div>
              </div>

              <div className="panel" ref={orgFormRef}>
                <div className="panel-header compact">
                  <h3>{orgEditingId ? '기관 수정 중' : '기관 추가'}</h3>
                  {orgEditingId && (
                    <p style={{ color: '#1d4ed8', fontWeight: 700 }}>
                      현재 선택한 기관을 수정 중입니다.
                    </p>
                  )}
                </div>

                <div className="form-grid">
                  <input
                    className="field"
                    placeholder="기관명"
                    value={orgForm.name}
                    onChange={(e) =>
                      setOrgForm({ ...orgForm, name: e.target.value })
                    }
                  />
                  <input
                    className="field"
                    placeholder="기관 전화번호"
                    value={orgForm.phone}
                    onChange={(e) =>
                      setOrgForm({ ...orgForm, phone: e.target.value })
                    }
                  />
                  <input
                    className="field"
                    placeholder="주소"
                    value={orgForm.address}
                    onChange={(e) =>
                      setOrgForm({ ...orgForm, address: e.target.value })
                    }
                  />
                  <input
                    className="field"
                    placeholder="담당자"
                    value={orgForm.contact_person}
                    onChange={(e) =>
                      setOrgForm({
                        ...orgForm,
                        contact_person: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="action-row">
                  <button
                    className="btn btn-primary"
                    onClick={handleSaveOrganization}
                  >
                    {orgEditingId ? '기관 수정 저장' : '기관 추가'}
                  </button>
                  {orgEditingId && (
                    <button className="btn btn-secondary" onClick={resetOrgForm}>
                      기관 수정 취소
                    </button>
                  )}
                </div>
              </div>

              <div className="panel">
                <div className="panel-header compact">
                  <h3>{tagEditingId ? '태그 수정' : '태그 추가'}</h3>
                </div>

                <div className="form-grid">
                  <input
                    className="field"
                    placeholder="태그명"
                    value={tagForm.name}
                    onChange={(e) =>
                      setTagForm({ ...tagForm, name: e.target.value })
                    }
                  />

                  <input
                    className="field"
                    placeholder="카테고리 (예: 경제, 가정, 정서)"
                    value={tagForm.category}
                    onChange={(e) =>
                      setTagForm({ ...tagForm, category: e.target.value })
                    }
                  />

                  <label className="switch-row">
                    <input
                      type="checkbox"
                      checked={tagForm.is_active}
                      onChange={(e) =>
                        setTagForm({ ...tagForm, is_active: e.target.checked })
                      }
                    />
                    <span>활성 태그</span>
                  </label>
                </div>

                <div className="action-row">
                  <button className="btn btn-primary" onClick={handleSaveTag}>
                    {tagEditingId ? '태그 수정 저장' : '태그 추가'}
                  </button>
                  {tagEditingId && (
                    <button className="btn btn-secondary" onClick={resetTagForm}>
                      태그 수정 취소
                    </button>
                  )}
                </div>
              </div>

              <div className="panel">
                <div className="panel-header compact">
                  <h3>기관 엑셀 업로드</h3>
                  <p>헤더: 기관명 / 전화번호 / 주소 / 담당자</p>
                </div>

                <input
                  className="field full"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleOrgExcelSelect}
                />

                <div className="action-row">
                  <button
                    className="btn btn-primary"
                    onClick={handleUploadOrganizations}
                  >
                    기관 업로드 실행
                  </button>
                </div>

                {orgUploadPreview.length > 0 && (
                  <div className="preview-list scroll-box">
                    {orgUploadPreview.slice(0, 10).map((row, index) => (
                      <div key={`${row.name}-${index}`} className="preview-item">
                        <strong>{row.name}</strong>
                        <span>{row.phone || '연락처 없음'}</span>
                        <span>{row.address || '주소 없음'}</span>
                        <span>{row.contact_person || '담당자 없음'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="panel">
                <div className="panel-header compact">
                  <h3>사업 엑셀 업로드</h3>
                  <p>
                    헤더: 사업명 / 기관명 / 전화번호 / 설명 / 태그 / 최소연령 / 최대연령 / 성별 / 학령
                  </p>
                </div>

                <input
                  className="field full"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleProgramExcelSelect}
                />

                <div className="action-row">
                  <button
                    className="btn btn-primary"
                    onClick={handleUploadPrograms}
                  >
                    사업 업로드 실행
                  </button>
                </div>

                {programUploadPreview.length > 0 && (
                  <div className="preview-list scroll-box">
                    {programUploadPreview.slice(0, 10).map((row, index) => (
                      <div key={`${row.name}-${index}`} className="preview-item">
                        <strong>{row.name}</strong>
                        <span>기관: {row.organization || '없음'}</span>
                        <span>매칭: {row.orgMatched ? '성공' : '실패'}</span>
                        <span>태그: {row.tags.join(', ') || '없음'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="panel">
                <div className="panel-header compact">
                  <h3>기관 목록</h3>
                  <input
                    className="field"
                    placeholder="기관명 검색 (예: 금산, 청소년)"
                    value={adminOrgSearch}
                    onChange={(e) => setAdminOrgSearch(e.target.value)}
                    style={{ marginBottom: 12 }}
                  />
                </div>

                <div className="action-row" style={{ marginBottom: 12 }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() =>
                      setSelectedOrganizationIds(
                        filteredAdminOrganizations.map((org) => org.id)
                      )
                    }
                  >
                    기관 전체 선택
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={() => setSelectedOrganizationIds([])}
                  >
                    선택 해제
                  </button>

                  <button
                    className="btn btn-danger"
                    onClick={handleDeleteSelectedOrganizations}
                  >
                    선택 삭제 ({selectedOrganizationIds.length})
                  </button>
                </div>

                <div className="simple-list scroll-box">
                  {filteredAdminOrganizations.length === 0 && (
                    <p style={{ padding: 20 }}>검색 결과가 없습니다.</p>
                  )}

                  {filteredAdminOrganizations.map((org) => (
                    <div key={org.id} className="simple-item">
                      <div>
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <input
                              type="checkbox"
                              checked={selectedOrganizationIds.includes(org.id)}
                              onChange={() => {
                                setSelectedOrganizationIds((prev) =>
                                  prev.includes(org.id)
                                    ? prev.filter((id) => id !== org.id)
                                    : [...prev, org.id]
                                );
                              }}
                            />
                            <span>선택</span>
                          </label>
                        </div>

                        <strong>{org.name}</strong>
                        <p>{org.phone || '연락처 없음'}</p>
                        <p>{org.address || '주소 없음'}</p>
                        <p>담당자: {org.contact_person || '담당자 없음'}</p>
                      </div>

                      <div className="action-row">
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleEditOrganization(org)}
                        >
                          수정
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleDeleteOrganization(org.id)}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="panel-header compact">
                  <h3>태그 목록</h3>

                  <input
                    className="field"
                    placeholder="태그명 또는 카테고리 검색"
                    value={adminTagSearch}
                    onChange={(e) => setAdminTagSearch(e.target.value)}
                    style={{ marginTop: 10 }}
                  />
                </div>

                <div className="simple-list scroll-box">
                  {filteredAdminTags.length === 0 && (
                    <p style={{ padding: 20 }}>검색 결과가 없습니다.</p>
                  )}

                  {filteredAdminTags.map((tag) => (
                    <div key={tag.id} className="simple-item">
                      <div>
                        <strong>
                          {tag.name} {tag.is_active ? '' : '(비활성)'}
                        </strong>
                        <p>카테고리: {tag.category || '없음'}</p>
                      </div>
                      <div className="action-row">
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleEditTag(tag)}
                        >
                          수정
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleDeactivateTag(tag.id)}
                        >
                          비활성화
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleDeleteTag(tag.id)}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;