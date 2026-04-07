import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-config";
import { Loader2, CheckCircle2, XCircle, Link } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function FacultyAttendancePage() {
  const { toast } = useToast();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch("/api/classes").then((d: any) => {
      setClasses(d.classes || []);
      if (d.classes?.length > 0) loadClass(d.classes[0]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const loadClass = async (cls: any) => {
    setSelectedClass(cls);
    try {
      const data: any = await apiFetch(`/api/classes/${cls.id}`);
      setStudents(data.students || []);
      const initAtt: Record<number, string> = {};
      data.students?.forEach((s: any) => { initAtt[s.id] = "present"; });
      setAttendance(initAtt);
      // Load existing attendance
      const att: any = await apiFetch(`/api/attendance/class/${cls.id}`);
      if (att.attendance?.length > 0) {
        att.attendance.forEach((a: any) => { initAtt[a.student_id] = a.status; });
        setAttendance({ ...initAtt });
      }
    } catch {}
  };

  const toggleAll = (status: string) => {
    const next: Record<number, string> = {};
    students.forEach(s => { next[s.id] = status; });
    setAttendance(next);
  };

  const saveManual = async () => {
    if (!selectedClass) return;
    setSaving(true);
    try {
      const records = Object.entries(attendance).map(([student_id, status]) => ({
        student_id: parseInt(student_id), status
      }));
      await apiFetch("/api/attendance/manual", {
        method: "POST",
        body: JSON.stringify({ class_id: selectedClass.id, records }),
      });
      toast({ title: "Attendance saved ✓" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Attendance</h1>
        <RouterLink to="/smart-attendance"
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
          Smart Attendance (AI)
        </RouterLink>
      </div>

      {/* Class selector */}
      <div className="bg-card rounded-xl border border-border p-4">
        <label className="text-sm font-medium text-muted-foreground">Select Class</label>
        <select className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none"
          onChange={e => { const c = classes.find(c => c.id === parseInt(e.target.value)); if (c) loadClass(c); }}>
          {classes.map(c => <option key={c.id} value={c.id}>{c.subject} — {c.class_date} {c.start_time}</option>)}
        </select>
      </div>

      {selectedClass && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{selectedClass.subject}</h3>
              <p className="text-sm text-muted-foreground">{selectedClass.class_date} · {students.length} students</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleAll("present")} className="px-3 py-1.5 rounded-lg bg-success/10 text-success text-xs font-medium">All Present</button>
              <button onClick={() => toggleAll("absent")} className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium">All Absent</button>
            </div>
          </div>
          {students.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No students enrolled in this class.</div>
          ) : (
            <div className="divide-y divide-border">
              {students.map(s => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {s.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.roll_no || s.user_id}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {["present", "absent", "late"].map(status => (
                      <button key={status} onClick={() => setAttendance(p => ({ ...p, [s.id]: status }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                          attendance[s.id] === status
                            ? status === "present" ? "bg-success text-success-foreground"
                              : status === "absent" ? "bg-destructive text-destructive-foreground"
                              : "bg-amber-500 text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="p-4 border-t border-border">
            <button onClick={saveManual} disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50">
              {saving ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Saving...</span> : "Save Attendance"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
