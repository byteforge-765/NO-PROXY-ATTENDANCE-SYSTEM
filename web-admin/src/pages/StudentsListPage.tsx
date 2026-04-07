import { useState, useEffect } from "react";
import { apiFetch, API_BASE } from "@/lib/api-config";
import { Search, Loader2, RefreshCw, Plus, Eye, Camera } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

export default function StudentsListPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("");
  const [section, setSection] = useState("");
  const [departments, setDepartments] = useState<any[]>([]);

  const isAdmin = user?.role === "admin";
  const isFaculty = user?.role === "faculty";

  useEffect(() => {
    apiFetch("/api/departments").then((d: any) => setDepartments(d.departments || [])).catch(() => {});
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (dept) params.department_id = dept;
      if (section) params.section = section;
      const q = new URLSearchParams(params).toString();
      const data: any = await apiFetch(`/api/students${q ? `?${q}` : ""}`);
      setStudents(data.students || []);
    } catch { setStudents([]); }
    setLoading(false);
  };

  const enrollFace = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiFetch(`/api/students/${id}/enroll-face`, { method: "POST" });
      toast({ title: "Face enrolled ✓" });
      loadStudents();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const faceStatusColor = (s: any) => {
    if (s.face_photo_count >= 5) return "bg-green-100 text-green-700";
    if (s.face_photo_count > 0) return "bg-yellow-100 text-yellow-700";
    return "bg-red-50 text-red-600";
  };

  const faceStatusText = (s: any) => {
    if (s.face_photo_count >= 5) return `✓ ${s.face_photo_count}/5`;
    if (s.face_photo_count > 0) return `${s.face_photo_count}/5`;
    return "No photos";
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-foreground">Students</h1>
        <div className="flex gap-2">
          <button onClick={loadStudents} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          {(isAdmin || isFaculty) && (
            <Link to="/admission/add-student"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
              <Plus className="w-4 h-4" /> Add Student
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-card p-4 rounded-xl border border-border">
        <select value={dept} onChange={e => setDept(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none">
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <input value={section} onChange={e => setSection(e.target.value)}
          placeholder="Section (e.g. IT-1)"
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm w-36 focus:ring-2 focus:ring-ring focus:outline-none" />
        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && loadStudents()}
            placeholder="Search name, ID, admission no..."
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
        </div>
        <button onClick={loadStudents}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Search</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : students.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground">No students found.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground w-10"></th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground">Name</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground">User ID</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground">Section</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground">Batch</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground">Department</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground">Mobile</th>
                  <th className="text-center px-3 py-3 font-semibold text-muted-foreground">Face Photos</th>
                  <th className="text-center px-3 py-3 font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map(s => (
                  <tr key={s.id}
                    className="hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admission/student-profile/${s.id}`)}>
                    <td className="px-3 py-3">
                      {s.photo_url ? (
                        <img src={`${API_BASE}${s.photo_url}`} alt={s.name}
                          className="w-9 h-9 rounded-full object-cover border border-border" />
                      ) : (
                        <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">
                          {s.name?.[0] || "?"}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 font-medium text-foreground">{s.name}</td>
                    <td className="px-3 py-3 text-muted-foreground font-mono text-xs">{s.user_id}</td>
                    <td className="px-3 py-3">
                      {s.section ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{s.section}</span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground text-xs">{s.batch || "—"}</td>
                    <td className="px-3 py-3 text-muted-foreground text-xs">{s.department || "—"}</td>
                    <td className="px-3 py-3 text-muted-foreground text-xs">{s.whatsapp_phone || s.mobile || "—"}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${faceStatusColor(s)}`}>
                        {faceStatusText(s)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate(`/admission/student-profile/${s.id}`)}
                          className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground"
                          title="View Profile">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {(isAdmin || isFaculty) && (
                          <button
                            onClick={() => navigate(`/admission/student-profile/${s.id}?tab=photos`)}
                            className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground"
                            title="Manage Face Photos">
                            <Camera className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            {students.length} student(s) found · Click a row to view full profile
          </div>
        </div>
      )}
    </div>
  );
}
