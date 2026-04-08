(function () {
  const data = window.LOCAL_WELFARE_DATA;

  if (!data) {
    document.getElementById('app').innerHTML =
      '<div class="empty">로컬 앱 데이터가 없습니다. <code>node scripts/export-local-app-data.js</code>를 먼저 실행하세요.</div>';
    return;
  }

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
    '가족돌봄청소년',
  ];

  const CONTEXT_TAGS = [
    '한부모',
    '다문화',
    '장애',
    '기초생활수급자',
    '법정차상위',
    '기타저소득',
    '조부모가정',
    '부모부재',
  ];

  const HIGH_RISK_TAGS = ['자살위험', '자해위험'];
  const TAG_PRIORITY = {
    자살위험: 100, 자해위험: 95, 학교폭력: 90, 학대방임: 89, 성폭력: 88,
    학업중단위기: 80, 가정급변: 75, 부모부재: 74, 가족돌봄청소년: 73,
    경제적어려움: 70, 결식: 69, 기초생활수급자: 68, 법정차상위: 67,
    기타저소득: 66, 교과부족: 60, 기초학습부족: 59, ADHD: 58, 우울: 50,
    불안: 49, 무기력: 48, 다문화: 40, 장애: 39, 질병: 38, 기타: 1,
  };

  const STOPWORDS = new Set([
    '그리고', '하지만', '그런데', '너무', '정말', '조금', '많이', '관련', '지원', '사업',
    '학생', '상황', '문제', '때문', '있어요', '있음', '해요', '같아요', '싶어요', '어려워요', '힘들어요',
  ]);

  const KOREAN_SUFFIXES = [
    '으로부터', '에게서', '이라서', '라서', '에서', '으로', '에게', '한테', '보다', '까지', '부터',
    '처럼', '같은', '같다', '필요함', '필요한', '필요해', '상담이', '지원이', '문제가', '위기가',
    '어려움', '어려워', '힘들어', '이라', '하다', '해야', '해요', '임', '함', '이', '가', '은', '는', '을', '를', '도', '만', '에', '와', '과',
  ];

  const SUPPORT_TAG_KEYWORD_MAP = {
    법률: ['법률', '법률상담', '법률지원', '무료법률', '법률구조', '변호사', '소송', '가정폭력', '성폭력피해', '피해자지원'],
    주거: ['주거', '월세', '전세', '임대주택', '주거불안', '주택', '거처', '집이없', '살곳', '보증금'],
    일자리: ['일자리', '취업', '구직', '진로', '직업', '근로', '현장실습', '자립', '장려금'],
    생활지원: ['생활지원', '생계', '생활비', '긴급복지', '급여', '수당', '보험료', '의료비', '양육비', '복지지원'],
    서민금융: ['서민금융', '금융지원', '대출', '채무', '햇살론', '통장', '자산형성'],
    '보호·돌봄': ['보호', '돌봄', '양육', '보육', '아이돌봄', '방임', '입양', '위탁', '급식'],
    '안전·위기': ['안전', '위기', '폭력', '학대', '자해', '자살', '성폭력', '가정폭력', '학교폭력', '긴급'],
    정신건강: ['정신건강', '상담', '심리', '정서', '우울', '불안', '스트레스', '중독', '회복'],
  };

  const state = {
    viewMode: 'recommend',
    age: '',
    gender: '',
    schoolLevel: '',
    searchText: '',
    tagSearch: '',
    allSearch: '',
    orgSearch: '',
    selectedOrganizationId: '',
    autoSelectedTags: [],
    manualSelectedTags: [],
    openTag: null,
    openProgramKey: null,
  };
  let pendingFocus = null;
  let isComposing = false;
  let searchRenderTimer = null;

  const activeTags = data.tags.filter((tag) => tag.is_active);
  const validTagNames = new Set(activeTags.map((tag) => tag.name));
  const organizationMap = new Map(data.organizations.map((organization) => [organization.id, organization]));

  function normalizeCaseText(text) {
    return String(text || '').toLowerCase().replace(/\s+/g, '').replace(/[.,!?]/g, '');
  }

  function normalizeRecommendationText(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[\n\r\t]/g, ' ')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function stripSuffixes(term) {
    let current = term;
    for (const suffix of KOREAN_SUFFIXES) {
      if (current.length - suffix.length < 2) continue;
      if (current.endsWith(suffix)) {
        current = current.slice(0, -suffix.length);
        break;
      }
    }
    return current;
  }

  function extractSearchTerms(text) {
    const normalized = normalizeRecommendationText(text);
    if (!normalized) return [];
    const rawTerms = normalized
      .split(' ')
      .map((term) => term.trim())
      .filter((term) => term.length >= 2 && !STOPWORDS.has(term));

    const variants = rawTerms.flatMap((term) => {
      const stripped = stripSuffixes(term);
      const list = [term];
      if (stripped.length >= 2 && stripped !== term) list.push(stripped);
      if (term.length >= 4) list.push(term.slice(0, Math.max(2, term.length - 1)));
      return list;
    });

    return [...new Set(variants.filter((term) => term.length >= 2))];
  }

  function getProgramTextMatch(program, searchTerms) {
    if (!searchTerms.length) return { score: 0, matchedTerms: [] };
    const fields = {
      name: normalizeRecommendationText(program.name),
      description: normalizeRecommendationText(program.description),
      organization: normalizeRecommendationText(program.organization),
      tags: normalizeRecommendationText((program.tags || []).join(' ')),
    };
    const compactFields = Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [key, value.replace(/\s+/g, '')])
    );
    const matchedTerms = [];
    let score = 0;

    searchTerms.forEach((term) => {
      const compactTerm = term.replace(/\s+/g, '');
      let matched = false;
      if (fields.name.includes(term) || compactFields.name.includes(compactTerm)) {
        score += 28;
        matched = true;
      } else if (fields.tags.includes(term) || compactFields.tags.includes(compactTerm)) {
        score += 22;
        matched = true;
      } else if (fields.description.includes(term) || compactFields.description.includes(compactTerm)) {
        score += 16;
        matched = true;
      } else if (fields.organization.includes(term) || compactFields.organization.includes(compactTerm)) {
        score += 10;
        matched = true;
      }
      if (matched) matchedTerms.push(term);
    });

    return { score, matchedTerms: [...new Set(matchedTerms)] };
  }

  function createTagExtractor(text) {
    const normalized = normalizeCaseText(text);
    const found = [];
    const addTag = (tag) => {
      if (!validTagNames.has(tag)) return;
      found.push(tag);
    };
    const hasTag = (tag) => found.includes(tag);

    Object.entries(data.tagKeywordMap).forEach(([tag, keywords]) => {
      if (!validTagNames.has(tag)) return;
      if (keywords.some((keyword) => normalized.includes(normalizeCaseText(keyword)))) addTag(tag);
    });

    Object.entries(data.tagPatternMap).forEach(([tag, patterns]) => {
      if (!validTagNames.has(tag)) return;
      if (patterns.some((pattern) => normalized.includes(normalizeCaseText(pattern)))) addTag(tag);
    });

    Object.entries(SUPPORT_TAG_KEYWORD_MAP).forEach(([tag, keywords]) => {
      if (!validTagNames.has(tag)) return;
      if (keywords.some((keyword) => normalized.includes(normalizeCaseText(keyword)))) addTag(tag);
    });

    if ((normalized.includes('괴롭') || normalized.includes('따돌') || normalized.includes('왕따')) && (normalized.includes('학교가기싫') || normalized.includes('학교가기가싫') || normalized.includes('등교거부'))) {
      addTag('학교폭력');
      addTag('학업중단위기');
    }
    if ((normalized.includes('친구') || normalized.includes('학교')) && (normalized.includes('괴롭') || normalized.includes('때리') || normalized.includes('욕') || normalized.includes('무시') || normalized.includes('놀리') || normalized.includes('따돌') || normalized.includes('왕따'))) {
      addTag('학교폭력');
    }
    if (hasTag('학교폭력') && (normalized.includes('무섭') || normalized.includes('불안') || normalized.includes('학교가기싫') || normalized.includes('학교가기무섭'))) {
      addTag('불안');
      addTag('학업중단위기');
    }
    if (normalized.includes('가정폭력') || (normalized.includes('폭력') && normalized.includes('집'))) {
      addTag('법률');
      addTag('안전·위기');
    }
    if (normalized.includes('한국어') && (normalized.includes('어려') || normalized.includes('못') || normalized.includes('힘들') || normalized.includes('서툴'))) {
      addTag('다문화');
      addTag('기초학습부족');
    }
    if (normalized.includes('다문화') && (normalized.includes('학교') || normalized.includes('적응') || normalized.includes('어려움') || normalized.includes('힘들'))) {
      addTag('다문화');
      addTag('기초학습부족');
    }
    if (normalized.includes('가족돌봄') || normalized.includes('동생을돌보') || normalized.includes('부모를돌보') || normalized.includes('돌보느라') || normalized.includes('간병')) {
      addTag('가족돌봄청소년');
    }
    if (normalized.includes('형편') || normalized.includes('생활비') || normalized.includes('생계') || normalized.includes('경제')) {
      addTag('경제적어려움');
    }
    if (normalized.includes('조부모') || normalized.includes('조손') || normalized.includes('할머니와') || normalized.includes('할아버지와')) {
      addTag('조부모가정');
    }
    if ((normalized.includes('부모') || normalized.includes('가정') || normalized.includes('집')) && (normalized.includes('싸움') || normalized.includes('갈등') || normalized.includes('이혼') || normalized.includes('별거') || normalized.includes('가출') || normalized.includes('폭력'))) {
      addTag('가정급변');
    }
    if (normalized.includes('무서') || normalized.includes('걱정') || normalized.includes('두려') || normalized.includes('조마조마')) addTag('불안');
    if (normalized.includes('우울') || normalized.includes('의욕없') || normalized.includes('기운이없') || normalized.includes('아무것도하기싫')) {
      addTag('우울');
    }
    return [...new Set(found)];
  }

  function getSelectedTags() {
    return [...new Set([...state.autoSelectedTags, ...state.manualSelectedTags])];
  }

  function passesRequiredFilters(program) {
    const userAge = state.age === '' ? null : Number(state.age);
    if (userAge !== null) {
      if (program.min_age !== null && program.min_age !== undefined && userAge < program.min_age) return false;
      if (program.max_age !== null && program.max_age !== undefined && userAge > program.max_age) return false;
    }
    if (state.gender && program.gender && program.gender !== '무관' && program.gender !== state.gender) return false;
    if (state.schoolLevel && program.school_level && program.school_level !== '무관' && program.school_level !== state.schoolLevel) return false;
    return true;
  }

  function calculateRecommendationScore(program, selectedTags) {
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

    const selectedCore = selectedTags.filter((tag) => CORE_PROBLEM_TAGS.includes(tag) || HIGH_RISK_TAGS.includes(tag));
    const matchedCore = matchedTags.filter((tag) => CORE_PROBLEM_TAGS.includes(tag) || HIGH_RISK_TAGS.includes(tag));
    const coreMatchRatio = selectedCore.length > 0 ? matchedCore.length / selectedCore.length : 0;
    const searchTerms = extractSearchTerms(state.searchText);
    const textMatch = getProgramTextMatch(program, searchTerms);
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
  }

  function sortRecommendedPrograms(a, b) {
    if (b.coreMatchRatio !== a.coreMatchRatio) return b.coreMatchRatio - a.coreMatchRatio;
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  }

  function getCandidatePrograms(selectedTags) {
    return data.programs
      .filter(passesRequiredFilters)
      .map((program) => calculateRecommendationScore(program, selectedTags))
      .filter((program) => {
        if (program.hasCriticalMatch) return true;
        if (selectedTags.length === 0) return false;
        return program.matchCount >= 1 || (program.matchedTerms || []).length >= 1;
      })
      .sort(sortRecommendedPrograms);
  }

  function getRecommendedPrograms(selectedTags) {
    const candidatePrograms = getCandidatePrograms(selectedTags);
    const guaranteedPrograms = new Map(candidatePrograms.slice(0, 20).map((program) => [program.id, program]));
    selectedTags.forEach((tag) => {
      candidatePrograms
        .filter((program) => (program.matchedTags || []).includes(tag))
        .slice(0, 3)
        .forEach((program) => guaranteedPrograms.set(program.id, program));
    });
    return Array.from(guaranteedPrograms.values()).sort(sortRecommendedPrograms);
  }

  function groupByTag(programs) {
    const groups = {};
    programs.forEach((program) => {
      const matchedTags = program.matchedTags && program.matchedTags.length ? program.matchedTags : ['키워드일치'];
      matchedTags.forEach((tag) => {
        if (!groups[tag]) groups[tag] = [];
        groups[tag].push(program);
      });
    });
    return Object.entries(groups).sort(([a], [b]) => (TAG_PRIORITY[b] || 0) - (TAG_PRIORITY[a] || 0) || a.localeCompare(b));
  }

  function getFilteredTagGroups() {
    const lower = state.tagSearch.toLowerCase();
    const filtered = activeTags.filter((tag) =>
      !lower ||
      tag.name.toLowerCase().includes(lower) ||
      (tag.category || '').toLowerCase().includes(lower)
    );
    return filtered.reduce((acc, tag) => {
      const category = tag.category || '기타';
      if (!acc[category]) acc[category] = [];
      acc[category].push(tag);
      return acc;
    }, {});
  }

  function getAllPrograms() {
    const keyword = state.allSearch.trim().toLowerCase();
    return data.programs
      .filter(passesRequiredFilters)
      .filter((program) => {
        if (!keyword) return true;
        return [program.name, program.description, program.organization, program.phone, (program.tags || []).join(' ')]
          .join(' ')
          .toLowerCase()
          .includes(keyword);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function getFilteredOrganizations() {
    const keyword = state.orgSearch.trim().toLowerCase();
    return data.organizations.filter((org) => {
      if (!keyword) return true;
      return [org.name, org.phone, org.address].join(' ').toLowerCase().includes(keyword);
    });
  }

  function splitProgramDescription(description) {
    const lines = String(description || '').split('\n').map((line) => line.trim()).filter(Boolean);
    const detailLine = lines.find((line) => line.startsWith('상세 안내:'));
    const summary = lines.filter((line) => !line.startsWith('상세 안내:')).join(' ');
    const detailLink = detailLine ? detailLine.replace('상세 안내:', '').trim() : '';
    return { summary, detailLink };
  }

  function renderProgramCard(program, options = {}) {
    const {
      keyPrefix = 'program',
      showScore = false,
      rank = null,
    } = options;
    const { summary, detailLink } = splitProgramDescription(program.description || '');
    const organization = organizationMap.get(program.organization_id) || null;
    const isOpen = state.openProgramKey === `${keyPrefix}:${program.id}`;
    const isCritical = (program.matchedTags || []).some((tag) => HIGH_RISK_TAGS.includes(tag));
    const isTop = rank !== null && rank < 3;

    return `
      <div class="program-card ${isCritical ? 'critical' : ''} ${isTop ? 'top' : ''}">
        <div class="program-card-head">
          <div>
            ${isCritical ? '<div class="program-badge critical">긴급 매칭</div>' : ''}
            ${isTop ? `<div class="program-badge top">추천 TOP ${rank + 1}</div>` : ''}
            <h4>${program.name}</h4>
            <div class="program-sub">${program.organization || '기관 없음'}</div>
          </div>
          <div class="program-head-right">
            ${showScore ? `<div class="score-chip">${program.score}점</div>` : ''}
            <button class="detail-toggle" data-toggle-open="${keyPrefix}:${program.id}">
              ${isOpen ? '상세 닫기 ▲' : '상세 보기 ▼'}
            </button>
          </div>
        </div>
        <div class="meta">
          <span>연령 ${program.min_age ?? '무관'} ~ ${program.max_age ?? '무관'}</span>
          <span>성별 ${program.gender || '무관'}</span>
          <span>학령 ${program.school_level || '무관'}</span>
          ${program.phone ? `<span>전화 ${program.phone}</span>` : ''}
        </div>
        <p class="muted">${summary || '설명 없음'}</p>
        ${showScore && program.reasons && program.reasons.length ? `<p class="reasons">${program.reasons.join(', ')}</p>` : ''}
        ${showScore && program.matchedTags && program.matchedTags.length ? `<p class="muted">일치 태그: ${program.matchedTags.join(', ')}</p>` : ''}
        ${isOpen ? `
          <div class="program-detail">
            <div class="detail-grid">
              <div class="detail-block">
                <h5>사업 정보</h5>
                <p><strong>설명</strong><br>${summary || '설명 없음'}</p>
                <p><strong>전체 태그</strong><br>${(program.tags || []).join(', ') || '없음'}</p>
                ${detailLink ? `<p><strong>상세 안내</strong><br><a href="${detailLink}" target="_blank" rel="noreferrer">${detailLink}</a></p>` : ''}
              </div>
              <div class="detail-block">
                <h5>연계 기관</h5>
                <p><strong>기관명</strong><br>${organization?.name || program.organization || '기관 없음'}</p>
                <p><strong>대표전화</strong><br>${organization?.phone || program.phone || '연락처 없음'}</p>
                <p><strong>주소</strong><br>${organization?.address || '주소 없음'}</p>
                <p><strong>담당자</strong><br>${organization?.contact_person || '담당자 없음'}</p>
              </div>
            </div>
            <div class="detail-actions">
              ${(organization?.phone || program.phone) ? `<a class="btn secondary" href="tel:${organization?.phone || program.phone}">전화하기</a>` : ''}
              ${detailLink ? `<a class="btn" href="${detailLink}" target="_blank" rel="noreferrer">상세 안내</a>` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderRecommendView(selectedTags) {
    const recommendedPrograms = getRecommendedPrograms(selectedTags);
    const groupedPrograms = groupByTag(recommendedPrograms);
    const filteredTagGroups = getFilteredTagGroups();

    return `
      <section class="panel">
        <h2>조건 설정</h2>
        <p>학생 상황을 입력하면 자동태그와 추천 결과가 함께 갱신됩니다.</p>
        <div class="grid filters">
          <input class="field" id="ageInput" type="number" placeholder="나이" value="${state.age}" />
          <select class="field" id="genderInput">
            <option value="">성별 선택</option>
            <option value="남" ${state.gender === '남' ? 'selected' : ''}>남</option>
            <option value="여" ${state.gender === '여' ? 'selected' : ''}>여</option>
          </select>
          <select class="field" id="schoolInput">
            <option value="">학령 선택</option>
            ${['초등', '중등', '고등', '학교밖'].map((item) => `<option value="${item}" ${state.schoolLevel === item ? 'selected' : ''}>${item}</option>`).join('')}
          </select>
        </div>
        <div class="grid" style="margin-top:12px;">
          <textarea class="textarea" id="searchInput" placeholder="상황을 자유롭게 입력하세요">${state.searchText}</textarea>
          <div class="action-row">
            <button class="btn secondary" id="resetRecommendBtn">조건 초기화</button>
          </div>
        </div>
      </section>

      <section class="panel">
        <h2>추천 결과</h2>
        <p>${recommendedPrograms.length}개 결과</p>
        <div class="results">
          ${recommendedPrograms.length ? groupedPrograms.map(([tag, programs]) => `
            <div class="tag-section">
              <button class="tag-head" data-toggle-section="${tag}">
                <span>#${tag} 관련 지원 (${programs.length})</span>
                <span>${state.openTag === tag ? '▲' : '▼'}</span>
              </button>
              ${state.openTag === tag ? `<div class="programs">${programs.map((program, index) => renderProgramCard(program, { keyPrefix: `recommend:${tag}`, showScore: true, rank: index })).join('')}</div>` : ''}
            </div>
          `).join('') : '<div class="empty">조건이나 태그를 입력하면 추천 결과가 나옵니다.</div>'}
        </div>
      </section>

      <section class="panel">
        <h3>선택된 태그</h3>
        <div class="chips">
          ${selectedTags.length ? selectedTags.map((tag) => `<span class="chip">${tag}<button data-remove-tag="${tag}">×</button></span>`).join('') : '<span class="muted">아직 선택된 태그가 없습니다.</span>'}
        </div>
      </section>

      <section class="panel">
        <h3>태그 선택</h3>
        <input class="field" id="tagSearchInput" placeholder="태그 검색" value="${state.tagSearch}" />
        <div class="tag-groups" style="margin-top:12px;">
          ${Object.entries(filteredTagGroups).map(([category, items]) => `
            <div class="tag-group">
              <div class="tag-group-title">${category}</div>
              <div class="tag-list">
                ${items.map((tag) => `<button data-toggle-tag="${tag.name}" class="${selectedTags.includes(tag.name) ? 'active' : ''}">${tag.name}</button>`).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </section>

    `;
  }

  function renderAllView() {
    const programs = getAllPrograms();
    return `
      <section class="panel">
        <h2>전체 사업 보기</h2>
        <input class="field" id="allSearchInput" placeholder="사업명, 기관명, 태그, 설명 검색" value="${state.allSearch}" />
      </section>
      <section class="panel">
        ${programs.length ? `
          <div class="results">
            ${programs.map((program) => renderProgramCard(program, { keyPrefix: 'all' })).join('')}
          </div>
        ` : '<div class="empty">검색 결과가 없습니다.</div>'}
      </section>
    `;
  }

  function renderOrganizationView() {
    const organizations = getFilteredOrganizations();
    const selectedOrganization = data.organizations.find((org) => org.id === state.selectedOrganizationId);
    const programs = selectedOrganization
      ? data.programs.filter((program) => program.organization_id === selectedOrganization.id)
      : [];

    return `
      <section class="panel">
        <h2>기관별 보기</h2>
        <input class="field" id="orgSearchInput" placeholder="기관명 검색" value="${state.orgSearch}" />
        <p>${organizations.length}개 기관</p>
        <div class="org-buttons">
          ${organizations.slice(0, 24).map((org) => `<button data-select-org="${org.id}">${org.name}</button>`).join('')}
        </div>
      </section>
      ${selectedOrganization ? `
        <section class="panel">
          <h3>${selectedOrganization.name}</h3>
          <p class="muted">${selectedOrganization.phone || '연락처 없음'} / ${selectedOrganization.address || '주소 없음'}</p>
        </section>
        <section class="panel">
          <div class="results">
            ${programs.length ? programs.map((program) => renderProgramCard(program, { keyPrefix: 'organization' })).join('') : '<div class="empty">등록된 사업이 없습니다.</div>'}
          </div>
        </section>
      ` : ''}
    `;
  }

  function render() {
    const selectedTags = getSelectedTags();
    const root = document.getElementById('app');
    root.innerHTML = `
      <div class="layout">
        <aside class="sidebar">
          <div>
            <div class="brand-title">학생복지이음 로컬앱</div>
            <div class="brand-sub">인터넷 연결 없이 상담 현장에서 바로 쓰는 추천 도구</div>
          </div>
          <div class="nav">
            <button data-view="recommend" class="${state.viewMode === 'recommend' ? 'active' : ''}">추천 보기</button>
            <button data-view="all" class="${state.viewMode === 'all' ? 'active' : ''}">전체 보기</button>
            <button data-view="organization" class="${state.viewMode === 'organization' ? 'active' : ''}">기관별 보기</button>
          </div>
        </aside>
        <main class="main">
          <section class="panel notice-panel">
            <h2>시범운영 안내</h2>
            <p>
              본 도구는 학생 상담 지원을 위한 내부 시범운영용 참고 시스템입니다.
              추천 결과는 참고용이며, 최종 판단과 안내는 담당자가 직접 확인해야 합니다.
            </p>
            <p class="muted">
              개인정보가 포함된 자유서술 입력은 최소화하고, 최신 사업 여부와 실제 지원 대상은 반드시 상세 안내와 담당 기관을 통해 재확인하세요.
            </p>
          </section>

          <section class="hero">
            <div>
              <h1>학생 상황에 맞는 복지사업을 로컬에서 바로 찾습니다</h1>
              <p>자동태그, 조건 필터, 설명 부분 일치 추천을 모두 로컬 데이터 기반으로 동작시킵니다.</p>
            </div>
            <div class="stats">
              <div class="stat-card"><span>기관</span><strong>${data.organizations.length}</strong></div>
              <div class="stat-card"><span>사업</span><strong>${data.programs.length}</strong></div>
              <div class="stat-card"><span>태그</span><strong>${activeTags.length}</strong></div>
            </div>
          </section>
          ${state.viewMode === 'recommend' ? renderRecommendView(selectedTags) : ''}
          ${state.viewMode === 'all' ? renderAllView() : ''}
          ${state.viewMode === 'organization' ? renderOrganizationView() : ''}
        </main>
      </div>
    `;

    bindEvents();
    restorePendingFocus();
  }

  function queueFocusRestore(element) {
    if (!element || !element.id) {
      pendingFocus = null;
      return;
    }

    pendingFocus = {
      id: element.id,
      start:
        typeof element.selectionStart === 'number' ? element.selectionStart : null,
      end: typeof element.selectionEnd === 'number' ? element.selectionEnd : null,
    };
  }

  function restorePendingFocus() {
    if (!pendingFocus) return;

    const element = document.getElementById(pendingFocus.id);
    if (!element) {
      pendingFocus = null;
      return;
    }

    element.focus();

    if (
      typeof pendingFocus.start === 'number' &&
      typeof pendingFocus.end === 'number' &&
      typeof element.setSelectionRange === 'function'
    ) {
      element.setSelectionRange(pendingFocus.start, pendingFocus.end);
    }

    pendingFocus = null;
  }

  function scheduleSearchRender(element, value) {
    if (searchRenderTimer) {
      clearTimeout(searchRenderTimer);
    }

    searchRenderTimer = setTimeout(() => {
      queueFocusRestore(element);
      state.searchText = value;
      state.autoSelectedTags = createTagExtractor(state.searchText);
      render();
      searchRenderTimer = null;
    }, 180);
  }

  function bindEvents() {
    document.querySelectorAll('[data-view]').forEach((button) => {
      button.addEventListener('click', () => {
        state.viewMode = button.dataset.view;
        render();
      });
    });

    document.querySelectorAll('[data-toggle-open]').forEach((button) => {
      button.addEventListener('click', () => {
        const key = button.dataset.toggleOpen;
        state.openProgramKey = state.openProgramKey === key ? null : key;
        render();
      });
    });

    document.querySelectorAll('[data-toggle-section]').forEach((button) => {
      button.addEventListener('click', () => {
        const tag = button.dataset.toggleSection;
        state.openTag = state.openTag === tag ? null : tag;
        render();
      });
    });

    const ageInput = document.getElementById('ageInput');
    if (ageInput) ageInput.addEventListener('input', (e) => {
      queueFocusRestore(e.target);
      state.age = e.target.value;
      render();
    });

    const genderInput = document.getElementById('genderInput');
    if (genderInput) genderInput.addEventListener('change', (e) => { state.gender = e.target.value; render(); });

    const schoolInput = document.getElementById('schoolInput');
    if (schoolInput) schoolInput.addEventListener('change', (e) => { state.schoolLevel = e.target.value; render(); });

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('compositionstart', () => {
        isComposing = true;
        if (searchRenderTimer) {
          clearTimeout(searchRenderTimer);
          searchRenderTimer = null;
        }
      });
      searchInput.addEventListener('compositionend', (e) => {
        isComposing = false;
        scheduleSearchRender(e.target, e.target.value);
      });
      searchInput.addEventListener('input', (e) => {
        if (isComposing) {
          state.searchText = e.target.value;
          return;
        }
        scheduleSearchRender(e.target, e.target.value);
      });
    }

    const tagSearchInput = document.getElementById('tagSearchInput');
    if (tagSearchInput) tagSearchInput.addEventListener('input', (e) => {
      if (e.isComposing) return;
      queueFocusRestore(e.target);
      state.tagSearch = e.target.value;
      render();
    });

    const allSearchInput = document.getElementById('allSearchInput');
    if (allSearchInput) allSearchInput.addEventListener('input', (e) => {
      if (e.isComposing) return;
      queueFocusRestore(e.target);
      state.allSearch = e.target.value;
      render();
    });

    const orgSearchInput = document.getElementById('orgSearchInput');
    if (orgSearchInput) orgSearchInput.addEventListener('input', (e) => {
      if (e.isComposing) return;
      queueFocusRestore(e.target);
      state.orgSearch = e.target.value;
      render();
    });

    const resetRecommendBtn = document.getElementById('resetRecommendBtn');
    if (resetRecommendBtn) {
      resetRecommendBtn.addEventListener('click', () => {
        Object.assign(state, {
          age: '',
          gender: '',
          schoolLevel: '',
          searchText: '',
          tagSearch: '',
          autoSelectedTags: [],
          manualSelectedTags: [],
        });
        render();
      });
    }

    document.querySelectorAll('[data-toggle-tag]').forEach((button) => {
      button.addEventListener('click', () => {
        const tag = button.dataset.toggleTag;
        if (state.manualSelectedTags.includes(tag)) {
          state.manualSelectedTags = state.manualSelectedTags.filter((item) => item !== tag);
        } else {
          state.manualSelectedTags = [...state.manualSelectedTags, tag];
        }
        render();
      });
    });

    document.querySelectorAll('[data-remove-tag]').forEach((button) => {
      button.addEventListener('click', () => {
        const tag = button.dataset.removeTag;
        state.autoSelectedTags = state.autoSelectedTags.filter((item) => item !== tag);
        state.manualSelectedTags = state.manualSelectedTags.filter((item) => item !== tag);
        render();
      });
    });

    document.querySelectorAll('[data-select-org]').forEach((button) => {
      button.addEventListener('click', () => {
        state.selectedOrganizationId = button.dataset.selectOrg;
        render();
      });
    });
  }

  render();
})();
