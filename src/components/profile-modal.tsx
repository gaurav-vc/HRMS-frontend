import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, roleLabel } from "@/lib/auth-context";
import { User, Lock, Loader2 } from "lucide-react";
import { authApi } from "@/api";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");

  // Profile tab state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Security tab state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setMessage(null);
    try {
      await authApi.updateProfile({ name: editName });
      setMessage({ type: "success", text: "Profile updated successfully." });
      setIsEditingProfile(false);
      // Wait for 1 second then reload to fetch the new name across the app
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setMessage({ type: "error", text: err?.response?.data?.error || "Failed to update profile." });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (!currentPassword || !newPassword) {
      setMessage({ type: "error", text: "Please fill in all fields." });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setMessage({ type: "success", text: "Password updated successfully. You will be asked to log in again after changing it." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setMessage({ type: "error", text: err?.response?.data?.error || "Failed to update password." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-slate-50 flex h-[600px] gap-0">
        
        {/* Sidebar */}
        <div className="w-64 bg-slate-50 border-r flex flex-col p-4">
          <h2 className="text-xl font-semibold mb-6 px-2">Settings</h2>
          <div className="space-y-1">
            <button
              onClick={() => {
                setActiveTab("profile");
                setMessage(null);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "profile"
                  ? "bg-blue-100/50 text-blue-600"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <User className="h-4 w-4" />
              Profile
            </button>
            <button
              onClick={() => {
                setActiveTab("security");
                setMessage(null);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "security"
                  ? "bg-blue-100/50 text-blue-600"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Lock className="h-4 w-4" />
              Security
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white p-8 overflow-y-auto">
          {activeTab === "profile" && (
            <div className="max-w-md">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-2xl font-semibold text-slate-900">Profile Details</h2>
                {!isEditingProfile ? (
                  <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(true)}>
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(false)} disabled={isSavingProfile}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveProfile} disabled={isSavingProfile}>
                      {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-500 mb-8">
                Your personal and organizational details.
              </p>

              {message && activeTab === "profile" && (
                <div className={`p-3 rounded-md text-sm mb-6 ${
                  message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {message.text}
                </div>
              )}

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">Full Name</Label>
                    {!isEditingProfile ? (
                      <div className="font-medium mt-1">{user?.name}</div>
                    ) : (
                      <Input 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="mt-1"
                        placeholder="John Doe"
                      />
                    )}
                  </div>
                  <div>
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">Email</Label>
                    <div className="font-medium mt-1">{user?.email}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">Role</Label>
                    <div className="font-medium mt-1">{user?.role_name || roleLabel(user?.role || "employee")}</div>
                  </div>
                  <div>
                    <Label className="text-slate-500 text-xs uppercase tracking-wider">Employee ID</Label>
                    <div className="font-medium mt-1">{user?.employee_id || "N/A"}</div>
                  </div>
                </div>

                {(user?.site_name || user?.org_name) && (
                  <>
                    <div className="h-px bg-slate-100 my-4" />
                    <div className="grid grid-cols-2 gap-4">
                      {user?.site_name && (
                        <div>
                          <Label className="text-slate-500 text-xs uppercase tracking-wider">Site Name</Label>
                          <div className="font-medium mt-1">{user.site_name}</div>
                        </div>
                      )}
                      {user?.org_name && (
                        <div>
                          <Label className="text-slate-500 text-xs uppercase tracking-wider">Organization</Label>
                          <div className="font-medium mt-1">{user.org_name}</div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="max-w-md">
              <h2 className="text-2xl font-semibold text-slate-900 mb-2">Change Password</h2>
              <p className="text-sm text-slate-500 mb-8">
                Update your password to keep your account secure. You will be asked to log in again after changing it.
              </p>

              {message && (
                <div className={`p-3 rounded-md text-sm mb-6 ${
                  message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-5">
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <Input 
                    type="password" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <Input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Change Password
                </Button>
              </form>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
