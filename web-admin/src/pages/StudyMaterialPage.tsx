import { useEffect, useState, useRef } from "react";
import { apiFetch, API_BASE, apiUpload } from "@/lib/api-config";
import { useAuth } from "@/lib/auth-context";
import { Loader2, FileText, Upload, Download, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function StudyMaterialPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isFaculty = user?.role === "faculty" || user?.role === "admin";

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    setLoading(true);
    try {
      const d: any = await apiFetch("/api/study-material");
      setMaterials(d.materials || []);
    } catch {}
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!title || !subject || !file)
      return toast({ title: "Fill title, subject and select a file", variant: "destructive" });
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("title", title); fd.append("subject", subject); fd.append("file", file);
      await apiUpload("/api/study-material", fd);
      toast({ title: "Material uploaded ✓" });
      setTitle(""); setSubject(""); setFile(null);
      loadMaterials();
    } catch (err: any) { toast({ title: "Upload failed", description: err.message, variant: "destructive" }); }
    setUploading(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this material?")) return;
    try {
      await apiFetch(`/api/study-material/${id}`, { method: "DELETE" });
      loadMaterials();
    } catch (err: any) { toast({ title: "Delete failed", description: err.message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <h1 className="text-xl font-bold text-foreground">Study Materials</h1>

      {isFaculty && (
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h3 className="font-semibold text-sm">Upload Material</h3>
          <div className="grid grid-cols-2 gap-3">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title"
              className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject"
              className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted">
              <Upload className="w-4 h-4" />
              {file ? file.name : "Select File (PDF/Image)"}
            </button>
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
            <button onClick={handleUpload} disabled={uploading}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upload"}
            </button>
          </div>
        </div>
      )}

      {loading ? <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> :
        materials.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No study materials yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {materials.map(m => (
              <div key={m.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{m.subject} · {m.uploaded_by_name} · {new Date(m.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <a href={`${API_BASE}${m.file_url}`} target="_blank"
                    className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                    <Download className="w-4 h-4 text-muted-foreground" />
                  </a>
                  {isFaculty && (
                    <button onClick={() => handleDelete(m.id)} className="p-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 transition-colors">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}
