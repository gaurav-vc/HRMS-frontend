import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Lock, Mail, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  useEffect(() => { 
    if (user) {
      if (user.role === "super_admin" || user.role_name === "Super Admin") {
        navigate({ to: "/superadmin-dashboard" });
      } else {
        navigate({ to: "/" });
      }
    } 
  }, [user, navigate]);

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 10%, oklch(0.7 0.18 262) 0, transparent 40%), radial-gradient(circle at 80% 80%, oklch(0.65 0.15 195) 0, transparent 35%)" }} />
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-md bg-sidebar-primary grid place-items-center text-sidebar-primary-foreground font-bold">P</div>
            <span className="text-lg font-semibold">PeoplePulse</span>
          </div>
        </div>
        <div className="relative space-y-6">
          <h1 className="text-4xl font-semibold leading-tight">The HRMS your<br/>CEO actually opens.</h1>
          <p className="text-sidebar-foreground/70 max-w-md">Multi-entity payroll, attendance with QR + face + GPS, compliance, and a one-click run — all in one elegant workspace.</p>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            {[["3","Entities"],["12K+","Employees"],["1-click","Payroll"]].map(([v,l]) => (
              <div key={l} className="rounded-lg bg-sidebar-accent p-3"><div className="text-xl font-semibold">{v}</div><div className="text-xs text-sidebar-foreground/60">{l}</div></div>
            ))}
          </div>
        </div>
        <div className="relative text-xs text-sidebar-foreground/50">© 2026 PeoplePulse — Prototype</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 shadow-[var(--shadow-elegant)]">
          <div className="flex items-center gap-2 mb-1 text-primary text-xs uppercase tracking-widest"><Sparkles className="h-3 w-3" /> Welcome back</div>
          <h2 className="text-2xl font-semibold">Sign in to PeoplePulse</h2>
          <p className="text-sm text-muted-foreground mt-1">Enter your credentials to continue.</p>

          <form className="mt-6 space-y-4" onSubmit={async (e) => { 
              e.preventDefault(); 
              try {
                  await login(email, password); 
                  // Navigation is handled by the useEffect above automatically based on the user's role
              } catch (err: any) {
                  alert(err.message || 'Invalid credentials');
              }
          }}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email / Username</Label>
              <div className="relative"><Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input id="email" className="pl-8" value={email} onChange={e => setEmail(e.target.value)} /></div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw">Password</Label>
              <div className="relative"><Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input id="pw" type="password" className="pl-8" value={password} onChange={e => setPassword(e.target.value)} /></div>
            </div>
            <Button type="submit" className="w-full">Sign in</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
