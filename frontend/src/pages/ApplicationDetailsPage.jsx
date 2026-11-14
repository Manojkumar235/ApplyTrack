import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { applicationsApi, getApiErrorMessage } from "../api/client";
import { useApplications } from "../applications/ApplicationsContext";
import ConfirmationDialog from "../components/ConfirmationDialog";
import Icon from "../components/Icons";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import {
  formatAppliedOn,
  formatLocation,
} from "../utils/applicationFormatting";

export default function ApplicationDetailsPage() {
  const { applicationId } = useParams();
  const { deleteApplication } = useApplications();
  const location = useLocation();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError("");
    applicationsApi
      .get(applicationId)
      .then(({ data }) => {
        if (active) setApplication(data.application);
      })
      .catch((requestError) => {
        if (active) {
          setError(
            getApiErrorMessage(
              requestError,
              "Could not load this application.",
            ),
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [applicationId]);

  async function handleDelete() {
    setDeleteError("");
    setIsDeleting(true);
    try {
      await deleteApplication(Number(applicationId));
      navigate("/dashboard/applications", {
        replace: true,
        state: { notice: "Application deleted." },
      });
    } catch (requestError) {
      setDeleteError(
        getApiErrorMessage(requestError, "Could not delete this application."),
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="APPLICATION DETAILS"
        title={application?.company || "Application"}
        description={application?.position || "Review and manage this opportunity."}
        action={
          <div className="detail-actions">
            <Link
              to={`/dashboard/applications/${applicationId}/edit`}
              className="button-secondary"
            >
              <Icon name="chart" size={17} />
              Edit
            </Link>
            <button
              type="button"
              className="button-danger-outline"
              onClick={() => {
                setDeleteError("");
                setIsDialogOpen(true);
              }}
              disabled={!application}
            >
              <Icon name="close" size={17} />
              Delete
            </button>
          </div>
        }
      />

      {location.state?.notice && (
        <div className="success-alert page-alert" role="status">
          {location.state.notice}
        </div>
      )}
      {error && <div className="form-alert page-alert" role="alert">{error}</div>}
      {isLoading ? (
        <div className="panel loading-row">Loading application details…</div>
      ) : application ? (
        <section className="panel application-detail-panel">
          <div className="detail-summary">
            <span className="company-avatar detail-company-avatar">
              {application.company.charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="eyebrow">CURRENT STATUS</p>
              <StatusBadge status={application.status} />
            </div>
          </div>

          <dl className="detail-grid">
            <DetailItem label="Company" value={application.company} />
            <DetailItem label="Position" value={application.position} />
            <DetailItem
              label="Location"
              value={formatLocation(application.location)}
            />
            <DetailItem
              label="Applied on"
              value={formatAppliedOn(application.applied_on)}
            />
            <div className="detail-item">
              <dt>Application URL</dt>
              <dd>
                {application.url ? (
                  <a
                    className="text-link detail-url"
                    href={application.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {application.url}
                    <Icon name="arrow" size={15} />
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>

          <div className="detail-notes">
            <h2>Notes</h2>
            <p>{application.notes || "No notes have been added."}</p>
          </div>
        </section>
      ) : null}

      {isDialogOpen && (
        <ConfirmationDialog
          title="Delete this application?"
          message="This action permanently removes the application from your tracker."
          isWorking={isDeleting}
          error={deleteError}
          onCancel={() => setIsDialogOpen(false)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="detail-item">
      <dt>{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}
