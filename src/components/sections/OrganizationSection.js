import React from 'react';
import ProgramCard from '../ProgramCard';

function OrganizationSection({
  orgSearch,
  setOrgSearch,
  filteredOrganizations,
  selectedOrganizationId,
  setSelectedOrganizationId,
  selectedOrganization,
  organizationPrograms,
  isAdmin,
  selectedProgramIds,
  openProgramId,
  getOrganizationById,
  getOrganizationName,
  toggleProgramOpen,
  toggleProgramSelection,
  handleEditProgram,
  handleDeleteProgram,
}) {
  return (
    <>
      <section className="panel glass">
        <div className="panel-header">
          <h2>기관별 사업 보기</h2>
          <p>기관명을 검색하거나 선택하면 해당 기관이 운영하는 사업만 볼 수 있습니다.</p>
        </div>

        <input
          className="field"
          placeholder="기관명 검색 (예: 청소년, 상담, 복지)"
          value={orgSearch}
          onChange={(event) => setOrgSearch(event.target.value)}
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
              {filteredOrganizations.slice(0, 20).map((organization) => (
                <button
                  key={organization.id}
                  className="btn btn-secondary"
                  onClick={() => setSelectedOrganizationId(organization.id)}
                >
                  {organization.name}
                </button>
              ))}
            </div>

            <select
              className="field"
              value={selectedOrganizationId}
              onChange={(event) => setSelectedOrganizationId(event.target.value)}
            >
              <option value="">기관 선택</option>
              {filteredOrganizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </>
        )}
      </section>

      {selectedOrganizationId && (
        <>
          <section className="panel">
            <div className="org-hero">
              <div>
                <h2>{selectedOrganization?.name || '기관 없음'}</h2>
                <p>📞 {selectedOrganization?.phone || '연락처 없음'}</p>
                <p>{selectedOrganization?.address || '주소 없음'}</p>
                <p>담당자: {selectedOrganization?.contact_person || '담당자 없음'}</p>
              </div>
            </div>
          </section>

          <section className="result-head">
            <div>
              <h2>이 기관의 사업</h2>
            </div>
            <div className="result-count">{organizationPrograms.length}개</div>
          </section>

          {organizationPrograms.length === 0 ? (
            <div className="empty-state">
              <h3>등록된 사업이 없습니다</h3>
            </div>
          ) : (
            <div className="cards scroll-box recommend-scroll">
              {organizationPrograms.map((program) => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  isAdmin={isAdmin}
                  isSelected={selectedProgramIds.includes(program.id)}
                  isOpen={openProgramId === program.id}
                  organization={getOrganizationById(program.organization_id)}
                  getOrganizationName={getOrganizationName}
                  onToggleOpen={() => toggleProgramOpen(program.id)}
                  onToggleSelect={() => toggleProgramSelection(program.id)}
                  onEdit={handleEditProgram}
                  onDelete={handleDeleteProgram}
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

export default OrganizationSection;
