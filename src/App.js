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
// deploy test
const CRITICAL_TAGS = [
  '자살위험',
  '자해위험',
  '학대방임',
  '성폭력',
  '학교폭력',
  '결식',
];

const TAG_WEIGHTS = {
  자살위험: 110,
  자해위험: 105,
  학대방임: 100,
  성폭력: 100,
  학교폭력: 95,

  결식: 85,
  가정급변: 85,
  양육환경위기: 80,
  가족돌봄청소년: 80,

  기초생활수급자: 75,
  법정차상위: 70,
  경제적어려움: 70,
  학업중단위기: 70,
  우울: 70,
  학교밖청소년: 70,
  소년소녀가장: 70,

  불안: 65,
  분노폭력: 65,
  기타저소득: 65,

  법정한부모: 60,
  부모부재: 60,
  시설보호: 60,
  특수교육대상자: 60,
  북한이탈주민: 60,
  난민: 60,
  장애: 60,
  무기력: 60,

  한부모: 55,
  질병: 55,

  조부모가정: 50,
  다문화: 50,
  ADHD: 50,

  친척돌봄: 45,

  기초학습부족: 40,

  교과부족: 35,
  비만: 30,

  기타: 20,
};



function App() {
  const [programs, setPrograms] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [tags, setTags] = useState([]);

  const [selectedTags, setSelectedTags] = useState([]);
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

const [adminTagSearch, setAdminTagSearch] = useState('');

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

  useEffect(() => {
    fetchPrograms();
    fetchOrganizations();
    fetchTags();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

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



  
  const getOrganizationName = (organizationId, fallbackName) => {
    const org = organizations.find((item) => item.id === organizationId);
    return org?.name || fallbackName || '기관 없음';
  };

  const getOrganizationById = (organizationId) => {
    return organizations.find((item) => item.id === organizationId) || null;
  };

const filteredAdminTags = useMemo(() => {
  const keyword = adminTagSearch.trim().toLowerCase();

  if (!keyword) return tags;

  return tags.filter((tag) => {
    const name = (tag.name || '').toLowerCase();
    const category = (tag.category || '').toLowerCase();

    return name.includes(keyword) || category.includes(keyword);
  });
}, [tags, adminTagSearch]);

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
  const programTags = program.tags || [];

  if (selectedTags.length === 0) {
    return {
      ...program,
      matchCount: 0,
      matchRatio: 0,
      score: 0,
      matchedTags: [],
    };
  }

  let score = 0;
  const matchedTags = [];

  for (const tag of selectedTags) {
    if (programTags.includes(tag)) {
      const weight = TAG_WEIGHTS[tag] || 20;
      score += weight;
      matchedTags.push(tag);
    }
  }

  const matchCount = matchedTags.length;
  const matchRatio =
    selectedTags.length > 0 ? matchCount / selectedTags.length : 0;

  score += matchCount * 10;

  return {
    ...program,
    matchCount,
    matchRatio,
    score,
    matchedTags,
  };
}, [selectedTags]);

  const recommendedPrograms = useMemo(() => {
  return programs
    .filter((program) => passesRequiredFilters(program))
    .map((program) => calculateRecommendationScore(program))
    .filter((program) => program.score > 0)
    .sort((a, b) => {
      const aCritical = a.tags?.some((tag) => CRITICAL_TAGS.includes(tag));
      const bCritical = b.tags?.some((tag) => CRITICAL_TAGS.includes(tag));

      if (aCritical && !bCritical) return -1;
      if (!aCritical && bCritical) return 1;
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name);
    });
}, [programs, passesRequiredFilters, calculateRecommendationScore]);

  const allPrograms = useMemo(() => {
  return programs
    .filter((program) => passesRequiredFilters(program))
    .sort((a, b) => a.name.localeCompare(b.name));
}, [programs, passesRequiredFilters]);

  const organizationPrograms = useMemo(() => {
    if (!selectedOrganizationId) return [];
    return programs.filter(
      (program) => program.organization_id === selectedOrganizationId
    );
  }, [programs, selectedOrganizationId]);

  const autoTagging = (text) => {
    if (!text) return;

    const lower = text.toLowerCase();

    const matched = tags
      .filter((tag) => lower.includes(tag.name.toLowerCase()))
      .map((tag) => tag.name);

    setSelectedTags((prev) => [...new Set([...prev, ...matched])]);
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
    setSelectedTags([]);
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

  console.log('저장 payload:', payload);
  console.log('editingId:', editingId);

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
    {/* 🔥 1. 추천 결과 먼저 */}
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
      <div className="cards scroll-box">

        {recommendedPrograms.map((p, index) =>
          renderProgramCard(p, index, true)
        )}
      </div>
    )}

    {/* 🔥 2. 필터 + 입력 영역 */}
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
          placeholder="학생 상황 입력 (예: 우울, 결식, 학습부진)"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              autoTagging(searchText);
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
      </div>

      {/* 🔥 태그 선택 */}
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
                  onClick={() =>
                    setSelectedTags((prev) =>
                      prev.filter((t) => t !== tag)
                    )
                  }
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

              <div className="tag-scroll-box">
                {items.map((tag) => (
                  <label key={tag.id} className="tag-option">
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(tag.name)}
                      onChange={() => {
                        setSelectedTags((prev) =>
                          prev.includes(tag.name)
                            ? prev.filter((t) => t !== tag.name)
                            : [...prev, tag.name]
                        );
                      }}
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
              <div className="cards scroll-box">

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
          <div className="cards">
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
                        (org) => org.id === selectedId
                      );

                      setForm({
                        ...form,
                        organization_id: selectedId,
                        organization: selectedOrg ? selectedOrg.name : '',
                      });
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
  value={orgSearch}
  onChange={(e) => setOrgSearch(e.target.value)}
  style={{ marginBottom: 12 }}
/>
  </div>

  <div className="action-row" style={{ marginBottom: 12 }}>
    <button
      className="btn btn-secondary"
      onClick={() =>
        setSelectedOrganizationIds(filteredOrganizations.map((org) => org.id))
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


{filteredOrganizations.length === 0 && (
    <p style={{ padding: 20 }}>검색 결과가 없습니다.</p>
  )}

    {filteredOrganizations.map((org) => (
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
