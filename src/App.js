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

//테스트용
const TEST_CASES = [
  // =========================
  // 1. 감정 단독
  // =========================
  { input: '너무 힘들어요', expected: ['우울'] },
  { input: '요즘 스트레스가 너무 많아요', expected: ['우울'] },
  { input: '아무것도 하기 싫어요', expected: ['무기력', '우울'] },
  { input: '기운이 없고 너무 지쳐요', expected: ['무기력', '우울'] },

  // =========================
  // 2. 학교폭력
  // =========================
  { input: '친구들이 자꾸 괴롭혀요', expected: ['학교폭력'] },
  { input: '친구들이 욕하고 무시해요', expected: ['학교폭력'] },
  { input: '학교에서 맞고 왔어요', expected: ['학교폭력'] },
  { input: '친구들이 놀리고 따돌려요', expected: ['학교폭력'] },
  { input: '외모 때문에 놀림받고 있어요', expected: ['학교폭력', '불안'] },

  // =========================
  // 3. 학교 회피 / 학업중단위기
  // =========================
  { input: '학교 가기 싫어요', expected: ['학업중단위기'] },
  { input: '학교 나가기 싫어요', expected: ['학업중단위기'] },
  { input: '학교 가기 무서워요', expected: ['학업중단위기', '불안'] },
  { input: '등교하기 너무 싫어요', expected: ['학업중단위기'] },
  { input: '친구들이 괴롭혀서 학교 가기 싫어요', expected: ['학교폭력', '학업중단위기'] },

  // =========================
  // 4. 학업 / 학습
  // =========================
  { input: '공부가 너무 어려워요', expected: ['교과부족'] },
  { input: '공부 때문에 스트레스 받아요', expected: ['교과부족', '우울'] },
  { input: '성적이 계속 떨어지고 있어요', expected: ['교과부족'] },
  { input: '수업을 따라가기 힘들어요', expected: ['교과부족'] },
  { input: '읽기와 쓰기가 너무 어려워요', expected: ['기초학습부족'] },
  { input: '기초학습이 부족해서 수업을 못 따라가요', expected: ['기초학습부족'] },

  // =========================
  // 5. ADHD / 집중 / 행동
  // =========================
  { input: '수업 시간에 집중을 못해요', expected: ['ADHD'] },
  { input: '가만히 있지 못하고 계속 움직여요', expected: ['ADHD'] },
  { input: '충동적으로 행동하는 경우가 많아요', expected: ['ADHD'] },
  { input: '너무 산만해서 공부가 안돼요', expected: ['ADHD'] },

  // =========================
  // 6. 경제 / 생활
  // =========================
  { input: '집이 너무 가난해서 힘들어요', expected: ['경제적어려움'] },
  { input: '생활비가 부족해요', expected: ['경제적어려움'] },
  { input: '돈이 없어서 힘들어요', expected: ['경제적어려움'] },
  { input: '경제적으로 너무 힘들어요', expected: ['경제적어려움'] },
  { input: '가정 형편이 어려워서 생활비가 부족함', expected: ['경제적어려움'] },
  { input: '밥을 제대로 못 먹어요', expected: ['결식'] },

  // =========================
  // 7. 가정 문제 / 부모 부재
  // =========================
  { input: '부모님이 자주 싸워요', expected: ['가정급변'] },
  { input: '집안 분위기가 너무 안 좋아요', expected: ['가정급변'] },
  { input: '부모님이 집에 안 계세요', expected: ['부모부재'] },
  { input: '혼자 집에 있는 시간이 많아요', expected: ['부모부재'] },

  // =========================
  // 8. 가족돌봄
  // =========================
  { input: '동생을 돌보느라 힘들어요', expected: ['가족돌봄청소년'] },
  { input: '가족을 돌보느라 학교생활이 어려워요', expected: ['가족돌봄청소년', '학업중단위기'] },
  { input: '동생을 돌보느라 학교생활이 너무 힘들어요', expected: ['가족돌봄청소년', '학업중단위기'] },
  { input: '부모를 대신해 동생을 키우고 있어요', expected: ['가족돌봄청소년'] },
  { input: '동생을 돌보느라 공부를 못하고 있어요', expected: ['가족돌봄청소년', '교과부족'] },

  // =========================
  // 9. 다문화 / 언어
  // =========================
  { input: '한국어가 어려워서 수업을 못 따라가요', expected: ['다문화', '기초학습부족'] },
  { input: '한국어가 서툴러서 수업 따라가기 힘들어요', expected: ['다문화', '기초학습부족'] },
  { input: '외국인이라 친구 관계가 어려워요', expected: ['다문화', '불안'] },
  { input: '다문화라 학교생활이 힘들어요', expected: ['다문화', '기초학습부족'] },
  { input: '한국어가 어려워서 친구도 없고 힘들어요', expected: ['다문화', '불안'] },

  // =========================
  // 10. 관계 / 정서
  // =========================
  { input: '또래 관계 갈등이 있고 정서적으로 위축된 모습 보임', expected: ['불안'] },
  { input: '친구 관계가 어려워서 많이 위축되어 있어요', expected: ['불안'] },
  { input: '친구 관계도 어렵고 공부도 힘들어요', expected: ['교과부족', '우울'] },

  // =========================
  // 11. 혼합
  // =========================
  { input: '경제적으로 힘들어서 공부에 집중이 안 돼요', expected: ['경제적어려움', '교과부족'] },
  { input: '부모 갈등과 경제적 어려움으로 정서적으로 불안함', expected: ['가정급변', '경제적어려움', '불안'] },
  { input: '친구들이 괴롭혀서 학교 가기 싫고 너무 무서워요', expected: ['학교폭력', '학업중단위기', '불안'] },

  // =========================
  // 12. 위험군
  // =========================
  { input: '죽고 싶다는 말을 자주 해요', expected: ['자살위험'] },
  { input: '자해를 시도한 적이 있어요', expected: ['자해위험'] },
];



const CORE_PROBLEM_TAGS = [
  '학교폭력',
  '학대방임',
  '성폭력',
  '우울',
  '불안',
  '무기력',
  '학업중단위기',
  '교과부족',
  '기초학습부족',
  'ADHD',
  '경제적어려움',
  '가정급변',
  '가족돌봄청소년'
];

const CONTEXT_TAGS = [
  '한부모',
  '다문화',
  '장애',
  '기초생활수급자',
  '법정차상위',
  '기타저소득',
  '조부모가정',
  '부모부재'
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
  자살위험: [
    '자살', '죽고싶', '죽고싶다',
    '극단선택', '삶을포기',
    '사라지고싶', '끝내고싶', '살기싫'
  ],

  자해위험: [
    '자해', '자해시도',
    '손목긋', '몸을해침',
    '자기몸을해침'
  ],

  학교폭력: [
    '학교폭력',
    '따돌림', '왕따',
    '괴롭',
    '놀리', '놀림',
    '폭행', '때리', '맞고', '맞음',
    '욕', '욕하', '욕먹',
    '무시', '배척',
    'bullying',
      '폭력을당함', '맞았', '맞아요', '맞음', '폭행당함'
  ],

  학대방임: [
    '학대', '방임', '방치', '유기',
    '보호받지못', '돌봄없', '혼자방치'
  ],

  성폭력: [
    '성폭력', '성추행', '성희롱',
    '성적피해', '성적학대'
  ],

  경제적어려움: [
    '경제적어려움', '경제적으로어려움',
    '형편이어려움', '생활이어려움',
    '돈이없', '돈없', '가난',
    '생계곤란', '생활비부족',
    '경제적으로힘들', '형편이안좋'
  ],

  결식: [
    '결식', '밥을못', '굶', '끼니', '식사를못'
  ],

  기초생활수급자: [
    '기초생활수급자', '수급자',
    '생계급여', '의료급여'
  ],

  법정차상위: ['차상위', '법정차상위'],
  기타저소득: ['저소득'],

  우울: [
    '우울', '우울감',
    '힘들', '지쳤', '버겁', '답답',
    '의욕없', '재미없', '의미없',
    '무기력', '기운없',
    '아무것도하기싫',
    '스트레스','우울증'
  ],

  불안: [
    '불안', '초조', '긴장', '걱정',
    '두려움', '겁', '불안정',
    '조마조마', '무서워', '겁난다',
    '자신감없', '자존감낮',
    '위축', '위축됨', '눈치'
  ],

  분노폭력: [
    '분노', '화를참지',
    '공격적', '난폭',
    '짜증', '화남', '화나', '예민',
    '신경질', '분노조절'
  ],

  무기력: [
    '무기력', '기운없',
    '의욕없', '축처짐',
    '움직이기싫', '하기싫',
    '아무것도못', '멍함'
  ],

  학업중단위기: [
  '학교를그만', '자퇴', '퇴학', '등교거부',
  '학교안가', '학교가기싫', '학교가기가싫',
  '학교나가기싫', '나가기싫',
  '결석'
],

  기초학습부족: [
    '기초학습부족', '기초학습',
    '읽기어려움', '쓰기어려움',
    '셈하기어려움', '기초가부족'
  ],

  교과부족: [
    '학습부진', '성적저하',
    '공부를못', '성적이낮',
    '성적이떨어'
  ],

  ADHD: [
    'adhd', '주의력결핍',
    '과잉행동', '집중못', '산만',
    '충동', '가만히있지못'
  ],

  학교밖청소년: [
    '학교밖', '검정고시', '학교밖청소년'
  ],

  가정급변: [
    '이혼', '별거', '실직',
    '보호자사망', '가정불화',
    '집안문제', '가정위기',
    '부모갈등', '부모싸움'
  ],

  부모부재: [
  '부모없', '보호자없',
  '부모부재', '혼자지냄',
  '집에안계', '집에안있', '안계세요'
],

  가족돌봄청소년: [
  '가족돌봄', '간병',
  '부모를돌보', '동생을돌보',
  '가족을돌보', '형제를돌보',
  '돌보느라', '돌보면서',
  '동생을키우', '대신키우'
],

  양육환경위기: [
    '양육어려움', '양육이안됨', '돌봄공백'
  ],

  조부모가정: [
    '조부모', '조손', '할머니와', '할아버지와'
  ],

  친척돌봄: [
    '친척이돌봄',
    '삼촌이키움', '이모가키움', '고모가키움'
  ],

  한부모: [
    '한부모', '편부모', '편모', '편부'
  ],

  시설보호: [
    '시설보호', '보호시설', '쉼터', '그룹홈'
  ],

  다문화: [
    '다문화', '외국인',
    '이주배경', '국제결혼', '한국어가서툴'
  ],

  장애: [
    '장애', '장애인', '발달장애', '지적장애', '자폐'
  ],

  질병: [
    '질병', '병이있', '만성질환', '몸이아파', '아파요', '아픔', '병원', '치료중', '몸이안좋'
],
  

마약: [
  '마약', '약물', '약물중독', '필로폰', '대마', '흡입'
],

도박: [
  '도박', '도박문제', '불법토토', '토토', '베팅', '도박중독'
],

도벽: [
  '도벽', '물건을훔침', '훔치는버릇', '절도습관'
],

도난: [
  '도난', '물건을도둑맞', '도둑맞', '절도피해'
],

주거위기: [
  '살집이없', '집이없', '노숙', '갈곳이없', '잘곳이없', '주거불안'
],

조현병: [
  '조현병', '환청', '망상', '정신증'
],

조울증: [
  '조울증', '양극성', '조증', '기분이너무들뜸'
],



  비만: [
    '비만', '과체중',
    '체중증가', '살이쪘',
    '뚱뚱', '외모'
  ],

  북한이탈주민: ['탈북', '북한이탈', '북한에서'],
  난민: ['난민'],
  기타: ['기타']
};

const TAG_PATTERN_MAP = {
  자살위험: [
    '사는게의미가없',
    '살고싶지않',
    '그만살고싶',
    '사라지고싶',
    '모든걸끝내고싶'
  ],

  우울: [
    '아무것도하기싫',
    '기운이없',
    '너무힘들',
    '의욕이없',
    '너무버겁'
  ],

  불안: [
    '계속걱정',
    '마음이불안',
    '긴장된다',
    '무서워',
    '겁난다'
  ],

  학교폭력: [
    '친구가괴롭',
    '친구들이괴롭',
    '친구가욕',
    '친구들이욕',
    '친구가때리',
    '친구들이때리',
    '친구가무시',
    '친구들이무시',
    '학교에서괴롭',
    '학교에서따돌림'
  ],

  경제적어려움: [
    '생활이어렵',
    '돈이부족',
    '경제적으로힘들',
    '형편이안좋'
  ]
};

const normalizeCaseText = (text) => {
  return String(text || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[.,!?]/g, '');
};

function App() {
const [showTestPanel, setShowTestPanel] = useState(false);




  //테스트용
  const [programs, setPrograms] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [tags, setTags] = useState([]);
const [hasSavedCaseLog, setHasSavedCaseLog] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

const saveCaseLog = async ({
  searchText,
  autoTags,
  finalTags,
  minAge,
  maxAge,
  gender,
  schoolLevel
}) => {
  try {
    const { error } = await supabase.from('case_logs').insert([
      {
        input_text: searchText,
        auto_tags: autoTags,
        final_tags: finalTags,
        min_age: minAge,
        max_age: maxAge,
        gender,
        school_level: schoolLevel
      }
    ]);

    if (error) {
      console.error('❌ 사례 저장 실패:', error);
    } else {
      console.log('✅ 사례 저장 완료');
    }
  } catch (err) {
    console.error('❌ 저장 중 오류:', err);
  }
};





  

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

  const [newTagCategory, setNewTagCategory] = useState('');

  const [orgUploadPreview, setOrgUploadPreview] = useState([]);
  const [programUploadPreview, setProgramUploadPreview] = useState([]);

  const resultRef = useRef(null);

  const ADMIN_EMAIL = 'gsadmin@ai.cne.go.kr';
  const isAdmin = user?.email === ADMIN_EMAIL;

  const selectedTags = useMemo(() => {
    return [...new Set([...autoSelectedTags, ...manualSelectedTags])];
  }, [autoSelectedTags, manualSelectedTags]);

useEffect(() => {
  if (!searchText.trim()) return;
  if (selectedTags.length === 0) return;
  if (hasSavedCaseLog) return;

  saveCaseLog({
    inputText: searchText,
    autoTags: extractTagsFromText(searchText),
    finalTags: selectedTags,
    age,
    gender,
    schoolLevel,
  });

  setHasSavedCaseLog(true);
}, [selectedTags, searchText, age, gender, schoolLevel, hasSavedCaseLog]);
  

  useEffect(() => {
    fetchPrograms();
    fetchOrganizations();
    fetchTags();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  // 👉 입력 바뀌면 저장 초기화
useEffect(() => {
  setHasSaved(false);
}, [searchText]);

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
  const normalized = normalizeCaseText(text);
  const found = [];

  const addTag = (tag) => {
    if (!validTagNames.has(tag)) return;
    found.push(tag);
  };

const saveCaseLog = async ({
  searchText,
  autoTags,
  finalTags,
  age,
  gender,
  schoolLevel,
}) => {
  try {
    const { error } = await supabase.from('case_logs').insert([
      {
        input_text: searchText,
        auto_tags: autoTags,
        final_tags: finalTags,
        min_age: age === '' ? null : Number(age),
        max_age: age === '' ? null : Number(age),
        gender: gender || null,
        school_level: schoolLevel || null,
      },
    ]);

    if (error) {
      console.error('❌ 사례 저장 실패:', error);
    } else {
      console.log('✅ 사례 저장 완료');
    }
  } catch (err) {
    console.error('❌ 저장 중 오류:', err);
  }
};
  
  const hasTag = (tag) => found.includes(tag);

  // 1) 기본 키워드 매칭
  Object.entries(TAG_KEYWORD_MAP).forEach(([tag, keywords]) => {
    if (!validTagNames.has(tag)) return;

    const matched = keywords.some((keyword) => {
      const normalizedKeyword = normalizeCaseText(keyword);
      return normalized.includes(normalizedKeyword);
    });

    if (matched) addTag(tag);
  });

  // 2) 패턴 매칭
  Object.entries(TAG_PATTERN_MAP).forEach(([tag, patterns]) => {
    if (!validTagNames.has(tag)) return;

    const matched = patterns.some((pattern) => {
      const normalizedPattern = normalizeCaseText(pattern);
      return normalized.includes(normalizedPattern);
    });

    if (matched) addTag(tag);
  });

  // 3) 꼭 필요한 조합 룰

  // 친구 괴롭힘 + 학교 가기 싫음 -> 학교폭력 + 학업중단위기
  if (
    (normalized.includes('괴롭') || normalized.includes('따돌') || normalized.includes('왕따')) &&
    (normalized.includes('학교가기싫') || normalized.includes('학교가기가싫') || normalized.includes('등교거부'))
  ) {
    addTag('학교폭력');
    addTag('학업중단위기');
  }

  // 친구/학교 + 폭력성 표현 -> 학교폭력
  if (
    (normalized.includes('친구') || normalized.includes('학교')) &&
    (
      normalized.includes('괴롭') ||
      normalized.includes('때리') ||
      normalized.includes('욕') ||
      normalized.includes('무시') ||
      normalized.includes('놀리') ||
      normalized.includes('따돌') ||
      normalized.includes('왕따')
    )
  ) {
    addTag('학교폭력');
  }

  // 학교폭력 + 불안/회피
  if (
    hasTag('학교폭력') &&
    (
      normalized.includes('무섭') ||
      normalized.includes('불안') ||
      normalized.includes('학교가기싫') ||
      normalized.includes('학교가기무섭')
    )
  ) {
    addTag('불안');
    addTag('학업중단위기');
  }


if (
  normalized.includes('학교가기무서') ||
  normalized.includes('등교하기싫')
) {
  addTag('학업중단위기');
}

if (normalized.includes('학교가기무서')) {
  addTag('불안');
}

// 🔥 관계 + 고립 → 불안
if (
  normalized.includes('친구') &&
  (
    normalized.includes('어렵') ||
    normalized.includes('없') ||
    normalized.includes('힘들') ||
    normalized.includes('위축')
  )
) {
  addTag('불안');
}


// 🔥 가정 갈등
if (
  normalized.includes('부모') &&
  (
    normalized.includes('싸우') ||
    normalized.includes('갈등')
  )
) {
  addTag('가정급변');
}

// 🔥 집안 분위기
if (
  normalized.includes('집안') &&
  normalized.includes('분위기') &&
  (
    normalized.includes('안좋') ||
    normalized.includes('나쁘')
  )
) {
  addTag('가정급변');
}

  // 학교에서 맞고 옴 -> 학교폭력, 학대방임 제거
  if (
    hasTag('학대방임') &&
    (normalized.includes('학교') || normalized.includes('친구'))
  ) {
    const idx = found.indexOf('학대방임');
    if (idx !== -1) found.splice(idx, 1);
  }

  // 공부 + 스트레스
  if (
    normalized.includes('공부') &&
    normalized.includes('스트레스')
  ) {
    addTag('교과부족');
    addTag('우울');
  }

  // 공부 + 힘듦/어려움
  if (
    normalized.includes('공부') &&
    (
      normalized.includes('힘들') ||
      normalized.includes('어려') ||
      normalized.includes('버겁')
    )
  ) {
    addTag('교과부족');
  }

if (
  normalized.includes('수업시간') &&
  normalized.includes('집중을못')
) {
  addTag('ADHD');
}

  // 한국어 + 어려움 -> 다문화 + 기초학습부족
  if (
    normalized.includes('한국어') &&
    (
      normalized.includes('어려') ||
      normalized.includes('못') ||
      normalized.includes('힘들') ||
      normalized.includes('서툴')
    )
  ) {
    addTag('다문화');
    addTag('기초학습부족');
  }

  // 다문화 + 학교 적응 어려움
  if (
    normalized.includes('다문화') &&
    (
      normalized.includes('학교') ||
      normalized.includes('적응') ||
      normalized.includes('어려움') ||
      normalized.includes('힘들')
    )
  ) {
    addTag('다문화');
    addTag('기초학습부족');
  }

  // 읽기/쓰기/기초학습
  if (
    normalized.includes('기초학습') ||
    normalized.includes('읽기') ||
    normalized.includes('쓰기') ||
    normalized.includes('셈하기')
  ) {
    addTag('기초학습부족');
  }

  // 성적 저하
  if (
    normalized.includes('성적') &&
    (
      normalized.includes('떨어') ||
      normalized.includes('낮')
    )
  ) {
    addTag('교과부족');
  }

  // 충동/가만히 못 있음
  if (
    normalized.includes('충동') ||
    normalized.includes('가만히있지못') ||
    normalized.includes('행동문제')
  ) {
    addTag('ADHD');
  }

  // 동생/가족 돌봄
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
  (
    normalized.includes('키우') ||
    normalized.includes('돌보')
  )
) {
  addTag('가족돌봄청소년');
}

  // 돌봄 + 학교/학업/힘듦
  if (
    hasTag('가족돌봄청소년') &&
    (
      normalized.includes('학교') ||
      normalized.includes('학업') ||
      normalized.includes('일상유지') ||
      normalized.includes('어려움') ||
      normalized.includes('힘들')
    )
  ) {
    addTag('학업중단위기');
    addTag('우울');
  }

if (
  normalized.includes('수업') &&
  (
    normalized.includes('따라가기힘들') ||
    normalized.includes('못따라가') ||
    normalized.includes('어려')
  )
) {
  addTag('교과부족');
}

  // 경제 관련
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
    (
      normalized.includes('없') ||
      normalized.includes('부족') ||
      normalized.includes('힘들')
    )
  ) {
    addTag('경제적어려움');
  }

  if (
    normalized.includes('밥') &&
    normalized.includes('못')
  ) {
    addTag('결식');
  }

  if (hasTag('기타저소득')) {
    addTag('경제적어려움');
  }

  // 친구 관계 갈등 / 또래 관계
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
  (
    normalized.includes('가기싫') ||
    normalized.includes('나가기싫') ||
    normalized.includes('가기무섭') ||
    normalized.includes('가기두려') ||
    normalized.includes('결석') ||
    normalized.includes('등교거부')
  )
) {
  addTag('학업중단위기');
}
  
if (
  normalized.includes('학교나가기싫') ||
  normalized.includes('학교가기싫')
) {
  addTag('학업중단위기');
}

  // 놀림 + 위축
  if (
    normalized.includes('놀림') &&
    normalized.includes('위축')
  ) {
    addTag('학교폭력');
    addTag('불안');
  }

  // 외모/살 + 놀림
  if (
    (normalized.includes('살') || normalized.includes('외모')) &&
    (
      normalized.includes('놀림') ||
      normalized.includes('따돌림') ||
      normalized.includes('괴롭힘') ||
      normalized.includes('괴롭') ||
      normalized.includes('왕따') ||
      normalized.includes('무시')
    )
  ) {
    addTag('비만');
    addTag('학교폭력');
    addTag('불안');
  }

  // 부모 갈등 / 가정 문제
  if (
    normalized.includes('부모') &&
    (
      normalized.includes('싸움') ||
      normalized.includes('갈등')
    )
  ) {
    addTag('가정급변');
    addTag('우울');
  }

if (
  normalized.includes('부모') &&
  (
    normalized.includes('집에안계') ||
    normalized.includes('집에안있')
  )
) {
  addTag('부모부재');
}


  if (
  (normalized.includes('부모') || normalized.includes('가정') || normalized.includes('집')) &&
  (
    normalized.includes('싸움') ||
    normalized.includes('갈등') ||
    normalized.includes('이혼') ||
    normalized.includes('별거') ||
    normalized.includes('가출') ||
    normalized.includes('폭력')
  )
) {
  addTag('가정급변');
}

  // 혼자 지냄
  if (
    normalized.includes('혼자') &&
    (
      normalized.includes('지냄') ||
      normalized.includes('집') ||
      normalized.includes('시간이많')
    )
  ) {
    addTag('부모부재');
  }

  // 감정은 보조 신호
  if (
  found.length === 0 &&
  (
    normalized.includes('우울') ||
    normalized.includes('죽고싶') ||
    normalized.includes('의욕없') ||
    normalized.includes('아무것도하기싫') ||
    normalized.includes('기운이없')
  )
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

// 친구에게 폭력을 당함
if (
  (normalized.includes('친구') || normalized.includes('또래')) &&
  (
    normalized.includes('폭력') ||
    normalized.includes('폭행') ||
    normalized.includes('맞')
  )
) {
  addTag('학교폭력');
}

// 몸이 아픔
if (
  normalized.includes('몸이아파') ||
  normalized.includes('아파요') ||
  normalized.includes('몸이안좋')
) {
  addTag('질병');
}

// 살 집이 없음
if (
  normalized.includes('살집이없') ||
  normalized.includes('집이없') ||
  normalized.includes('갈곳이없') ||
  normalized.includes('잘곳이없')
) {
  addTag('주거위기');
}


  // 우울 있으면 무기력 보조 추가
// 🔥 우울 제한 (상황 태그 있으면 제거)
if (
  found.includes('우울') &&
  (
    found.includes('경제적어려움') ||
    found.includes('가족돌봄청소년') ||
    found.includes('다문화') ||
    found.includes('기초학습부족') ||
    found.includes('교과부족') ||
    found.includes('부모부재') ||
    found.includes('가정급변')
  )
) {
  const idx = found.indexOf('우울');
  if (idx !== -1) found.splice(idx, 1);
}

  return [...new Set(found)];
};

const testResults = useMemo(() => {
  return TEST_CASES.map((testCase, index) => {
    const actual = extractTagsFromText(testCase.input);

    const missing = testCase.expected.filter(
      (tag) => !actual.includes(tag)
    );

    const unexpected = actual.filter(
      (tag) => !testCase.expected.includes(tag)
    );

    const passed = missing.length === 0;

    return {
      id: index + 1,
      input: testCase.input,
      expected: testCase.expected,
      actual,
      missing,
      unexpected,
      passed,
    };
  });
}, [tags]);

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

  const tagCategories = useMemo(() => {
  return [...new Set(
    tags
      .map((tag) => (tag.category || '').trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));
}, [tags]);


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

const calculateRecommendationScore = (program) => {
  let score = 0;
  let matchCount = 0;
  let hasCriticalMatch = false;

  const programTags = Array.isArray(program.tags) ? program.tags : [];

  const matchedTags = programTags.filter((tag) =>
    selectedTags.includes(tag)
  );

  const getTagWeight = (tag) => {
    if (HIGH_RISK_TAGS.includes(tag)) return 5;
    if (CORE_PROBLEM_TAGS.includes(tag)) return 3;
    if (CONTEXT_TAGS.includes(tag)) return 1;
    return 2;
  };

  matchedTags.forEach((tag) => {
    matchCount++;
    score += 30 * getTagWeight(tag);

    if (HIGH_RISK_TAGS.includes(tag)) {
      hasCriticalMatch = true;
      score += 150;
    }
  });

  const selectedCore = selectedTags.filter(
    (t) =>
      CORE_PROBLEM_TAGS.includes(t) ||
      HIGH_RISK_TAGS.includes(t)
  );

  const matchedCore = matchedTags.filter(
    (t) =>
      CORE_PROBLEM_TAGS.includes(t) ||
      HIGH_RISK_TAGS.includes(t)
  );

  const coreMatchRatio =
    selectedCore.length > 0
      ? matchedCore.length / selectedCore.length
      : 0;

  return {
  ...program,
  matchedTags,
  score,
  matchCount,
  hasCriticalMatch,
  coreMatchRatio,
  reasons: matchedTags.map((tag) => `${tag} 관련 지원`)
};
};

const recommendedPrograms = useMemo(() => {
  return programs
    .filter((p) => passesRequiredFilters(p))
    .map((p) => calculateRecommendationScore(p))
    .filter((p) => {
      // 🔥 위험 태그는 무조건 통과
      if (p.hasCriticalMatch) return true;
  if (selectedTags.length === 0) return false;
  return p.matchCount >= 1;
})
    .sort((a, b) => {
      // 1순위: 핵심 태그 일치율
      if (b.coreMatchRatio !== a.coreMatchRatio) {
        return b.coreMatchRatio - a.coreMatchRatio;
      }

      // 2순위: 점수
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.name.localeCompare(b.name);
    })
    .slice(0, 20);
}, [programs, selectedTags]);
 
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
  setNewTagCategory('');
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
  const finalCategory = (newTagCategory || tagForm.category || '').trim();

  if (!tagForm.name.trim() || !finalCategory) {
    alert('태그명과 카테고리는 필수입니다.');
    return;
  }

  if (tagEditingId) {
    const oldTag = tags.find((t) => t.id === tagEditingId);

    const { error } = await supabase
      .from('tags')
      .update({
        name: tagForm.name.trim(),
        category: finalCategory,
        is_active: tagForm.is_active,
      })
      .eq('id', tagEditingId);

    if (error) {
      alert('태그 수정 실패');
      console.error(error);
      return;
    }

    if (oldTag && oldTag.name !== tagForm.name.trim()) {
      const affectedPrograms = programs.filter((p) =>
        (p.tags || []).includes(oldTag.name)
      );

      for (const program of affectedPrograms) {
        const updatedTags = (program.tags || []).map((tag) =>
          tag === oldTag.name ? tagForm.name.trim() : tag
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
        name: tagForm.name.trim(),
        category: finalCategory,
        is_active: tagForm.is_active,
      },
    ]);

    if (error) {
      alert(`태그 추가 실패: ${error.message}`);
console.error('tag insert error:', error);
return;
    }

    alert('태그 추가 완료');
  }

  resetTagForm();
  setNewTagCategory('');
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

  {showScore && p.reasons && p.reasons.length > 0 && (
    <p className="program-match">
      추천 이유: {p.reasons.join(', ')}
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

                <div style={{ marginTop: 10 }}>
  <button
    onClick={() => setShowTestPanel(prev => !prev)}
    style={{
      padding: '8px 12px',
      borderRadius: 8,
      border: '1px solid #ccc',
      background: '#f8fafc',
      cursor: 'pointer'
    }}
  >
    {showTestPanel ? '테스트 닫기' : '테스트 열기'}
  </button>
</div>

{showTestPanel && (
  <div style={{
    marginTop: 20,
    padding: 16,
    background: '#f9fafb',
    borderRadius: 12,
    border: '1px solid #e5e7eb'
  }}>
    <h3 style={{ marginBottom: 12 }}>테스트 결과</h3>

    {testResults.map((t) => (
      <div
        key={t.id}
        style={{
          marginBottom: 12,
          padding: 12,
          borderRadius: 8,
          background: t.passed ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${t.passed ? '#10b981' : '#ef4444'}`
        }}
      >
        <div style={{ fontWeight: 700 }}>
          [{t.passed ? '통과' : '실패'}] {t.input}
        </div>

        <div>👉 기대: {t.expected.join(', ')}</div>
        <div>👉 실제: {t.actual.join(', ')}</div>

        {t.missing.length > 0 && (
          <div style={{ color: 'red' }}>
            ❌ 누락: {t.missing.join(', ')}
          </div>
        )}

        {t.unexpected.length > 0 && (
          <div style={{ color: 'orange' }}>
            ⚠️ 추가됨: {t.unexpected.join(', ')}
          </div>
        )}
      </div>
    ))}
  </div>
)}
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

    {p.matchedTags && p.matchedTags.length > 0 && (
      <p>✅ 일치 태그: {p.matchedTags.join(', ')}</p>
    )}

    {p.reasons && p.reasons.length > 0 && (
      <p>💡 추천 이유: {p.reasons.join(', ')}</p>
    )}

    <p>📞 {p.phone || '연락처 없음'}</p>
    <p>👤 {p.min_age ?? '무관'} ~ {p.max_age ?? '무관'}</p>
    <p>🏫 {p.school_level || '무관'}</p>
    <p>🏷 전체 태그: {p.tags?.join(', ') || '없음'}</p>
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

  <select
    className="field"
    value={tagForm.category}
    onChange={(e) =>
      setTagForm({ ...tagForm, category: e.target.value })
    }
  >
    <option value="">기존 카테고리 선택</option>
    {tagCategories.map((category) => (
      <option key={category} value={category}>
        {category}
      </option>
    ))}
  </select>


  <input
    className="field"
    placeholder="새 카테고리 직접 입력"
    value={newTagCategory}
    onChange={(e) => setNewTagCategory(e.target.value)}
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

<button
  className="btn btn-secondary"
  type="button"
  onClick={() => {
    if (!newTagCategory.trim()) {
      alert('새 카테고리명을 입력하세요.');
      return;
    }

    setTagForm((prev) => ({
      ...prev,
      category: newTagCategory.trim(),
    }));
    alert(`카테고리 "${newTagCategory.trim()}" 선택됨`);
  }}
>
  새 카테고리 적용
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