import { Link } from "react-router-dom";

export default function AuthShell({
  title,
  description,
  footerText,
  footerLinkText,
  footerLinkTo,
  children,
}) {
  return (
    <main className="auth-page">
      <div className="auth-brand">
        <Link to="/" className="brand-lockup" aria-label="ApplyTrack home">
          <span className="brand-mark">A</span>
          <span>ApplyTrack</span>
        </Link>
      </div>
      <section className="auth-card">
        <div className="auth-heading">
          <p className="eyebrow">YOUR NEXT OPPORTUNITY, ORGANIZED</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {children}
        <p className="auth-footer">
          {footerText}{" "}
          <Link to={footerLinkTo} className="text-link">
            {footerLinkText}
          </Link>
        </p>
      </section>
      <p className="auth-legal">
        A clearer path from application to offer.
      </p>
    </main>
  );
}
