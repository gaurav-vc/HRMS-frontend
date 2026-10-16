import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { isSuperAdminUser } from "@/lib/mock-data";

export const Route = createFileRoute("/superadmin-dashboard")({
  component: SuperAdminDashboard,
});

function SuperAdminDashboard() {
  const { user, init } = useAuth();
  const isSuperAdmin = isSuperAdminUser(user);

  if (!init) return null; // Wait for auth to initialize

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to="/organizations" replace />;
}
