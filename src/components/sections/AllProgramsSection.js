import React from 'react';
import ProgramCard from '../ProgramCard';

function AllProgramsSection({
  allPrograms,
  allProgramSearch,
  setAllProgramSearch,
  isAdmin,
  selectedProgramIds,
  setSelectedProgramIds,
  handleDeleteSelectedPrograms,
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
          onChange={(event) => setAllProgramSearch(event.target.value)}
        />
      </div>

      {isAdmin && allPrograms.length > 0 && (
        <section className="panel" style={{ marginBottom: 16 }}>
          <div className="action-row">
            <button
              className="btn btn-secondary"
              onClick={() => setSelectedProgramIds(allPrograms.map((program) => program.id))}
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
          {allPrograms.map((program) => (
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
  );
}

export default AllProgramsSection;
