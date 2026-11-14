import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { applicationsApi, getApiErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";

const ApplicationsContext = createContext(null);

export function ApplicationsProvider({ children }) {
  const { token } = useAuth();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!token) {
      setApplications([]);
      setIsLoading(false);
      setError("");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const { data } = await applicationsApi.list();
      setApplications(data.applications);
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Could not load your applications."),
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    setApplications([]);
    refresh();
  }, [refresh]);

  const createApplication = useCallback(async (payload) => {
    const { data } = await applicationsApi.create(payload);
    setApplications((current) => [data.application, ...current]);
    return data.application;
  }, []);

  const updateApplication = useCallback(async (applicationId, payload) => {
    const { data } = await applicationsApi.update(applicationId, payload);
    setApplications((current) => {
      const exists = current.some((item) => item.id === data.application.id);
      return exists
        ? current.map((item) =>
            item.id === data.application.id ? data.application : item,
          )
        : [data.application, ...current];
    });
    return data.application;
  }, []);

  const deleteApplication = useCallback(async (applicationId) => {
    await applicationsApi.delete(applicationId);
    setApplications((current) =>
      current.filter((item) => item.id !== applicationId),
    );
  }, []);

  const value = useMemo(
    () => ({
      applications,
      isLoading,
      error,
      refresh,
      createApplication,
      updateApplication,
      deleteApplication,
    }),
    [
      applications,
      isLoading,
      error,
      refresh,
      createApplication,
      updateApplication,
      deleteApplication,
    ],
  );

  return (
    <ApplicationsContext.Provider value={value}>
      {children}
    </ApplicationsContext.Provider>
  );
}

export function useApplications() {
  const context = useContext(ApplicationsContext);
  if (!context) {
    throw new Error(
      "useApplications must be used within an ApplicationsProvider.",
    );
  }
  return context;
}
