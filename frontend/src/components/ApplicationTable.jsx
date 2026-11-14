import { Link, useNavigate } from "react-router-dom";
import Icon from "./Icons";
import StatusBadge from "./StatusBadge";
import {
  formatAppliedOn,
  formatLocation,
} from "../utils/applicationFormatting";

export default function ApplicationTable({
  applications,
  compact = false,
  emptyTitle = "No applications yet",
  emptyDescription = "Add your first opportunity to start tracking your progress.",
  showAddAction = true,
}) {
  const navigate = useNavigate();

  if (!applications.length) {
    return (
      <div className="empty-state">
        <span className="empty-icon">
          <Icon name="briefcase" size={22} />
        </span>
        <h3>{emptyTitle}</h3>
        <p>{emptyDescription}</p>
        {showAddAction && (
          <Link to="/dashboard/applications/new" className="button-primary mt-5">
            <Icon name="plus" size={17} />
            Add application
          </Link>
        )}
      </div>
    );
  }

  const visibleApplications = compact
    ? applications.slice(0, 5)
    : applications;

  return (
    <div className="table-scroll">
      <table className="applications-table">
        <thead>
          <tr>
            <th>Company & role</th>
            <th>Status</th>
            <th>Location</th>
            <th>{compact ? "Applied" : "Applied date"}</th>
          </tr>
        </thead>
        <tbody>
          {visibleApplications.map((application) => {
            const openApplication = () =>
              navigate(`/dashboard/applications/${application.id}`);
            return (
            <tr
              key={application.id}
              className="application-row"
              role="link"
              tabIndex={0}
              aria-label={`View ${application.company} ${application.position} details`}
              onClick={openApplication}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openApplication();
                }
              }}
            >
              <td>
                <div className="company-cell">
                  <span className="company-avatar">
                    {application.company.charAt(0).toUpperCase()}
                  </span>
                  <span>
                    <span className="company-name">{application.company}</span>
                    <span className="company-role">{application.position}</span>
                  </span>
                </div>
              </td>
              <td>
                <StatusBadge status={application.status} />
              </td>
              <td className="muted-cell">
                {formatLocation(application.location)}
              </td>
              <td className="muted-cell">
                {formatAppliedOn(application.applied_on)}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
      {compact && applications.length > 5 && (
        <div className="table-footer">
          <Link to="/dashboard/applications" className="text-link">
            View all applications
            <Icon name="arrow" size={16} />
          </Link>
        </div>
      )}
    </div>
  );
}
