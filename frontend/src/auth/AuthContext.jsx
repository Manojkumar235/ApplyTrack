import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  authApi,
} from "../api/client";

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const storedUser = window.localStorage.getItem(AUTH_USER_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    window.localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() =>
    window.localStorage.getItem(AUTH_TOKEN_KEY),
  );
  const [user, setUser] = useState(readStoredUser);

  const saveSession = useCallback((response) => {
    const { access_token: accessToken, user: account } = response.data;
    if (!accessToken || !account) {
      throw new Error("The server returned an incomplete authentication response.");
    }
    window.localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(account));
    setToken(accessToken);
    setUser(account);
  }, []);

  const login = useCallback(
    async (credentials) => saveSession(await authApi.login(credentials)),
    [saveSession],
  );

  const register = useCallback(
    async (credentials) => saveSession(await authApi.register(credentials)),
    [saveSession],
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(AUTH_USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    window.addEventListener("applytrack:unauthorized", logout);
    return () => window.removeEventListener("applytrack:unauthorized", logout);
  }, [logout]);

  const value = useMemo(
    () => ({ token, user, login, register, logout }),
    [token, user, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}
