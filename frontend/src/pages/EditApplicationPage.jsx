import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { applicationsApi, getApiErrorMessage } from "../api/client";
import { useApplications } from "../applications/ApplicationsContext";
import ApplicationForm from "../components/ApplicationForm";
import PageHeader from "../components/PageHeader";

export default function EditApplicationPage() {
  const { applicationId } = useParams();
  const { updateApplication } = useApplications();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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

  async function handleUpdate(payload) {
    const updated = await updateApplication(Number(applicationId), payload);
    navigate(`/dashboard/applications/${updated.id}`, {
      replace: true,
      state: { notice: "Application updated." },
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="EDIT OPPORTUNITY"
        title="Edit application"
        description={application?.company || "Update the details for this opportunity."}
        action={
          <Link
            to={`/dashboard/applications/${applicationId}`}
            className="button-secondary"
          >
            Cancel
          </Link>
        }
      />
      {error && <div className="form-alert page-alert" role="alert">{error}</div>}
      {isLoading ? (
        <div className="panel loading-row">Loading application…</div>
      ) : application ? (
        <ApplicationForm
          key={application.id}
          application={application}
          submitLabel="Save changes"
          onSubmit={handleUpdate}
        />
      ) : null}
    </>
  );
}
