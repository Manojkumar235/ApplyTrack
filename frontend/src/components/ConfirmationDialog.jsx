import { useEffect } from "react";
import Icon from "./Icons";

export default function ConfirmationDialog({
  title,
  message,
  confirmLabel = "Delete",
  isWorking = false,
  error = "",
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && !isWorking) onCancel();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isWorking, onCancel]);

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isWorking) onCancel();
      }}
    >
      <section
        className="confirmation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-message"
      >
        <span className="dialog-warning-icon">
          <Icon name="close" size={20} />
        </span>
        <h2 id="confirmation-title">{title}</h2>
        <p id="confirmation-message">{message}</p>
        {error && (
          <div className="form-alert dialog-error" role="alert">
            {error}
          </div>
        )}
        <div className="dialog-actions">
          <button
            type="button"
            className="button-secondary"
            onClick={onCancel}
            disabled={isWorking}
            autoFocus
          >
            Cancel
          </button>
          <button
            type="button"
            className="button-danger"
            onClick={onConfirm}
            disabled={isWorking}
          >
            {isWorking ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
