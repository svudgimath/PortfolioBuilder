import { createContext, useState, useEffect } from 'react';
import { signup, login } from '../api/auth';

const AuthContext = createContext(null);

export default AuthContext;

function parseToken(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

function getUserIdFromToken(token) {
  return token ? parseToken(token)?.sub ?? null : null;
}

function isTokenExpired(token) {
  const payload = parseToken(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 < Date.now();
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  // Persist a fresh auth payload (from login/signup, or stored) to state + localStorage.
  function applySession(data) {
    const accessToken = data.accessToken || data.token || null;
    const refresh     = data.refreshToken || null;
    setToken(accessToken);
    setRefreshToken(refresh);
    setUser({ name: data.name, email: data.email });
    setUserId(getUserIdFromToken(accessToken));
    if (accessToken) localStorage.setItem("token", accessToken);
    if (refresh)     localStorage.setItem("refreshToken", refresh);
    localStorage.setItem("user", JSON.stringify({ name: data.name, email: data.email }));
  }

  // On app load, restore an existing session from localStorage.
  useEffect(() => {
    const storedToken   = localStorage.getItem("token");
    const storedRefresh = localStorage.getItem("refreshToken");
    const storedUser    = localStorage.getItem("user");

    // Keep the session if the access token is still valid, OR if it's expired
    // but a refresh token exists (the client will refresh on the next call).
    if (storedUser && (storedRefresh || (storedToken && !isTokenExpired(storedToken)))) {
      setToken(storedToken);
      setRefreshToken(storedRefresh);
      setUser(JSON.parse(storedUser));
      setUserId(getUserIdFromToken(storedToken));
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    }

    setLoading(false);
  }, []);

  async function signupUser(name, email, password) {
    const data = await signup(name, email, password);
    applySession(data);
  }

  async function loginUser(email, password) {
    const data = await login(email, password);
    applySession(data);
  }

  function logoutUser() {
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    setUserId(null);
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  }

  return (
    <AuthContext value={{ user, token, refreshToken, userId, loading, signupUser, loginUser, logoutUser }}>
      {children}
    </AuthContext>
  );
}

export { AuthProvider };
