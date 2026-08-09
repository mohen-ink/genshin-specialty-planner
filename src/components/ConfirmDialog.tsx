import { useEffect } from "react";

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({ title, description, confirmLabel, onCancel, onConfirm }: ConfirmDialogProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className="modal-backdrop confirm-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onCancel();
    }}>
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className="confirm-stamp">!</div>
        <h2 id="confirm-title">{title}</h2>
        <p>{description}</p>
        <div className="confirm-actions"><button className="secondary-button" onClick={onCancel}>取消</button><button className="danger-button" onClick={onConfirm}>{confirmLabel}</button></div>
      </section>
    </div>
  );
}
