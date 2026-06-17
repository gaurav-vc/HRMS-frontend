import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Role } from "./mock-data";
import { ROLES } from "./mock-data";

interface User { name: string; email: string; role: Role; avatar?: string; }
interface AuthCtx {
  user: User | null;
  login: (email: string, role?: Role) => void;
  logout: () => void;
  setRole: (r: Role) => void;
}

const Ctx = createContext<AuthCtx | null>(null);

const KEY = "hrms-auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = (u: User | null) => {
    setUser(u);
    try { if (u) localStorage.setItem(KEY, JSON.stringify(u)); else localStorage.removeItem(KEY); } catch {}
  };

  return (
    <Ctx.Provider value={{
      user,
      login: (email, role = "super_admin") => persist({
        name: email.split("@")[0].split(".").map(s => s[0]?.toUpperCase() + s.slice(1)).join(" ") || "Alex CEO",
        email, role,
      }),
      logout: () => persist(null),
      setRole: (r) => user && persist({ ...user, role: r }),
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be inside AuthProvider");
  return v;
}

export function roleLabel(r: Role) { return ROLES.find(x => x.value === r)?.label ?? r; }
