import { type ReactNode, useEffect, useRef } from "react";

interface ConfirmDialogProps {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  isBusy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        className="dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !isBusy) onCancel();
        }}
      >
        <h2 id="confirm-dialog-title">{title}</h2>
        <div className="dialog-content">{children}</div>
        <div className="button-row">
          <button
            className="button button-secondary"
            type="button"
            disabled={isBusy}
            onClick={onCancel}
            ref={cancelButtonRef}
          >
            {cancelLabel}
          </button>
          <button
            className="button button-danger"
            type="button"
            disabled={isBusy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
