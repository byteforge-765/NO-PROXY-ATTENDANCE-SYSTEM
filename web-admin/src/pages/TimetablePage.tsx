import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-config";
import { Loader2, BookOpen } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const TIME_COLORS: Record<string,string> = {
  "BCS-401":"bg-blue-100 text-blue-800","BCS-402":"bg-green-100 text-green-800",
  "BCS-403":"bg-purple-100 text-purple-800","BCS-451":"bg-orange-100 text-orange-800",
  "BCS-452":"bg-pink-100 text-pink-800","BCS-453":"bg-yellow-100 text-yellow-800",
};

export default function TimetablePage() {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSection, setFilterSection] = useState("");
  const [filterFaculty, setFilterFaculty] = useState("");
  const [departments, setDepartments] = useState<any[]>([]);
  const [filterDept, setFilterDept] = useState("");

  const isAdmin = user?.role === 'admin';
  const isFaculty = user?.role === 'faculty';
  const isStudent = user?.role === 'student';

  useEffect(() => {
    if (isAdmin) {
      apiFetch("/api/departments").then((d:any) => setDepartments(d.departments || [])).catch(()=>{});
    }
    loadTimetable();
  }, []);

  const loadTimetable = async (section="", dept="") => {
    setLoading(true);
    const params = new URLSearchParams();
    if (section) params.set("section", section);
    if (dept) params.set("department_id", dept);
    try {
      const data:any = await apiFetch(`/api/timetable${params.toString() ? "?"+params.toString() : ""}`);
      setTimetable(data.timetable || []);
    } catch { setTimetable([]); }
    setLoading(false);
  };

  const handleFilter = () => loadTimetable(filterSection, filterDept);

  const byDay = DAYS.reduce((acc: Record<string,any[]>, day) => {
    acc[day] = timetable.filter(t => t.day === day).sort((a,b) => a.slot_time.localeCompare(b.slot_time));
    return acc;
  }, {});

  const sectionLabel = isStudent ? (user as any)?.section : filterSection;

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Timetable</h1>
          {sectionLabel && <p className="text-sm text-muted-foreground mt-0.5">Section: <span className="font-medium text-primary">{sectionLabel}</span></p>}
        </div>
      </div>

      {/* Admin/Faculty filters */}
      {(isAdmin || isFaculty) && (
        <div className="flex flex-wrap gap-3 bg-card p-4 rounded-xl border border-border">
          <input
            value={filterSection}
            onChange={e => setFilterSection(e.target.value)}
            placeholder="Section (e.g. IT-1)"
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm w-40 focus:ring-2 focus:ring-ring focus:outline-none"
          />
          {isAdmin && (
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none">
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
          <button onClick={handleFilter}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
            Filter
          </button>
          <button onClick={() => { setFilterSection(""); setFilterDept(""); loadTimetable(); }}
            className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm">
            Clear
          </button>
        </div>
      )}

      {timetable.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No timetable entries found.</p>
          {isStudent && <p className="text-xs text-muted-foreground mt-2">Your section timetable will appear here.</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {DAYS.map(day => byDay[day].length > 0 && (
            <div key={day} className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <h3 className="font-semibold text-sm">{day}</h3>
                <span className="text-xs text-muted-foreground ml-auto">{byDay[day].length} period(s)</span>
              </div>
              <div className="divide-y divide-border">
                {byDay[day].map((t, i) => {
                  const colorClass = TIME_COLORS[t.subject_code] || "bg-gray-100 text-gray-700";
                  const isLab = t.subject?.toLowerCase().includes('lab');
                  return (
                    <div key={i} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/20 transition-colors">
                      <div className="min-w-[100px]">
                        <span className="text-sm font-semibold text-primary">{t.slot_time}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{t.subject}</p>
                          {t.subject_code && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorClass}`}>
                              {t.subject_code}
                            </span>
                          )}
                          {isLab && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">LAB</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t.faculty_name && <span>{t.faculty_name} · </span>}
                          <span>{t.room || "Room TBD"}</span>
                          {t.section && <span> · {t.section}</span>}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
