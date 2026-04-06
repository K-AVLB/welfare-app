import React from 'react';

function AdminSection({
  formRef,
  orgFormRef,
  editingId,
  form,
  setForm,
  organizations,
  groupedActiveTags,
  handleSaveProgram,
  resetForm,
  orgEditingId,
  orgForm,
  setOrgForm,
  handleSaveOrganization,
  resetOrgForm,
  tagEditingId,
  tagForm,
  setTagForm,
  tagCategories,
  newTagCategory,
  setNewTagCategory,
  handleSaveTag,
  resetTagForm,
  handleOrgExcelSelect,
  handleUploadOrganizations,
  orgUploadPreview,
  handleProgramExcelSelect,
  handleUploadPrograms,
  programUploadPreview,
  adminOrgSearch,
  setAdminOrgSearch,
  filteredAdminOrganizations,
  selectedOrganizationIds,
  setSelectedOrganizationIds,
  handleDeleteSelectedOrganizations,
  toggleOrganizationSelection,
  handleEditOrganization,
  handleDeleteOrganization,
  adminTagSearch,
  setAdminTagSearch,
  filteredAdminTags,
  handleEditTag,
  handleDeactivateTag,
  handleDeleteTag,
  handleExportOrganizations,
  handleExportPrograms,
}) {
  return (
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
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />

            <select
              className="field"
              value={form.organization_id}
              onChange={(event) => {
                const selectedId = event.target.value;
                const selectedOrg = organizations.find(
                  (organization) => String(organization.id) === String(selectedId)
                );

                setForm((prev) => ({
                  ...prev,
                  organization_id: selectedId,
                  organization: selectedOrg ? selectedOrg.name : '',
                }));
              }}
            >
              <option value="">기관 선택</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>

            <input
              className="field"
              placeholder="전화번호"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />

            <input
              className="field"
              placeholder="설명"
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />

            <input
              className="field"
              type="number"
              placeholder="최소 연령"
              value={form.min_age}
              onChange={(event) => setForm({ ...form, min_age: event.target.value })}
            />

            <input
              className="field"
              type="number"
              placeholder="최대 연령"
              value={form.max_age}
              onChange={(event) => setForm({ ...form, max_age: event.target.value })}
            />

            <select
              className="field"
              value={form.gender}
              onChange={(event) => setForm({ ...form, gender: event.target.value })}
            >
              <option value="무관">성별 무관</option>
              <option value="남">남</option>
              <option value="여">여</option>
            </select>

            <select
              className="field"
              value={form.school_level}
              onChange={(event) =>
                setForm({ ...form, school_level: event.target.value })
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
                              ? prev.tags.filter((item) => item !== tag.name)
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
              onChange={(event) =>
                setOrgForm({ ...orgForm, name: event.target.value })
              }
            />
            <input
              className="field"
              placeholder="기관 전화번호"
              value={orgForm.phone}
              onChange={(event) =>
                setOrgForm({ ...orgForm, phone: event.target.value })
              }
            />
            <input
              className="field"
              placeholder="주소"
              value={orgForm.address}
              onChange={(event) =>
                setOrgForm({ ...orgForm, address: event.target.value })
              }
            />
            <input
              className="field"
              placeholder="담당자"
              value={orgForm.contact_person}
              onChange={(event) =>
                setOrgForm({ ...orgForm, contact_person: event.target.value })
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
              onChange={(event) =>
                setTagForm({ ...tagForm, name: event.target.value })
              }
            />

            <select
              className="field"
              value={tagForm.category}
              onChange={(event) =>
                setTagForm({ ...tagForm, category: event.target.value })
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
              onChange={(event) => setNewTagCategory(event.target.value)}
            />

            <label className="switch-row">
              <input
                type="checkbox"
                checked={tagForm.is_active}
                onChange={(event) =>
                  setTagForm({ ...tagForm, is_active: event.target.checked })
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
              onChange={(event) => setAdminOrgSearch(event.target.value)}
              style={{ marginBottom: 12 }}
            />
          </div>

          <div className="action-row" style={{ marginBottom: 12 }}>
            <button
              className="btn btn-secondary"
              onClick={() =>
                setSelectedOrganizationIds(
                  filteredAdminOrganizations.map((organization) => organization.id)
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

            {filteredAdminOrganizations.map((organization) => (
              <div key={organization.id} className="simple-item">
                <div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={selectedOrganizationIds.includes(organization.id)}
                        onChange={() => toggleOrganizationSelection(organization.id)}
                      />
                      <span>선택</span>
                    </label>
                  </div>

                  <strong>{organization.name}</strong>
                  <p>{organization.phone || '연락처 없음'}</p>
                  <p>{organization.address || '주소 없음'}</p>
                  <p>담당자: {organization.contact_person || '담당자 없음'}</p>
                </div>

                <div className="action-row">
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleEditOrganization(organization)}
                  >
                    수정
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDeleteOrganization(organization.id)}
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
              onChange={(event) => setAdminTagSearch(event.target.value)}
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
  );
}

export default AdminSection;
