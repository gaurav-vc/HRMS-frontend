import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Lock, Mail, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { ROLES, type Role } from "@/lib/mock-data";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in — PeoplePulse" }] }),
});

function AuthPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [viewMode, setViewMode] = useState<"login" | "forgot_email" | "forgot_otp" | "forgot_reset">("login");
  const [resetEmail, setResetEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      if (typeof window !== "undefined" && !localStorage.getItem("access_token")) {
        // Prevent redirect loop if access_token was wiped but hrms-auth remained
        localStorage.removeItem("hrms-auth");
        window.location.reload();
        return;
      }
      if (user.role === "super_admin" || user.role_name === "Super Admin") {
        navigate({ to: "/superadmin-dashboard" });
      } else {
        navigate({ to: "/" });
      }
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      alert(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return alert("Please enter your email");
    setLoading(true);
    try {
      const { authApi } = await import("@/api");
      await authApi.requestPasswordReset(resetEmail);
      setViewMode("forgot_otp");
    } catch (err: any) {
      alert(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return alert("Please enter the OTP");
    setLoading(true);
    try {
      const { authApi } = await import("@/api");
      await authApi.verifyOTP(resetEmail, otp);
      setViewMode("forgot_reset");
    } catch (err: any) {
      alert(err.message || "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return alert("Please enter a new password");
    setLoading(true);
    try {
      const { authApi } = await import("@/api");
      const res = await authApi.confirmPasswordReset({ email: resetEmail, otp, password: newPassword });
      if (res.access && res.refresh) {
        localStorage.setItem("access_token", res.access);
        localStorage.setItem("refresh_token", res.refresh);
        window.location.reload();
      } else {
        alert("Password reset successfully. Please login.");
        setViewMode("login");
      }
    } catch (err: any) {
      alert(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 10%, oklch(0.7 0.18 262) 0, transparent 40%), radial-gradient(circle at 80% 80%, oklch(0.65 0.15 195) 0, transparent 35%)",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-md bg-sidebar-primary grid place-items-center text-sidebar-primary-foreground font-bold">
              P
            </div>
            <span className="text-lg font-semibold">PeoplePulse</span>
          </div>
        </div>
        <div className="relative space-y-6">
          <h1 className="text-4xl font-semibold leading-tight">
            The HRMS your
            <br />
            CEO actually opens.
          </h1>
          <p className="text-sidebar-foreground/70 max-w-md">
            Multi-entity payroll, attendance with QR + face + GPS, compliance, and a one-click run —
            all in one elegant workspace.
          </p>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            {[
              ["3", "Entities"],
              ["12K+", "Employees"],
              ["1-click", "Payroll"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-lg bg-sidebar-accent p-3">
                <div className="text-xl font-semibold">{v}</div>
                <div className="text-xs text-sidebar-foreground/60">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-xs text-sidebar-foreground/50">
          © 2026 PeoplePulse — Prototype
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 shadow-[var(--shadow-elegant)]">
          {viewMode === "login" && (
            <>
              <div className="flex items-center gap-2 mb-1 text-primary text-xs uppercase tracking-widest">
                <Sparkles className="h-3 w-3" /> Welcome back
              </div>
              <h2 className="text-2xl font-semibold">Sign in to PeoplePulse</h2>
              <p className="text-sm text-muted-foreground mt-1">Enter your credentials to continue.</p>

              <form className="mt-6 space-y-4" onSubmit={handleLogin}>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Work email / Username</Label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      className="pl-8"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pw">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="pw"
                      type="password"
                      className="pl-8"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="flex justify-end pt-0.5">
                    <button
                      type="button"
                      onClick={() => setViewMode("forgot_email")}
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </>
          )}

          {viewMode === "forgot_email" && (
            <>
              <h2 className="text-2xl font-semibold">Reset Password</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your registered work email to receive an OTP.
              </p>

              <form className="mt-6 space-y-4" onSubmit={handleSendOTP}>
                <div className="space-y-1.5">
                  <Label htmlFor="resetEmail">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="resetEmail"
                      type="email"
                      className="pl-8"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="w-full" onClick={() => setViewMode("login")} disabled={loading}>
                    Back to Login
                  </Button>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Sending..." : "Send OTP"}
                  </Button>
                </div>
              </form>
            </>
          )}

          {viewMode === "forgot_otp" && (
            <>
              <h2 className="text-2xl font-semibold">Verify OTP</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Enter the 6-digit code sent to {resetEmail}. Valid for 10 minutes.
              </p>

              <form className="mt-6 space-y-4" onSubmit={handleVerifyOTP}>
                <div className="space-y-1.5">
                  <Label htmlFor="otp">Enter OTP</Label>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="otp"
                      type="text"
                      maxLength={6}
                      className="pl-8 text-center tracking-widest text-lg"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="w-full" onClick={() => setViewMode("forgot_email")} disabled={loading}>
                    Resend
                  </Button>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Verifying..." : "Verify"}
                  </Button>
                </div>
              </form>
            </>
          )}

          {viewMode === "forgot_reset" && (
            <>
              <h2 className="text-2xl font-semibold">Create New Password</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Enter a strong password to secure your account.
              </p>

              <form className="mt-6 space-y-4" onSubmit={handleResetPassword}>
                <div className="space-y-1.5">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type="password"
                      className="pl-8"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Saving..." : "Save & Login"}
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

