import { APPLICATION_STATUSES } from "../utils/applicationStatuses";

export default function StatusBadge({ status }) {
  const label =
    APPLICATION_STATUSES.find((item) => item.value === status)?.label || status;

  return (
    <span className={`status-badge status-${status}`}>
      <span className="status-dot" />
      {label}
    </span>
  );
}
