import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import {
  ADMIN_EMAIL,
  CONTEXT_TAGS,
  CORE_PROBLEM_TAGS,
  createOrganizationForm,
  createProgramForm,
  createTagForm,
  HIGH_RISK_TAGS,
  TAG_PRIORITY,
  TEST_CASES,
} from './constants/appData';
import AdminSection from './components/sections/AdminSection';
import AdminLoginModal from './components/AdminLoginModal';
import AllProgramsSection from './components/sections/AllProgramsSection';
import OrganizationSection from './components/sections/OrganizationSection';
import RecommendSection from './components/sections/RecommendSection';
import { createTagExtractor } from './utils/tagging';
import { extractSearchTerms, getProgramTextMatch } from './utils/recommendation';
import './App1.css';

function App() {
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [tags, setTags] = useState([]);
  const BRAND_NAME = '금산학생복지이음센터';

  const [autoSelectedTags, setAutoSelectedTags] = useState([]);
  const [manualSelectedTags, setManualSelectedTags] = useState([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [openProgramId, setOpenProgramId] = useState(null);

  const [viewMode, setViewMode] = useState('recommend');

  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [schoolLevel, setSchoolLevel] = useState('');
  const [searchText, setSearchText] = useState('');
  const [tagSearch, setTagSearch] = useState('');

  const [user, setUser] = useState(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
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

  const [form, setForm] = useState(createProgramForm);
  const [orgForm, setOrgForm] = useState(createOrganizationForm);
  const [tagForm, setTagForm] = useState(createTagForm);

  const [newTagCategory, setNewTagCategory] = useState('');

  const [orgUploadPreview, setOrgUploadPreview] = useState([]);
  const [programUploadPreview, setProgramUploadPreview] = useState([]);

  const resultRef = useRef(null);

  const isAdmin = user?.email === ADMIN_EMAIL;
  const validTagNames = useMemo(() => {
    return new Set((tags || []).map((tag) => tag.name));
  }, [tags]);
  const extractTagsFromText = useMemo(
    () => createTagExtractor(validTagNames),
    [validTagNames]
  );

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

  const getOrganizationById = useCallback((organizationId) => {
    return organizations.find((item) => item.id === organizationId) || null;
  }, [organizations]);

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
  }, [extractTagsFromText]);

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

  const calculateRecommendationScore = useCallback((program) => {
    let score = 0;
    let matchCount = 0;
    let hasCriticalMatch = false;

    const programTags = Array.isArray(program.tags) ? program.tags : [];
    const matchedTags = programTags.filter((tag) => selectedTags.includes(tag));

    const getTagWeight = (tag) => {
      if (HIGH_RISK_TAGS.includes(tag)) return 5;
      if (CORE_PROBLEM_TAGS.includes(tag)) return 3;
      if (CONTEXT_TAGS.includes(tag)) return 1;
      return 2;
    };

    matchedTags.forEach((tag) => {
      matchCount += 1;
      score += 30 * getTagWeight(tag);

      if (HIGH_RISK_TAGS.includes(tag)) {
        hasCriticalMatch = true;
        score += 150;
      }
    });

    const selectedCore = selectedTags.filter(
      (tag) => CORE_PROBLEM_TAGS.includes(tag) || HIGH_RISK_TAGS.includes(tag)
    );
    const matchedCore = matchedTags.filter(
      (tag) => CORE_PROBLEM_TAGS.includes(tag) || HIGH_RISK_TAGS.includes(tag)
    );
    const coreMatchRatio =
      selectedCore.length > 0 ? matchedCore.length / selectedCore.length : 0;
    const organizationName = getOrganizationName(
      program.organization_id,
      program.organization
    );
    const searchTerms = extractSearchTerms(searchText);
    const textMatch = getProgramTextMatch(program, searchTerms, organizationName);
    score += textMatch.score;

    return {
      ...program,
      matchedTags,
      matchedTerms: textMatch.matchedTerms,
      score,
      matchCount,
      hasCriticalMatch,
      coreMatchRatio,
      reasons: [
        ...matchedTags.map((tag) => `${tag} 관련 지원`),
        ...textMatch.matchedTerms.map((term) => `"${term}" 관련 지원`),
      ],
    };
  }, [getOrganizationName, searchText, selectedTags]);

  const sortRecommendedPrograms = useCallback((a, b) => {
    if (b.coreMatchRatio !== a.coreMatchRatio) {
      return b.coreMatchRatio - a.coreMatchRatio;
    }

    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return a.name.localeCompare(b.name);
  }, []);

  const candidateRecommendedPrograms = useMemo(() => {
    return programs
      .filter((program) => passesRequiredFilters(program))
      .map((program) => calculateRecommendationScore(program))
      .filter((program) => {
        if (program.hasCriticalMatch) return true;
        if (selectedTags.length === 0) return false;
        return program.matchCount >= 1 || (program.matchedTerms || []).length >= 1;
      })
      .sort(sortRecommendedPrograms);
  }, [
    calculateRecommendationScore,
    passesRequiredFilters,
    programs,
    selectedTags,
    sortRecommendedPrograms,
  ]);

  const recommendedPrograms = useMemo(() => {
    const guaranteedPrograms = new Map(
      candidateRecommendedPrograms
        .slice(0, 20)
        .map((program) => [program.id, program])
    );

    selectedTags.forEach((tag) => {
      candidateRecommendedPrograms
        .filter((program) => (program.matchedTags || []).includes(tag))
        .slice(0, 3)
        .forEach((program) => {
          guaranteedPrograms.set(program.id, program);
        });
    });

    return Array.from(guaranteedPrograms.values()).sort(sortRecommendedPrograms);
  }, [candidateRecommendedPrograms, selectedTags, sortRecommendedPrograms]);
 

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

const sortedGroupedPrograms = useMemo(() => {
  return Object.entries(groupedPrograms).sort(([tagA], [tagB]) => {
    const priorityA = TAG_PRIORITY[tagA] ?? 0;
    const priorityB = TAG_PRIORITY[tagB] ?? 0;

    if (priorityB !== priorityA) {
      return priorityB - priorityA;
    }

    return tagA.localeCompare(tagB);
  });
}, [groupedPrograms]);



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

  const resetLoginModal = useCallback(() => {
    setLoginEmail('');
    setLoginPassword('');
    setLoginError('');
    setIsLoginSubmitting(false);
  }, []);

  const closeLoginModal = useCallback(() => {
    setIsLoginModalOpen(false);
    resetLoginModal();
  }, [resetLoginModal]);

  const handleLogin = async (event) => {
    event?.preventDefault();

    const email = loginEmail.trim();
    const password = loginPassword;

    if (!email || !password) {
      setLoginError('이메일과 비밀번호를 입력하세요.');
      return;
    }

    setLoginError('');
    setIsLoginSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoginError(error.message);
      setIsLoginSubmitting(false);
      return;
    }

    const { data } = await supabase.auth.getUser();
    setUser(data.user);
    closeLoginModal();
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
    setForm(createProgramForm());
    setOrgForm(createOrganizationForm());
    setTagForm(createTagForm());

    alert('로그아웃 되었습니다.');
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(createProgramForm());
  };

  const resetOrgForm = () => {
    setOrgEditingId(null);
    setOrgForm(createOrganizationForm());
  };

  const resetTagForm = () => {
    setTagEditingId(null);
    setTagForm(createTagForm());
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
  const handleExportSelectedPrograms = () => {
  if (selectedProgramIds.length === 0) {
    alert('선택된 사업이 없습니다.');
    return;
  }

  const selectedPrograms = recommendedPrograms.filter((program) =>
    selectedProgramIds.includes(program.id)
  );

  if (selectedPrograms.length === 0) {
    alert('선택된 추천 사업 데이터를 찾을 수 없습니다.');
    return;
  }

  const exportRows = selectedPrograms.map((program, index) => ({
    순번: index + 1,
    사업명: program.name || '',
    기관명: getOrganizationName(program.organization_id, program.organization),
    전화번호: program.phone || '',
    설명: program.description || '',
    일치태그: Array.isArray(program.matchedTags)
      ? program.matchedTags.join(', ')
      : '',
    추천이유: Array.isArray(program.reasons)
      ? program.reasons.join(', ')
      : '',
    추천점수: program.score ?? '',
    전체태그: Array.isArray(program.tags)
      ? program.tags.join(', ')
      : '',
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
  XLSX.utils.book_append_sheet(workbook, worksheet, '추천사업');

  XLSX.writeFile(workbook, '추천사업_선택목록.xlsx');
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

  const toggleProgramOpen = useCallback((programId) => {
    setOpenProgramId((prev) => (prev === programId ? null : programId));
  }, []);

  const toggleProgramSelection = useCallback((programId) => {
    setSelectedProgramIds((prev) =>
      prev.includes(programId)
        ? prev.filter((id) => id !== programId)
        : [...prev, programId]
    );
  }, []);

  const toggleOrganizationSelection = useCallback((organizationId) => {
    setSelectedOrganizationIds((prev) =>
      prev.includes(organizationId)
        ? prev.filter((id) => id !== organizationId)
        : [...prev, organizationId]
    );
  }, []);

  const selectedOrganization = useMemo(
    () => getOrganizationById(selectedOrganizationId),
    [getOrganizationById, selectedOrganizationId]
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <img src="/logo.png" alt="logo" />
          </div>
          <div>
            <div className="brand-title">{BRAND_NAME}</div>
            <div className="brand-sub">학생복지이음 서비스</div>
          </div>
        </div>

        <nav className="nav">
          <button
            className={`nav-btn ${viewMode === 'recommend' ? 'active' : ''}`}
            onClick={() => setViewMode('recommend')}
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
            <button
              className="btn btn-primary full"
              onClick={() => setIsLoginModalOpen(true)}
            >
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
          <RecommendSection
            resultRef={resultRef}
            showTestPanel={showTestPanel}
            setShowTestPanel={setShowTestPanel}
            testResults={testResults}
            recommendedPrograms={recommendedPrograms}
            selectedProgramIds={selectedProgramIds}
            setSelectedProgramIds={setSelectedProgramIds}
            handleExportSelectedPrograms={handleExportSelectedPrograms}
            handleDeleteSelectedPrograms={handleDeleteSelectedPrograms}
            isAdmin={isAdmin}
            sortedGroupedPrograms={sortedGroupedPrograms}
            openTag={openTag}
            setOpenTag={setOpenTag}
            openProgramId={openProgramId}
            setOpenProgramId={setOpenProgramId}
            age={age}
            setAge={setAge}
            gender={gender}
            setGender={setGender}
            schoolLevel={schoolLevel}
            setSchoolLevel={setSchoolLevel}
            searchText={searchText}
            handleLiveCaseInput={handleLiveCaseInput}
            autoTagging={autoTagging}
            handleResetRecommendFilters={handleResetRecommendFilters}
            tagSearch={tagSearch}
            setTagSearch={setTagSearch}
            selectedTags={selectedTags}
            removeTagCompletely={removeTagCompletely}
            filteredGroupedTags={filteredGroupedTags}
            toggleManualTag={toggleManualTag}
          />
        )}

        {viewMode === 'all' && (
          <AllProgramsSection
            allPrograms={allPrograms}
            allProgramSearch={allProgramSearch}
            setAllProgramSearch={setAllProgramSearch}
            isAdmin={isAdmin}
            selectedProgramIds={selectedProgramIds}
            setSelectedProgramIds={setSelectedProgramIds}
            handleDeleteSelectedPrograms={handleDeleteSelectedPrograms}
            openProgramId={openProgramId}
            getOrganizationById={getOrganizationById}
            getOrganizationName={getOrganizationName}
            toggleProgramOpen={toggleProgramOpen}
            toggleProgramSelection={toggleProgramSelection}
            handleEditProgram={handleEditProgram}
            handleDeleteProgram={handleDeleteProgram}
          />
        )}

        {viewMode === 'organization' && (
          <OrganizationSection
            orgSearch={orgSearch}
            setOrgSearch={setOrgSearch}
            filteredOrganizations={filteredOrganizations}
            selectedOrganizationId={selectedOrganizationId}
            setSelectedOrganizationId={setSelectedOrganizationId}
            selectedOrganization={selectedOrganization}
            organizationPrograms={organizationPrograms}
            isAdmin={isAdmin}
            selectedProgramIds={selectedProgramIds}
            openProgramId={openProgramId}
            getOrganizationById={getOrganizationById}
            getOrganizationName={getOrganizationName}
            toggleProgramOpen={toggleProgramOpen}
            toggleProgramSelection={toggleProgramSelection}
            handleEditProgram={handleEditProgram}
            handleDeleteProgram={handleDeleteProgram}
          />
        )}

        {isAdmin && (
          <AdminSection
            formRef={formRef}
            orgFormRef={orgFormRef}
            editingId={editingId}
            form={form}
            setForm={setForm}
            organizations={organizations}
            groupedActiveTags={groupedActiveTags}
            handleSaveProgram={handleSaveProgram}
            resetForm={resetForm}
            orgEditingId={orgEditingId}
            orgForm={orgForm}
            setOrgForm={setOrgForm}
            handleSaveOrganization={handleSaveOrganization}
            resetOrgForm={resetOrgForm}
            tagEditingId={tagEditingId}
            tagForm={tagForm}
            setTagForm={setTagForm}
            tagCategories={tagCategories}
            newTagCategory={newTagCategory}
            setNewTagCategory={setNewTagCategory}
            handleSaveTag={handleSaveTag}
            resetTagForm={resetTagForm}
            handleOrgExcelSelect={handleOrgExcelSelect}
            handleUploadOrganizations={handleUploadOrganizations}
            orgUploadPreview={orgUploadPreview}
            handleProgramExcelSelect={handleProgramExcelSelect}
            handleUploadPrograms={handleUploadPrograms}
            programUploadPreview={programUploadPreview}
            adminOrgSearch={adminOrgSearch}
            setAdminOrgSearch={setAdminOrgSearch}
            filteredAdminOrganizations={filteredAdminOrganizations}
            selectedOrganizationIds={selectedOrganizationIds}
            setSelectedOrganizationIds={setSelectedOrganizationIds}
            handleDeleteSelectedOrganizations={handleDeleteSelectedOrganizations}
            toggleOrganizationSelection={toggleOrganizationSelection}
            handleEditOrganization={handleEditOrganization}
            handleDeleteOrganization={handleDeleteOrganization}
            adminTagSearch={adminTagSearch}
            setAdminTagSearch={setAdminTagSearch}
            filteredAdminTags={filteredAdminTags}
            handleEditTag={handleEditTag}
            handleDeactivateTag={handleDeactivateTag}
            handleDeleteTag={handleDeleteTag}
            handleExportOrganizations={handleExportOrganizations}
            handleExportPrograms={handleExportPrograms}
          />
        )}
        <div>
          © 2026 [{BRAND_NAME}]. All rights reserved.
        </div>
      </main>

      <AdminLoginModal
        isOpen={isLoginModalOpen}
        email={loginEmail}
        password={loginPassword}
        error={loginError}
        isSubmitting={isLoginSubmitting}
        onEmailChange={setLoginEmail}
        onPasswordChange={setLoginPassword}
        onClose={closeLoginModal}
        onSubmit={handleLogin}
      />
    </div>
  );
}

export default App;
