import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-config";
import {
  CalendarCheck, BookOpen, ClipboardList, MessageSquare,
  Bell, TrendingUp, ChevronRight, ScanFace, Clock
} from "lucide-react";
import { Link } from "react-router-dom";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [timetable, setTimetable] = useState<any[]>([]);

  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const today = days[new Date().getDay()];

  useEffect(() => {
    apiFetch("/api/dashboard/student").then((d: any) => setStats(d)).catch(() => {});
    apiFetch("/api/timetable").then((d: any) => {
      const todaySlots = (d.timetable || []).filter((t: any) => t.day === today);
      setTimetable(todaySlots);
    }).catch(() => {});
  }, []);

  const attPct = stats?.attendance_pct || 0;
  const circumference = 2 * Math.PI * 42;

  const quickLinks = [
    { label: "Mark Attendance", icon: ScanFace, href: "/smart-attendance", color: "bg-primary/10 text-primary" },
    { label: "My Attendance", icon: CalendarCheck, href: "/attendance", color: "bg-green-100 text-green-700" },
    { label: "Timetable", icon: Clock, href: "/timetable", color: "bg-purple-100 text-purple-700" },
    { label: "Study Material", icon: BookOpen, href: "/study-material", color: "bg-amber-100 text-amber-600" },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Good morning, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {(user as any)?.section && <span className="font-medium text-primary">{(user as any).section}</span>}
          {(user as any)?.section && " · "}
          {(user as any)?.batch || ""} {user?.semester ? `· ${user.semester}` : ""}
        </p>
      </div>

      {/* Top row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile Card */}
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground text-xl font-bold">
              {user?.name?.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{user?.name}</h3>
              <p className="text-xs text-muted-foreground">{user?.user_id}</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            {[
              ["Section", (user as any)?.section || "—"],
              ["Batch", (user as any)?.batch || "—"],
              ["Semester", user?.semester || "—"],
              ["Department", (user as any)?.department || "—"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between border-b border-border pb-1.5 last:border-0">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Attendance Ring */}
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Attendance</h3>
            <TrendingUp className={`w-4 h-4 ${attPct >= 75 ? "text-green-500" : "text-red-500"}`} />
          </div>
          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none"
                  stroke={attPct >= 75 ? "hsl(var(--primary))" : "#ef4444"}
                  strokeWidth="8"
                  strokeDasharray={`${(attPct/100) * circumference} ${circumference}`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold">{attPct}%</span>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.present_classes || 0}</p>
                <p className="text-xs text-muted-foreground">Classes Present</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">{stats?.total_classes || 0}</p>
                <p className="text-xs text-muted-foreground">Total Classes</p>
              </div>
            </div>
          </div>
          {attPct < 75 && (
            <div className="mt-3 p-2 bg-red-50 rounded-lg text-xs text-red-700">
              ⚠️ Below 75% — attendance shortage
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickLinks.map(link => (
              <Link key={link.href} to={link.href}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl ${link.color} hover:opacity-90 transition-opacity`}>
                <link.icon className="w-5 h-5" />
                <span className="text-xs font-medium text-center">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Today's Timetable */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold">Today's Classes — {today}</h3>
          <Link to="/timetable" className="text-xs text-primary flex items-center gap-1 hover:underline">
            Full Timetable <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {timetable.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            {today === "Sunday" ? "No classes on Sunday 🎉" : "No classes scheduled today."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {timetable.map((t, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3">
                <div className="min-w-[90px]">
                  <span className="text-sm font-semibold text-primary">{t.slot_time}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{t.subject}
                    {t.subject_code && <span className="ml-2 text-xs text-muted-foreground">({t.subject_code})</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{t.faculty_name} · {t.room || "TBD"}</p>
                </div>
                {t.subject?.toLowerCase().includes('lab') && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">LAB</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subject-wise attendance */}
      {stats?.subject_wise?.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <h3 className="font-semibold mb-4">Subject-wise Attendance</h3>
          <div className="space-y-3">
            {stats.subject_wise.map((s: any, i: number) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{s.subject}</span>
                  <span className="text-muted-foreground">{s.present}/{s.total} ({s.pct}%)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${s.pct >= 75 ? "bg-green-500" : s.pct >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Smart Attendance CTA */}
      <Link to="/smart-attendance"
        className="block bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-5 text-white hover:opacity-95 transition-opacity">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">Mark Today's Attendance</h3>
            <p className="text-sm opacity-90 mt-1">Use face recognition + GPS to mark yourself present</p>
          </div>
          <ScanFace className="w-10 h-10 opacity-80" />
        </div>
      </Link>
    </div>
  );
}
