import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-config";
import { Loader2, Link } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [summary, setSummary] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/attendance/student/my")
      .then((d: any) => { setAttendance(d.attendance || []); setSummary(d.summary || {}); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const overallPct = Object.values(summary).reduce((acc: number, s: any) => acc + (s.pct || 0), 0) /
    Math.max(Object.keys(summary).length, 1);

  if (loading) return <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">My Attendance</h1>
        <RouterLink to="/smart-attendance"
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          Mark Attendance
        </RouterLink>
      </div>

      {/* Overall */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Overall Attendance</h3>
          <span className={`text-2xl font-bold ${overallPct >= 75 ? "text-success" : "text-destructive"}`}>
            {Math.round(overallPct)}%
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-3">
          <div className={`h-3 rounded-full transition-all ${overallPct >= 75 ? "bg-success" : "bg-destructive"}`}
            style={{ width: `${Math.min(overallPct, 100)}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {overallPct >= 75 ? "Good standing" : "⚠️ Below 75% — attendance shortage"}
        </p>
      </div>

      {/* Subject wise */}
      {Object.entries(summary).length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-semibold mb-4">Subject-wise Summary</h3>
          <div className="space-y-3">
            {Object.entries(summary).map(([subject, s]: [string, any]) => (
              <div key={subject} className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{subject}</span>
                    <span className="text-sm text-muted-foreground">{s.present}/{s.total}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className={`h-2 rounded-full ${s.pct >= 75 ? "bg-success" : s.pct >= 60 ? "bg-amber-500" : "bg-destructive"}`}
                      style={{ width: `${s.pct || 0}%` }} />
                  </div>
                </div>
                <span className={`text-sm font-semibold min-w-[40px] text-right ${s.pct >= 75 ? "text-success" : "text-destructive"}`}>
                  {s.pct || 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent records */}
      {attendance.length > 0 ? (
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-semibold mb-4">Recent Classes</h3>
          <div className="space-y-2">
            {attendance.slice(0, 15).map((a, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{a.subject}</p>
                  <p className="text-xs text-muted-foreground">{a.class_date} · {a.batch}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  a.status === "present" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <p className="text-muted-foreground">No attendance records yet.</p>
          <RouterLink to="/smart-attendance" className="text-primary text-sm mt-2 block hover:underline">
            Mark your first attendance →
          </RouterLink>
        </div>
      )}
    </div>
  );
}
