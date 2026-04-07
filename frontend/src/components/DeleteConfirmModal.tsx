import { useEffect, useRef, type ReactNode } from 'react';

export interface DeleteConfirmModalProps {
  open: boolean;
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  error?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function DeleteConfirmModal({
  open,
  title = 'Confirm Delete',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  busy = false,
  error,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // Save the element that had focus when the modal opened so we can restore it on close.
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement;
      // Move focus into the modal on next frame so the dialog is rendered first.
      requestAnimationFrame(() => cancelRef.current?.focus());
    } else {
      // Restore focus to the trigger element when the modal closes.
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
      triggerRef.current = null;
    }
  }, [open]);

  // Block backdrop clicks and Escape while a delete is in progress.
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
      // Trap Tab inside the modal.
      if (e.key === 'Tab') {
        const focusable = document
          .getElementById('delete-confirm-modal')
          ?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          zIndex: 1040,
        }}
        onClick={() => {
          if (!busy) onCancel();
        }}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        id="delete-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1050,
          width: '100%',
          maxWidth: '420px',
          padding: '0 1rem',
        }}
      >
        <div
          className="shadow-lg rounded-3"
          style={{
            background: '#ffffff',
            color: '#212529',
            border: '1px solid rgba(0,0,0,0.15)',
          }}
        >
          <div
            className="d-flex align-items-center px-4 pt-4 pb-3"
            style={{ borderBottom: '1px solid #dee2e6' }}
          >
            <h5
              className="mb-0 fw-semibold"
              id="delete-modal-title"
              style={{ color: '#212529' }}
            >
              {title}
            </h5>
          </div>

          <div className="px-4 py-3">
            <p className="mb-0" style={{ color: '#343a40' }}>
              {message}
            </p>
            {error && (
              <div
                className="mt-3 mb-0 py-2 px-3 rounded-2"
                role="alert"
                style={{
                  background: '#f8d7da',
                  color: '#842029',
                  border: '1px solid #f5c2c7',
                  fontSize: '0.9rem',
                }}
              >
                {error}
              </div>
            )}
          </div>

          <div
            className="d-flex justify-content-end gap-2 px-4 pb-4 pt-3"
            style={{ borderTop: '1px solid #dee2e6' }}
          >
            <button
              ref={cancelRef}
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={busy}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className="btn btn-danger d-flex align-items-center gap-2"
              onClick={onConfirm}
              disabled={busy}
            >
              {busy && (
                <span
                  className="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                />
              )}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
