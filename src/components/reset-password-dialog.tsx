import { useState } from "react";
import { KeyRound, Mail, Eye, EyeOff, ShieldCheck, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { employeesApi } from "@/api";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: any;
  onSuccess?: () => void;
}

export function ResetPasswordDialog({ open, onOpenChange, employee, onSuccess }: Props) {
  const [mode, setMode] = useState<"auto" | "custom">("auto");
  const [customPassword, setCustomPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ password?: string; emailSent?: boolean; recipient?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!employee) return null;

  const empName = `${employee.firstName || employee.first_name || ""} ${employee.lastName || employee.last_name || ""}`.trim() || employee.code;
  const empEmail = employee.email || "No email address found";

  const handleSubmit = async () => {
    if (mode === "custom" && !customPassword.trim()) {
      toast.error("Please enter a custom password.");
      return;
    }
    if (mode === "custom" && customPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      const res = await employeesApi.resetCredentials(employee.id, {
        password_mode: mode,
        passwordMode: mode,
        custom_password: customPassword.trim(),
        customPassword: customPassword.trim(),
        send_email: sendEmail,
        sendEmail: sendEmail,
      });

      const isEmailSent = Boolean(res.emailSent ?? res.email_sent);
      const returnedPassword = res.generatedPassword || res.generated_password || (mode === "custom" ? customPassword : undefined);
      const recipient = res.recipient || employee.email;

      setResult({
        password: returnedPassword,
        emailSent: isEmailSent,
        recipient: recipient,
      });

      toast.success(res.message || "Password updated successfully!");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setCustomPassword("");
    setMode("auto");
    setCopied(false);
    onOpenChange(false);
  };

  const copyPassword = () => {
    if (result?.password) {
      navigator.clipboard.writeText(result.password);
      setCopied(true);
      toast.success("Password copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="w-5 h-5 text-primary" />
            Manage Login Credentials
          </DialogTitle>
          <DialogDescription>
            Change login password and dispatch email credentials for <span className="font-semibold text-foreground">{empName}</span> ({employee.code}).
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-3">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <ShieldCheck className="w-5 h-5" />
                Password Successfully Updated
              </div>
              {result.emailSent ? (
                <p className="text-xs">
                  Login details have been dispatched to <strong>{result.recipient || empEmail}</strong>.
                </p>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Password updated, but email could not be sent (or employee has no email).
                </p>
              )}
            </div>

            {result.password && (
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <span className="text-xs text-muted-foreground">Assigned Password:</span>
                <div className="flex items-center justify-between font-mono text-sm font-semibold bg-background p-2 rounded border">
                  <span>{result.password}</span>
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={copyPassword}>
                    {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Password Option</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("auto")}
                  className={`p-3 rounded-lg border text-xs font-medium text-left transition-all ${
                    mode === "auto"
                      ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="font-semibold">Auto-Generate</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Secure random 12-char password</div>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("custom")}
                  className={`p-3 rounded-lg border text-xs font-medium text-left transition-all ${
                    mode === "custom"
                      ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="font-semibold">Set Custom</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Enter a specific password</div>
                </button>
              </div>
            </div>

            {mode === "custom" && (
              <div className="space-y-1.5">
                <Label htmlFor="custom-pass">New Password</Label>
                <div className="relative">
                  <Input
                    id="custom-pass"
                    type={showPassword ? "text" : "password"}
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="Enter custom password (min 6 chars)"
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                <span className="text-xs font-medium">Send login credentials via email</span>
              </label>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-6">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{empEmail}</span>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="ghost" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
