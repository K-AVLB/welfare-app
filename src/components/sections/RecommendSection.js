import React from 'react';
import { HIGH_RISK_TAGS, MEDIUM_RISK_TAGS } from '../../constants/appData';
import { splitProgramDescription } from '../../utils/programDetail';

function RecommendSection({
  resultRef,
  showTestPanel,
  setShowTestPanel,
  testResults,
  recommendedPrograms,
  selectedProgramIds,
  setSelectedProgramIds,
  handleExportSelectedPrograms,
  handleDeleteSelectedPrograms,
  isAdmin,
  sortedGroupedPrograms,
  openTag,
  setOpenTag,
  openProgramId,
  setOpenProgramId,
  age,
  setAge,
  gender,
  setGender,
  schoolLevel,
  setSchoolLevel,
  searchText,
  handleLiveCaseInput,
  autoTagging,
  handleResetRecommendFilters,
  tagSearch,
  setTagSearch,
  selectedTags,
  removeTagCompletely,
  filteredGroupedTags,
  toggleManualTag,
}) {
  return (
    <>
      <section className="result-head" ref={resultRef}>
        <div>
          <h2>추천 사업</h2>

          <div style={{ marginTop: 10 }}>
            <button
              onClick={() => setShowTestPanel((prev) => !prev)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #ccc',
                background: '#f8fafc',
                cursor: 'pointer',
              }}
            >
              {showTestPanel ? '테스트 닫기' : '테스트 열기'}
            </button>
          </div>

          {showTestPanel && (
            <div
              style={{
                marginTop: 20,
                padding: 16,
                background: '#f9fafb',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
              }}
            >
              <h3 style={{ marginBottom: 12 }}>테스트 결과</h3>

              {testResults.map((test) => (
                <div
                  key={test.id}
                  style={{
                    marginBottom: 12,
                    padding: 12,
                    borderRadius: 8,
                    background: test.passed ? '#ecfdf5' : '#fef2f2',
                    border: `1px solid ${test.passed ? '#10b981' : '#ef4444'}`,
                  }}
                >
                  <div style={{ fontWeight: 700 }}>
                    [{test.passed ? '통과' : '실패'}] {test.input}
                  </div>

                  <div>👉 기대: {test.expected.join(', ')}</div>
                  <div>👉 실제: {test.actual.join(', ')}</div>

                  {test.missing.length > 0 && (
                    <div style={{ color: 'red' }}>
                      ❌ 누락: {test.missing.join(', ')}
                    </div>
                  )}

                  {test.unexpected.length > 0 && (
                    <div style={{ color: 'orange' }}>
                      ⚠️ 추가됨: {test.unexpected.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <p>선택한 조건과 태그를 기반으로 추천됩니다</p>
        </div>
        <div className="result-count">{recommendedPrograms.length}개 결과</div>
      </section>

      {recommendedPrograms.length > 0 && (
        <section className="panel" style={{ marginBottom: 16 }}>
          <div className="action-row">
            <button
              className="btn btn-secondary"
              onClick={() =>
                setSelectedProgramIds(recommendedPrograms.map((program) => program.id))
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
              className="btn btn-secondary"
              onClick={handleExportSelectedPrograms}
            >
              선택 엑셀 다운로드 ({selectedProgramIds.length})
            </button>

            {isAdmin && (
              <button
                className="btn btn-danger"
                onClick={handleDeleteSelectedPrograms}
              >
                선택 삭제 ({selectedProgramIds.length})
              </button>
            )}
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
          {sortedGroupedPrograms.map(([tag, organizations]) => {
            const totalCount = Object.values(organizations).flat().length;
            const isOpen = openTag === tag;
            const isHighRisk = HIGH_RISK_TAGS.includes(tag);
            const isMediumRisk = MEDIUM_RISK_TAGS.includes(tag);
            const tagProgramIds = [
              ...new Set(
                Object.values(organizations)
                  .flat()
                  .map((program) => program.id)
              ),
            ];
            const isTagSelected =
              tagProgramIds.length > 0 &&
              tagProgramIds.every((id) => selectedProgramIds.includes(id));
            const selectedTagCount = tagProgramIds.filter((id) =>
              selectedProgramIds.includes(id)
            ).length;

            return (
              <div key={tag} className="tag-section">
                <div
                  className={`tag-header ${isHighRisk ? 'high-risk' : ''} ${isMediumRisk ? 'medium-risk' : ''}`}
                >
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      fontWeight: 700,
                    }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isTagSelected}
                      onChange={() => {
                        setSelectedProgramIds((prev) => {
                          if (isTagSelected) {
                            return prev.filter((id) => !tagProgramIds.includes(id));
                          }

                          return [...new Set([...prev, ...tagProgramIds])];
                        });
                      }}
                    />
                    <span>
                      선택 ({selectedTagCount}/{tagProgramIds.length})
                    </span>
                  </label>

                  <button
                    type="button"
                    className="tag-header-toggle"
                    onClick={() => setOpenTag((prev) => (prev === tag ? null : tag))}
                  >
                    <span className="tag-title">
                      {isHighRisk && '🚨 '}
                      {isMediumRisk && '⚠️ '}#{tag} 관련 지원 ({totalCount})
                    </span>

                    <span className="tag-toggle">{isOpen ? '▲' : '▼'}</span>
                  </button>
                </div>

                {isOpen && (
                  <div className="tag-section-scroll">
                    {Object.entries(organizations).map(([orgName, programs]) => (
                      <div key={orgName} className="org-group">
                        <h4 className="org-title">
                          {orgName} ({programs.length})
                        </h4>

                        <div className="program-list">
                          {programs.map((program) => {
                            const { summary, detailLink } = splitProgramDescription(
                              program.description
                            );

                            return (
                            <div key={program.id} className="program-simple">
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  marginBottom: 6,
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedProgramIds.includes(program.id)}
                                  onChange={() => {
                                    setSelectedProgramIds((prev) =>
                                      prev.includes(program.id)
                                        ? prev.filter((id) => id !== program.id)
                                        : [...prev, program.id]
                                    );
                                  }}
                                  onClick={(event) => event.stopPropagation()}
                                />

                                <button
                                  type="button"
                                  className="program-simple-title"
                                  onClick={() =>
                                    setOpenProgramId((prev) =>
                                      prev === program.id ? null : program.id
                                    )
                                  }
                                  style={{ flex: 1, textAlign: 'left' }}
                                >
                                  {program.name}
                                </button>
                              </div>

                              {openProgramId === program.id && (
                                <div className="program-detail-box">
                                  <h3>{summary || '설명 없음'}</h3>

                                  <p>✔ 일치 태그: {program.matchedTags.join(', ')}</p>
                                  <p>💡 추천 사유: {program.reasons.join(', ')}</p>

                                  <p>
                                    📞 전화:{' '}
                                    {program.phone ? (
                                      <a
                                        href={`tel:${program.phone}`}
                                        style={{ color: '#2563eb', fontWeight: 600 }}
                                      >
                                        {program.phone}
                                      </a>
                                    ) : (
                                      '연락처 없음'
                                    )}
                                  </p>
                                  {detailLink && (
                                    <p>
                                      <strong>상세 안내:</strong>{' '}
                                      <a
                                        href={detailLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{ color: '#2563eb', fontWeight: 600 }}
                                      >
                                        바로가기
                                      </a>
                                    </p>
                                  )}
                                  <p>
                                    <strong>지원연령:</strong> {program.min_age ?? '무관'} ~{' '}
                                    {program.max_age ?? '무관'}세
                                  </p>
                                  <p>
                                    <strong>학령:</strong> {program.school_level || '무관'}
                                  </p>
                                  <p>
                                    <strong>전체 태그:</strong>{' '}
                                    {program.tags?.join(', ') || '없음'}
                                  </p>
                                </div>
                              )}
                            </div>
                            );
                          })}
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
            onChange={(event) => setAge(event.target.value)}
          />

          <select
            className="field"
            value={gender}
            onChange={(event) => setGender(event.target.value)}
          >
            <option value="">성별 선택</option>
            <option value="남">남</option>
            <option value="여">여</option>
          </select>

          <select
            className="field"
            value={schoolLevel}
            onChange={(event) => setSchoolLevel(event.target.value)}
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
            onChange={(event) => handleLiveCaseInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                setTimeout(() => {
                  resultRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }
            }}
          />

          <button
            className="btn btn-primary"
            onClick={() => {
              autoTagging(searchText);
              setTimeout(() => {
                resultRef.current?.scrollIntoView({ behavior: 'smooth' });
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
            onChange={(event) => setTagSearch(event.target.value)}
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
  );
}

export default RecommendSection;
