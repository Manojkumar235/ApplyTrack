import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import AuthShell from "../components/AuthShell";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await register(form);
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Unable to create your account."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      description="Build a more organized job search, one application at a time."
      footerText="Already have an account?"
      footerLinkText="Sign in"
      footerLinkTo="/login"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="form-alert" role="alert">{error}</div>}
        <label className="field-label" htmlFor="email">Email address</label>
        <input
          className="text-input"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          maxLength={254}
          value={form.email}
          onChange={updateField}
          required
        />
        <label className="field-label" htmlFor="password">Password</label>
        <input
          className="text-input"
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          minLength={8}
          maxLength={128}
          value={form.password}
          onChange={updateField}
          required
        />
        <p className="field-hint">Use 8–128 characters.</p>
        <button className="button-primary auth-submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
