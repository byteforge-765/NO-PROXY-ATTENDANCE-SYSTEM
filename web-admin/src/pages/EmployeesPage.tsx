import { useState, useEffect } from "react";
import { Plus, Search, User, RefreshCw, Loader2, Edit2, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api-config";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

export default function EmployeesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [faculty, setFaculty] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    user_id: "", password: "1234", name: "", dob: "",
    email: "", mobile: "", designation: "", department_id: ""
  });

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    apiFetch("/api/departments").then((d: any) => setDepartments(d.departments || [])).catch(() => {});
    loadFaculty();
  }, []);

  const loadFaculty = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dept) params.set("department_id", dept);
      if (search) params.set("search", search);
      const data: any = await apiFetch(`/api/faculty${params.toString() ? "?" + params.toString() : ""}`);
      setFaculty(data.faculty || []);
    } catch { setFaculty([]); }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.user_id || !form.name || !form.password) {
      toast({ title: "Fill required fields", description: "User ID, Name and Password required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/faculty", { method: "POST", body: JSON.stringify(form) });
      toast({ title: "Faculty added ✓", description: form.name });
      setShowAdd(false);
      setForm({ user_id: "", password: "1234", name: "", dob: "", email: "", mobile: "", designation: "", department_id: "" });
      loadFaculty();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      await apiFetch(`/api/faculty/${id}`, { method: "DELETE" });
      toast({ title: "Deleted" });
      loadFaculty();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const u = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const filtered = faculty.filter(f =>
    !search ||
    f.name?.toLowerCase().includes(search.toLowerCase()) ||
    f.user_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-foreground">Faculty / Employees</h1>
        <div className="flex gap-2">
          <button onClick={loadFaculty} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-muted-foreground text-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
          {isAdmin && (
            <button onClick={() => setShowAdd(!showAdd)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
              <Plus className="w-4 h-4" /> Add Faculty
            </button>
          )}
        </div>
      </div>

      {/* Add Faculty Form */}
      {showAdd && isAdmin && (
        <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
          <h3 className="font-semibold text-sm">Add New Faculty</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "User ID *", key: "user_id", placeholder: "e.g. FAC021" },
              { label: "Password *", key: "password", placeholder: "Default: 1234" },
              { label: "Full Name *", key: "name", placeholder: "Dr. Name" },
              { label: "Designation", key: "designation", placeholder: "e.g. Associate Professor" },
              { label: "Email", key: "email", placeholder: "faculty@icms.edu" },
              { label: "Mobile", key: "mobile", placeholder: "9876543210" },
              { label: "Date of Birth", key: "dob", placeholder: "YYYY-MM-DD" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-muted-foreground">{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => u(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full mt-0.5 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
              </div>
            ))}
            <div>
              <label className="text-xs text-muted-foreground">Department</label>
              <select value={form.department_id} onChange={e => u("department_id", e.target.value)}
                className="w-full mt-0.5 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none">
                <option value="">— Select Department —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving}
              className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Faculty
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg bg-muted text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={dept} onChange={e => { setDept(e.target.value); }}
          className="px-3 py-2 rounded-lg border border-border bg-card text-sm focus:ring-2 focus:ring-ring focus:outline-none">
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && loadFaculty()}
            placeholder="Search by name or ID..."
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
        </div>
        <button onClick={loadFaculty} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Search</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-3 py-3 text-left w-10"></th>
                  <th className="px-3 py-3 text-left font-semibold text-muted-foreground">Name</th>
                  <th className="px-3 py-3 text-left font-semibold text-muted-foreground">User ID</th>
                  <th className="px-3 py-3 text-left font-semibold text-muted-foreground">Department</th>
                  <th className="px-3 py-3 text-left font-semibold text-muted-foreground">Designation</th>
                  <th className="px-3 py-3 text-left font-semibold text-muted-foreground">Mobile</th>
                  <th className="px-3 py-3 text-left font-semibold text-muted-foreground">Email</th>
                  {isAdmin && <th className="px-3 py-3 text-center font-semibold text-muted-foreground">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(f => (
                  <tr key={f.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-3">
                      <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                    </td>
                    <td className="px-3 py-3 font-medium text-foreground">{f.name}</td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{f.user_id}</td>
                    <td className="px-3 py-3 text-muted-foreground text-xs">{f.department || "—"}</td>
                    <td className="px-3 py-3 text-muted-foreground text-xs">{f.designation || "—"}</td>
                    <td className="px-3 py-3 text-muted-foreground text-xs">{f.mobile || "—"}</td>
                    <td className="px-3 py-3 text-muted-foreground text-xs">{f.email || "—"}</td>
                    {isAdmin && (
                      <td className="px-3 py-3 text-center">
                        <button onClick={() => handleDelete(f.id, f.name)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No faculty found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            {filtered.length} faculty member(s)
          </div>
        </div>
      )}
    </div>
  );
}
