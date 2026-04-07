import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!userId.trim()) return setError("Please enter your User ID");
    if (!password) return setError("Please enter your password");
    setLoading(true);
    const result = await login(userId.trim(), password);
    setLoading(false);
    if (!result.success) setError(result.error || "Login failed");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative items-center justify-center overflow-hidden">
        <div className="relative z-10 text-center px-12">
          <div className="w-24 h-24 mx-auto mb-8 bg-primary-foreground/10 rounded-3xl flex items-center justify-center">
            <GraduationCap className="w-12 h-12 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold text-primary-foreground mb-3">
            Campus Management System
          </h1>
          <p className="text-primary-foreground/70 text-lg max-w-md mx-auto">
            Smart attendance, face recognition, and complete campus ERP in one platform.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            {["Smart Attendance", "Face Recognition", "WhatsApp OTP"].map((f) => (
              <div key={f} className="bg-primary-foreground/10 rounded-xl p-3">
                <p className="text-primary-foreground/90 text-xs font-medium">{f}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">CampusERP</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="text-muted-foreground mt-1">Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                placeholder="Enter your User ID (e.g. ADMIN01)"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-8 p-4 rounded-xl bg-muted/60 border border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Default Credentials</p>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p><span className="font-medium text-foreground">Admin:</span> ADMIN01 / 11111111</p>
              <p><span className="font-medium text-foreground">Faculty:</span> FAC001 / 11111111</p>
              <p><span className="font-medium text-foreground">Student:</span> STU001 / 11111111</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
