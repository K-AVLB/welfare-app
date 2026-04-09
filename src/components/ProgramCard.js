import React from 'react';
import { CRITICAL_TAGS } from '../constants/appData';
import { splitProgramDescription } from '../utils/programDetail';

function ProgramCard({
  program,
  index = null,
  showScore = false,
  isAdmin,
  isSelected,
  isOpen,
  organization,
  getOrganizationName,
  onToggleOpen,
  onToggleSelect,
  onEdit,
  onDelete,
}) {
  const isCritical = program.tags?.some((tag) => CRITICAL_TAGS.includes(tag));
  const isTop = index !== null && index < 3;
  const { summary, detailLink } = splitProgramDescription(program.description);

  return (
    <div
      className={`program-card ${isCritical ? 'critical' : isTop ? 'top' : ''}`}
      onClick={onToggleOpen}
    >
      {isAdmin && (
        <div
          style={{ marginBottom: 10 }}
          onClick={(event) => event.stopPropagation()}
        >
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
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
            <div className="program-badge top">⭐ 맞춤 TOP {index + 1}</div>
          )}
          <h3 className="program-title">{program.name}</h3>
          <p className="program-sub">
            {getOrganizationName(program.organization_id, program.organization)}
          </p>
        </div>

        <div className="program-head-right">
          {showScore && <div className="score-chip">{program.score}점</div>}
          <div className="detail-toggle">
            {isOpen ? '상세 닫기 ▲' : '상세 보기 ▼'}
          </div>
        </div>
      </div>

      <div className="program-summary">
        <p>{summary || '설명 없음'}</p>

        {showScore && program.matchedTags && program.matchedTags.length > 0 && (
          <p className="program-match">
            일치 태그: {program.matchedTags.join(', ')}
          </p>
        )}

        {showScore && program.reasons && program.reasons.length > 0 && (
          <p className="program-match">
            맞춤 이유: {program.reasons.join(', ')}
          </p>
        )}

        {showScore && program.hasCriticalMatch && (
          <p className="program-match" style={{ color: '#dc2626', fontWeight: 700 }}>
            긴급 태그 일치:{' '}
            {program.matchedTags
              .filter((tag) => CRITICAL_TAGS.includes(tag))
              .join(', ')}
          </p>
        )}
      </div>

      {isOpen && (
        <div
          className="program-detail"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="detail-grid">
            <div className="detail-block">
              <h4>사업 정보</h4>
              <p>
                <strong>설명</strong>
                <br />
                {summary || '설명 없음'}
              </p>
              {detailLink && (
                <p>
                  <strong>상세 안내</strong>
                  <br />
                  <a href={detailLink} target="_blank" rel="noreferrer">
                    {detailLink}
                  </a>
                </p>
              )}
              <p>
                <strong>대상 연령</strong>
                <br />
                {program.min_age ?? '무관'} ~ {program.max_age ?? '무관'}
              </p>
              <p>
                <strong>대상 성별</strong>
                <br />
                {program.gender || '무관'}
              </p>
              <p>
                <strong>학령</strong>
                <br />
                {program.school_level || '무관'}
              </p>
              <p>
                <strong>전체 태그</strong>
                <br />
                {program.tags ? program.tags.join(', ') : '없음'}
              </p>
            </div>

            <div className="detail-block">
              <h4>연계 기관</h4>
              <p>
                <strong>기관명</strong>
                <br />
                {organization?.name || program.organization || '기관 없음'}
              </p>
              <p>
                <strong>대표전화</strong>
                <br />
                {organization?.phone || program.phone || '연락처 없음'}
              </p>
              <p>
                <strong>주소</strong>
                <br />
                {organization?.address || '주소 없음'}
              </p>
              <p>
                <strong>담당자</strong>
                <br />
                {organization?.contact_person || '담당자 없음'}
              </p>
            </div>
          </div>

          <div className="detail-actions">
            {(organization?.phone || program.phone) && (
              <a href={`tel:${organization?.phone || program.phone}`}>
                <button className="btn btn-primary">전화하기</button>
              </a>
            )}
            {detailLink && (
              <a href={detailLink} target="_blank" rel="noreferrer">
                <button className="btn btn-secondary">상세 안내</button>
              </a>
            )}

            {isAdmin && (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={() => onEdit(program)}
                >
                  수정
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => onDelete(program.id)}
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
}

export default ProgramCard;
