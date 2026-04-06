import React from 'react';

function AdminLoginModal({
  isOpen,
  email,
  password,
  error,
  isSubmitting,
  onEmailChange,
  onPasswordChange,
  onClose,
  onSubmit,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2>관리자 로그인</h2>
            <p>관리자 계정으로 로그인해야 관리 기능을 사용할 수 있습니다.</p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="로그인 창 닫기"
          >
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={onSubmit}>
          <input
            className="field"
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            autoComplete="username"
          />

          <input
            className="field"
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            autoComplete="current-password"
          />

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? '로그인 중...' : '로그인'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminLoginModal;
