import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react";
import type { Role } from "./mock-data";
import { ROLES } from "./mock-data";
import { authApi } from "@/api";

interface User {
  id?: number | string;
  name: string;
  username: string;
  email: string;
  role: Role;
  avatar?: string;
  permissions?: any;
  role_name?: string;
  dashboard_type?: string;
  employee_id?: string | number;
  is_superuser?: boolean;
  site_name?: string;
  org_name?: string;
  branding_text?: string;
  logo_url?: string;
  site_modules?: string[];
  dynamic_role?: any;
  access_scope?: string;
  has_all_entity_access?: boolean;
  can_manage_users?: boolean;
}
interface AuthCtx {
  user: User | null;
  init: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  setRole: (r: Role) => void;
  refreshUser: () => Promise<void>;
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
        if (raw && mounted) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.role === "super_admin" || parsed.role_name === "Super Admin")) {
            parsed.is_superuser = true;
          }
          setUser(parsed);
        }

        // Background refresh of user data to ensure latest permissions
        const access =
          typeof localStorage !== "undefined" ? localStorage.getItem("access_token") : null;
        if (access) {
          try {
            const me = await authApi.getMe();
            if (mounted) {
              const isSuper = Boolean(me.is_superuser || me.isSuperuser || me.role === "super_admin" || me.role_name === "Super Admin");
              const updatedUser = {
                id: me.id,
                name:
                  `${me.firstName || me.first_name || ""} ${me.lastName || me.last_name || ""}`.trim() ||
                  me.email?.split("@")[0] ||
                  "User",
                username: me.username || "",
                email: me.email,
                role: (me.role as Role) || (isSuper ? "super_admin" : "employee"),
                permissions: me.permissions || {},
                role_name: me.roleName || me.role_name || (isSuper ? "Super Admin" : ""),
                employee_id: me.employeeId || me.employee_id,
                avatar: me.photoUrl || me.photo_url,
                site_name: me.siteName || me.site_name,
                org_name: me.orgName || me.org_name,
                branding_text: me.brandingText || me.branding_text,
                logo_url: me.logoUrl || me.logo_url,
                site_modules: me.siteModules || me.site_modules,
                access_scope: me.accessScope || me.access_scope || me.permissions?.access_scope,
                has_all_entity_access: Boolean(me.hasAllEntityAccess || me.has_all_entity_access || me.permissions?.has_all_entity_access),
                can_manage_users: Boolean(me.canManageUsers || me.can_manage_users || me.permissions?.can_manage_users),
                is_superuser: isSuper,
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
      } catch {
        /* ignore */
      }
      if (mounted) setInit(true);
    };

    initAuth();
    return () => {
      mounted = false;
    };
  }, []);

  const persist = (u: User | null, access?: string, refresh?: string) => {
    setUser(u);
    try {
      if (typeof localStorage !== "undefined") {
        if (u) {
          localStorage.setItem(KEY, JSON.stringify(u));
          if (access) localStorage.setItem("access_token", access);
          if (refresh) localStorage.setItem("refresh_token", refresh);
        } else {
          localStorage.removeItem(KEY);
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        }
      }
    } catch {
      /* ignore */
    }
  };

  const performLogin = async (email: string, password?: string) => {
    // In reality, role isn't selected by user anymore, it comes from API
    const res = await authApi.login({ username: email, password });
    if (res.access && res.refresh) {
      // Now fetch the user's profile
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("access_token", res.access);
        localStorage.setItem("refresh_token", res.refresh);
      }
      const me = await authApi.getMe();
      const isSuper = Boolean(me.is_superuser || me.isSuperuser || me.role === "super_admin" || me.role_name === "Super Admin");
      persist(
        {
          id: me.id,
          name: `${me.firstName || me.first_name || ""} ${me.lastName || me.last_name || ""}`.trim() || email.split("@")[0],
          username: me.username || email.split("@")[0],
          email: email,
          role: (me.role as Role) || (isSuper ? "super_admin" : "employee"),
          permissions: me.permissions || {},
          role_name: me.role_name || (isSuper ? "Super Admin" : ""),
          employee_id: me.employee_id || me.employeeId,
          avatar: me.photoUrl || me.photo_url,
          site_name: me.siteName || me.site_name,
          org_name: me.orgName || me.org_name,
          branding_text: me.brandingText || me.branding_text,
          logo_url: me.logoUrl || me.logo_url,
          site_modules: me.siteModules || me.site_modules,
          is_superuser: isSuper,
        },
        res.access,
        res.refresh,
      );
    }
  };

  const performLogout = async () => {
    try {
      const refresh =
        typeof localStorage !== "undefined" ? localStorage.getItem("refresh_token") : null;
      if (refresh) await authApi.logout(refresh);
    } catch (e) {
      /* ignore */
    }
    persist(null);
    if (typeof window !== "undefined") {
      window.location.href = "/auth";
    }
  };

  const refreshUser = async () => {
    try {
      const me = await authApi.getMe();
      if (me) {
        const isSuper = Boolean(me.is_superuser ?? user?.is_superuser ?? (me.role === "super_admin" || user?.role === "super_admin" || me.role_name === "Super Admin" || user?.role_name === "Super Admin"));
        const updatedUser: User = {
          id: me.id ?? user?.id,
          name:
            `${me.firstName || me.first_name || ""} ${me.lastName || me.last_name || ""}`.trim() ||
            user?.name ||
            me.email?.split("@")[0] ||
            "User",
          username: me.username || user?.username || "",
          email: me.email || user?.email || "",
          role: (me.role as Role) || user?.role || (isSuper ? "super_admin" : "employee"),
          permissions: me.permissions || {},
          role_name: me.roleName || me.role_name || (isSuper ? "Super Admin" : ""),
          employee_id: me.employeeId || me.employee_id || user?.employee_id,
          avatar: me.photoUrl || me.photo_url || user?.avatar,
          site_name: me.siteName || me.site_name || user?.site_name,
          org_name: me.orgName || me.org_name || user?.org_name,
          branding_text: me.brandingText || me.branding_text || user?.branding_text,
          logo_url: me.logoUrl || me.logo_url || user?.logo_url,
          is_superuser: isSuper,
        };
        persist(
          updatedUser,
          typeof localStorage !== "undefined"
            ? localStorage.getItem("access_token") || undefined
            : undefined,
          typeof localStorage !== "undefined"
            ? localStorage.getItem("refresh_token") || undefined
            : undefined,
        );
      }
    } catch (e) {
      /* ignore */
    }
  };

  const contextValue = useMemo(
    () => ({
      user,
      init,
      login: performLogin as any,
      logout: performLogout,
      setRole: (r: Role) => user && persist({ ...user, role: r }),
      refreshUser,
    }),
    [user, init],
  );

  return <Ctx.Provider value={contextValue}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be inside AuthProvider");
  return v;
}

export function roleLabel(r: Role) {
  return ROLES.find((x) => x.value === r)?.label ?? r;
}

export function usePermissions(moduleName: string) {
  const { user } = useAuth();

  const perms = user?.permissions?.[moduleName] || {
    view: false,
    create: false,
    update: false,
    delete: false,
  };
  return {
    canView: !!perms.view,
    canCreate: !!perms.create,
    canUpdate: !!perms.update,
    canDelete: !!perms.delete,
  };
}
