import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-config";
import { Users, UserCheck, CalendarCheck, Building2, Loader2 } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/dashboard/admin")
      .then((d: any) => setStats(d))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const weekData = stats?.week_attendance || [];
  const statCards = stats ? [
    { label: "Total Students", value: stats.stats.total_students, icon: Users, bg: "bg-blue-500" },
    { label: "Total Faculty", value: stats.stats.total_faculty, icon: UserCheck, bg: "bg-red-400" },
    { label: "Classes Today", value: stats.stats.classes_today, icon: CalendarCheck, bg: "bg-teal-500" },
    { label: "Departments", value: stats.stats.total_departments, icon: Building2, bg: "bg-purple-400" },
  ] : [];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Welcome back, {user?.name?.split(" ")[0]} 👋</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Here's what's happening today.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className={`${card.bg} rounded-2xl p-5 text-white relative overflow-hidden`}>
            <div className="absolute right-3 top-3 opacity-20">
              <div className="w-16 h-16 rounded-full border-4 border-white/30" />
            </div>
            <div className="relative z-10">
              <card.icon className="w-6 h-6 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{card.value}</p>
              <p className="text-sm opacity-90 mt-1">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly attendance trend */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4">Weekly Attendance Trend</h3>
          {weekData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={weekData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Line type="monotone" dataKey="present" stroke="hsl(142, 76%, 36%)" strokeWidth={2} name="Present" />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} name="Total" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
              No attendance data yet. Create classes and mark attendance.
            </div>
          )}
        </div>

        {/* Recent students */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4">Recently Added Students</h3>
          {stats?.recent_students?.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_students.map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {s.name[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.department} · {s.admission_no}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              No students added yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
