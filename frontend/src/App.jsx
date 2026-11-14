import { lazy, Suspense } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { ApplicationsProvider } from "./applications/ApplicationsContext";
import { useAuth } from "./auth/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";

const ApplicationDetailsPage = lazy(
  () => import("./pages/ApplicationDetailsPage"),
);
const EditApplicationPage = lazy(
  () => import("./pages/EditApplicationPage"),
);
const ApplicationsPage = lazy(() => import("./pages/ApplicationsPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const NewApplicationPage = lazy(() => import("./pages/NewApplicationPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));

function PublicRoute({ children }) {
  const { token } = useAuth();
  return token ? <Navigate to="/dashboard" replace /> : children;
}

function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="text-sm font-semibold text-blue-700">404</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          This page may have moved or no longer exists.
        </p>
        <Link className="button-primary mt-6 inline-flex" to="/dashboard">
          Return to ApplyTrack
        </Link>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center text-sm text-slate-500">
          Loading ApplyTrack…
        </main>
      }
    >
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <ApplicationsProvider>
                <DashboardLayout />
              </ApplicationsProvider>
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="applications" element={<ApplicationsPage />} />
          <Route path="applications/new" element={<NewApplicationPage />} />
          <Route
            path="applications/:applicationId"
            element={<ApplicationDetailsPage />}
          />
          <Route
            path="applications/:applicationId/edit"
            element={<EditApplicationPage />}
          />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
