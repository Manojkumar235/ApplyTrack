import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Icon from "../components/Icons";

function initials(email) {
  return email?.charAt(0)?.toUpperCase() || "A";
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <NavLink to="/dashboard" className="brand-lockup sidebar-brand">
          <span className="brand-mark">A</span>
          <span>ApplyTrack</span>
        </NavLink>

        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              `sidebar-link${isActive ? " active" : ""}`
            }
          >
            <Icon name="grid" />
            <span>Overview</span>
          </NavLink>
          <NavLink
            to="/dashboard/applications"
            className={({ isActive }) =>
              `sidebar-link${isActive ? " active" : ""}`
            }
          >
            <Icon name="briefcase" />
            <span>Applications</span>
          </NavLink>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <span className="help-mark">?</span>
            <span>
              <strong>Stay on track</strong>
              <small>One step at a time.</small>
            </span>
          </div>
          <div className="sidebar-user">
            <span className="user-avatar">{initials(user?.email)}</span>
            <span className="sidebar-user-info">
              <strong>{user?.email || "Your account"}</strong>
              <small>Personal workspace</small>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="icon-button logout-button"
              aria-label="Sign out"
              title="Sign out"
            >
              <Icon name="logout" size={18} />
            </button>
          </div>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-divider">/</span>
            <span className="breadcrumb-current">Applications</span>
          </div>
          <div className="topbar-right">
            <span className="topbar-date">
              {new Intl.DateTimeFormat(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              }).format(new Date())}
            </span>
            <span className="topbar-avatar">{initials(user?.email)}</span>
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
