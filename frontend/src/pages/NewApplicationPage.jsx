import { Link, useNavigate } from "react-router-dom";
import { useApplications } from "../applications/ApplicationsContext";
import ApplicationForm from "../components/ApplicationForm";
import PageHeader from "../components/PageHeader";

export default function NewApplicationPage() {
  const { createApplication } = useApplications();
  const navigate = useNavigate();

  async function handleCreate(payload) {
    const application = await createApplication(payload);
    navigate(`/dashboard/applications/${application.id}`, {
      replace: true,
      state: { notice: "Application added to your tracker." },
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="NEW OPPORTUNITY"
        title="Add application"
        description="Capture the details now, and keep your next step visible."
        action={
          <Link to="/dashboard/applications" className="button-secondary">
            Cancel
          </Link>
        }
      />
      <ApplicationForm
        submitLabel="Save application"
        onSubmit={handleCreate}
      />
    </>
  );
}
