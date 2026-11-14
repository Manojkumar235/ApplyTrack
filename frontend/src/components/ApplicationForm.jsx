import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getApiErrorMessage } from "../api/client";
import { toApplicationPayload } from "../api/applicationPayload";
import { APPLICATION_STATUSES } from "../utils/applicationStatuses";
import Icon from "./Icons";

export const emptyApplicationForm = {
  company: "",
  position: "",
  status: "saved",
  location: "",
  url: "",
  applied_on: "",
  notes: "",
};

function toFormValues(application) {
  return {
    ...emptyApplicationForm,
    ...toApplicationPayload(application || {}),
    location: application?.location || "",
    url: application?.url || "",
    applied_on: application?.applied_on || "",
    notes: application?.notes || "",
  };
}

export default function ApplicationForm({
  application,
  submitLabel,
  onSubmit,
}) {
  const [form, setForm] = useState(() => toFormValues(application));
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setForm(toFormValues(application));
  }, [application]);

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await onSubmit(toApplicationPayload({
        ...form,
        location: form.location || null,
        url: form.url || null,
        notes: form.notes || null,
        applied_on: form.applied_on || null,
      }));
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Could not save this application."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="panel form-panel">
      {error && (
        <div className="form-alert page-alert" role="alert">
          {error}
        </div>
      )}
      <form className="application-form" onSubmit={handleSubmit}>
        <div className="form-section-heading">
          <span className="form-section-icon">
            <Icon name="briefcase" size={18} />
          </span>
          <div>
            <h2>Role details</h2>
            <p>Keep the company and position information up to date.</p>
          </div>
        </div>
        <div className="form-grid">
          <FormField
            label="Company"
            name="company"
            required
            value={form.company}
            onChange={updateField}
            placeholder="e.g. Northstar Labs"
            maxLength={160}
          />
          <FormField
            label="Position"
            name="position"
            required
            value={form.position}
            onChange={updateField}
            placeholder="e.g. Product Design Intern"
            maxLength={160}
          />
          <label className="form-field">
            <span className="field-label">Status</span>
            <select
              className="text-input"
              name="status"
              value={form.status}
              onChange={updateField}
            >
              {APPLICATION_STATUSES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <FormField
            label="Location"
            name="location"
            value={form.location}
            onChange={updateField}
            placeholder="City, state or remote"
            maxLength={160}
          />
          <FormField
            label="Application URL"
            name="url"
            type="url"
            value={form.url}
            onChange={updateField}
            placeholder="https://company.com/jobs/..."
            maxLength={2048}
          />
          <FormField
            label="Applied on"
            name="applied_on"
            type="date"
            value={form.applied_on}
            onChange={updateField}
          />
        </div>
        <label className="form-field notes-field">
          <span className="field-label">
            Notes <span className="optional-label">Optional</span>
          </span>
          <textarea
            className="text-input textarea-input"
            name="notes"
            rows={4}
            value={form.notes}
            onChange={updateField}
            placeholder="Add a reminder, contact, or detail you want to remember."
          />
        </label>
        <div className="form-actions">
          <Link to="/dashboard/applications" className="button-secondary">
            Cancel
          </Link>
          <button className="button-primary" disabled={isSubmitting}>
            <Icon name="plus" size={17} />
            {isSubmitting ? "Saving..." : submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
}

function FormField({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  maxLength,
}) {
  return (
    <label className="form-field">
      <span className="field-label">
        {label} {!required && <span className="optional-label">Optional</span>}
      </span>
      <input
        className="text-input"
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        required={required}
      />
    </label>
  );
}
