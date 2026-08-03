import AuthContext from "../../auth/AuthContext";
import { useContext } from "react";

export default function TopBar() {
  const { user } = useContext(AuthContext);
  return (
    <header className="h-16 border-b border-bg-border bg-bg-shell/70 backdrop-blur-2xl shadow-black/20 shadow-lg px-6 flex items-center justify-end">
      <span className="text-text-dim font-medium">{user.name}</span>
    </header>
  )
}
