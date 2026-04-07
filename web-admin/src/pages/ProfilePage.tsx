import { useEffect, useState } from "react";
import { apiFetch, API_BASE } from "@/lib/api-config";
import { useAuth } from "@/lib/auth-context";
import { Loader2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    apiFetch("/api/auth/me")
      .then((d: any) => setProfile(d.user))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const changePassword = async () => {
    if (!oldPw || !newPw || newPw.length < 6)
      return toast({ title: "New password must be at least 6 characters", variant: "destructive" });
    setChanging(true);
    try {
      await apiFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ old_password: oldPw, new_password: newPw }),
      });
      toast({ title: "Password changed ✓" });
      setOldPw(""); setNewPw("");
    } catch (err: any) { toast({ title: "Failed", description: err.message, variant: "destructive" }); }
    setChanging(false);
  };

  if (loading) return <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const p = profile || user;

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-xl font-bold text-foreground">My Profile</h1>

      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center gap-5 mb-6">
          {p?.photo_url ? (
            <img src={`${API_BASE}${p.photo_url}`} alt={p.name}
              className="w-20 h-20 rounded-2xl object-cover border border-border" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="text-3xl font-bold text-primary">{p?.name?.[0]}</span>
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-foreground">{p?.name}</h2>
            <p className="text-sm text-muted-foreground capitalize">{p?.role} · {p?.department || "ICMS"}</p>
            <span className="mt-1 inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
              {p?.user_id}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Email", value: p?.email },
            { label: "Phone", value: p?.phone || p?.mobile },
            { label: "WhatsApp", value: p?.whatsapp_phone },
            { label: "Department", value: p?.department },
            ...(p?.batch ? [{ label: "Batch", value: p.batch }] : []),
            ...(p?.semester ? [{ label: "Semester", value: p.semester }] : []),
            ...(p?.admission_no ? [{ label: "Admission No.", value: p.admission_no }] : []),
          ].map((item, i) => item.value ? (
            <div key={i}>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-sm font-medium mt-0.5">{item.value}</p>
            </div>
          ) : null)}
        </div>
      </div>

      {/* Change password */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="font-semibold mb-4">Change Password</h3>
        <div className="space-y-3">
          <input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)}
            placeholder="Current password"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
          <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
            placeholder="New password (min 6 chars)"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
          <button onClick={changePassword} disabled={changing}
            className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
            {changing ? "Changing..." : "Update Password"}
          </button>
        </div>
      </div>

      <button onClick={logout}
        className="w-full py-3 rounded-xl border border-destructive/50 text-destructive text-sm font-medium hover:bg-destructive/5">
        Sign Out
      </button>
    </div>
  );
}
