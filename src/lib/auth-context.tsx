import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react";
import type { Role } from "./mock-data";
import { ROLES } from "./mock-data";
import { authApi } from "@/api";

interface User { 
  name: string; 
  username: string;
  email: string; 
  role: Role; 
  avatar?: string;
  permissions?: any; 
  role_name?: string;
  employee_id?: string | number;
  is_superuser?: boolean;
}
interface AuthCtx {
  user: User | null;
  init: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  setRole: (r: Role) => void;
}

const Ctx = createContext<AuthCtx | null>(null);

const KEY = "hrms-auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [init, setInit] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      try {
        const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
        if (raw && mounted) setUser(JSON.parse(raw));
        
        // Background refresh of user data to ensure latest permissions
        const access = typeof localStorage !== "undefined" ? localStorage.getItem('access_token') : null;
        if (access) {
          try {
            const me = await authApi.getMe();
            if (mounted) {
              const updatedUser = {
                name: `${me.firstName || ''} ${me.lastName || ''}`.trim() || me.email?.split("@")[0] || "User",
                username: me.username || '',
                email: me.email,
                role: me.role as Role || 'employee',
                permissions: me.permissions || {},
                role_name: me.roleName || me.role_name || '',
                employee_id: me.employeeId || me.employee_id,
              };
              setUser(updatedUser);
              if (typeof localStorage !== "undefined") {
                localStorage.setItem(KEY, JSON.stringify(updatedUser));
              }
            }
          } catch (e) {
            // Token might be expired, but we let axios interceptor or logout logic handle it later
          }
        }
      } catch {}
      if (mounted) setInit(true);
    };

    initAuth();
    return () => { mounted = false; };
  }, []);

  const persist = (u: User | null, access?: string, refresh?: string) => {
    setUser(u);
    try {
        if (typeof localStorage !== "undefined") {
            if (u) {
                localStorage.setItem(KEY, JSON.stringify(u)); 
                if (access) localStorage.setItem('access_token', access);
                if (refresh) localStorage.setItem('refresh_token', refresh);
            } else { 
                localStorage.removeItem(KEY); 
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
            }
        }
    } catch {}
  };

  const performLogin = async (email: string, password?: string) => {
      // In reality, role isn't selected by user anymore, it comes from API
      try {
          const res = await authApi.login({ username: email, password });
          if (res.access && res.refresh) {
              // Now fetch the user's profile
              if (typeof localStorage !== "undefined") {
                  localStorage.setItem('access_token', res.access);
                  localStorage.setItem('refresh_token', res.refresh);
              }
              const me = await authApi.getMe();
              persist({
                  name: `${me.firstName || ''} ${me.lastName || ''}`.trim() || email.split("@")[0],
                  username: me.username || email.split("@")[0],
                  email: email,
                  role: (me.role as Role) || "employee",
                  permissions: me.permissions || {},
                  role_name: me.role_name || '',
                  employee_id: me.employee_id || me.employeeId,
              }, res.access, res.refresh);
          }
      } catch (e: any) {
          throw e;
      }
  };

  const performLogout = async () => {
      try {
          const refresh = typeof localStorage !== "undefined" ? localStorage.getItem('refresh_token') : null;
          if (refresh) await authApi.logout(refresh);
      } catch (e) {}
      persist(null);
  };

  const contextValue = useMemo(() => ({
    user,
    init,
    login: performLogin as any,
    logout: performLogout,
    setRole: (r: Role) => user && persist({ ...user, role: r }),
  }), [user, init]);

  return (
    <Ctx.Provider value={contextValue}>
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
