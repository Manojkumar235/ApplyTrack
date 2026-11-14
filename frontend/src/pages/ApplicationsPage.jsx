import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useApplications } from "../applications/ApplicationsContext";
import ApplicationTable from "../components/ApplicationTable";
import Icon from "../components/Icons";
import PageHeader from "../components/PageHeader";
import {
  APPLICATION_STATUSES,
  filterApplications,
} from "../utils/applicationStatuses";

export default function ApplicationsPage() {
  const { applications, isLoading, error } = useApplications();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const location = useLocation();

  const filteredApplications = useMemo(
    () => filterApplications(applications, search, status),
    [applications, search, status],
  );

  return (
    <>
      <PageHeader
        eyebrow="YOUR PIPELINE"
        title="Applications"
        description="Keep every opportunity and follow-up in one place."
        action={
          <Link to="/dashboard/applications/new" className="button-primary">
            <Icon name="plus" size={18} />
            Add application
          </Link>
        }
      />

      {error && <div className="form-alert page-alert" role="alert">{error}</div>}
      {location.state?.notice && (
        <div className="success-alert page-alert" role="status">
          {location.state.notice}
        </div>
      )}

      <section className="panel applications-panel">
        <div className="application-toolbar">
          <div className="search-field">
            <Icon name="search" size={18} />
            <input
              aria-label="Search applications"
              type="search"
              placeholder="Search company, role, or location"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <label className="filter-select-wrap">
            <span className="sr-only">Filter by status</span>
            <select
              className="filter-select"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">All applications</option>
              {APPLICATION_STATUSES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {isLoading ? (
          <div className="loading-row">Loading your applications…</div>
        ) : (
          <ApplicationTable applications={filteredApplications} />
        )}
      </section>
    </>
  );
}
