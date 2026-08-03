import { useContext } from "react";
import { Navigate } from "react-router-dom";
import AuthContext from "./AuthContext";

export default function ProtectedRoute({children}) {
  const { user,token, loading } = useContext(AuthContext);

  if (loading) {
    return <div>Loading...</div>;
  }

  if(!token || !user) {
    return <Navigate to="/login" />;
  }

  return children;

}