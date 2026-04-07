import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { User, Camera, X, Upload, CheckCircle2, AlertCircle, Trash2, Plus } from "lucide-react";
import { apiFetch, API_BASE } from "@/lib/api-config";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

const tabs = ["Personal Info", "Parents", "Face Photos", "Education & Other"];

export default function StudentProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(0);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [facePhotos, setFacePhotos] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canManagePhotos = user?.role === 'admin' || user?.role === 'faculty';

  useEffect(() => { if (id) loadStudent(); }, [id]);

  const loadStudent = async () => {
    setLoading(true);
    try {
      const data: any = await apiFetch(`/api/students/${id}`);
      setStudent(data.student);
      setFacePhotos(data.student?.face_photos || []);
    } catch { toast({ title: "Error", description: "Could not load student", variant: "destructive" }); }
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxAllowed = 5 - facePhotos.length;
    if (files.length > maxAllowed) {
      toast({ title: "Too many photos", description: `Can only add ${maxAllowed} more photo(s)` });
      return;
    }
    setSelectedFiles(files.slice(0, maxAllowed));
  };

  const handleUploadPhotos = async () => {
    if (!selectedFiles.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach(f => formData.append("photos", f));
      const resp = await fetch(`${API_BASE}/api/students/${id}/face-photos`, {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${localStorage.getItem("icms_token")}` }
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Upload failed");
      toast({ title: "Photos uploaded", description: data.message });
      setShowPhotoDialog(false);
      setSelectedFiles([]);
      loadStudent();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const handleDeletePhoto = async (photoId: number) => {
    if (!confirm("Delete this face photo?")) return;
    try {
      await apiFetch(`/api/students/${id}/face-photos/${photoId}`, { method: "DELETE" });
      toast({ title: "Photo deleted" });
      loadStudent();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!student) return <div className="text-center py-12 text-muted-foreground">Student not found</div>;

  const photoUrl = student.photo_url ? `${API_BASE}${student.photo_url}` : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground text-sm">← Back</button>
        <h1 className="text-xl font-bold text-foreground">Student Profile</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Panel */}
        <div className="bg-card rounded-xl border border-border p-6 text-center shadow-sm">
          <div className="w-28 h-28 bg-muted rounded-full mx-auto flex items-center justify-center mb-4 overflow-hidden">
            {photoUrl
              ? <img src={photoUrl} alt={student.name} className="w-full h-full object-cover" />
              : <User className="w-14 h-14 text-muted-foreground" />}
          </div>
          <h2 className="text-lg font-bold text-foreground">{student.name}</h2>
          <p className="text-primary text-sm font-medium mt-1">{student.section || student.batch} · {student.semester}</p>
          <p className="text-muted-foreground text-xs mt-1">{student.user_id} · {student.roll_no}</p>

          <div className="mt-4 space-y-2">
            {/* Face enrollment status */}
            <div className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm ${
              facePhotos.length >= 5 ? 'bg-green-100 text-green-700' :
              facePhotos.length > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
            }`}>
              {facePhotos.length >= 5 ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {facePhotos.length} / 5 face photos
            </div>

            {canManagePhotos && facePhotos.length < 5 && (
              <button
                onClick={() => setShowPhotoDialog(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
              >
                <Camera className="w-4 h-4" /> Upload Face Photos
              </button>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-sm">
          <div className="flex items-center border-b border-border overflow-x-auto">
            {tabs.map((tab, i) => (
              <button key={tab} onClick={() => setActiveTab(i)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === i ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}>{tab}</button>
            ))}
          </div>

          <div className="p-5">
            {activeTab === 0 && (
              <div className="space-y-4">
                <InfoGrid items={[
                  { label: "Full Name", value: student.name },
                  { label: "Admission No.", value: student.admission_no },
                  { label: "Roll No.", value: student.roll_no },
                  { label: "Gender", value: student.gender },
                  { label: "DOB", value: student.dob ? new Date(student.dob).toLocaleDateString() : "—" },
                  { label: "Blood Group", value: student.blood_group },
                  { label: "Category", value: student.category },
                  { label: "Department", value: student.department },
                ]} />
                <h4 className="text-sm font-semibold border-l-4 border-primary pl-3">Contact Details</h4>
                <InfoGrid items={[
                  { label: "Mobile", value: student.mobile },
                  { label: "WhatsApp", value: student.whatsapp_phone },
                  { label: "Email", value: student.email },
                  { label: "Address", value: student.address },
                ]} />
              </div>
            )}

            {activeTab === 1 && (
              <InfoGrid items={[
                { label: "Father Name", value: student.father_name },
              ]} />
            )}

            {activeTab === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Face Recognition Photos</h4>
                  {canManagePhotos && facePhotos.length < 5 && (
                    <button
                      onClick={() => setShowPhotoDialog(true)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground"
                    >
                      <Plus className="w-3 h-3" /> Add Photos
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload up to 5 different photos for best face recognition accuracy. Include variations: with/without glasses, different lighting, etc.
                </p>
                <div className="grid grid-cols-5 gap-3">
                  {[1,2,3,4,5].map(slot => {
                    const photo = facePhotos.find(p => p.photo_index === slot);
                    return (
                      <div key={slot} className="relative">
                        <div className={`w-full aspect-square rounded-lg border-2 overflow-hidden flex items-center justify-center ${
                          photo ? 'border-green-400 bg-green-50' : 'border-dashed border-border bg-muted/30'
                        }`}>
                          {photo
                            ? <img src={`${API_BASE}${photo.photo_url}`} alt={`Photo ${slot}`} className="w-full h-full object-cover" />
                            : <span className="text-2xl text-muted-foreground/40">{slot}</span>
                          }
                        </div>
                        {photo && canManagePhotos && (
                          <button
                            onClick={() => handleDeletePhoto(photo.id)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center text-xs"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                        <p className="text-xs text-center text-muted-foreground mt-1">Photo {slot}</p>
                      </div>
                    );
                  })}
                </div>
                {facePhotos.length === 0 && (
                  <div className="text-center py-4 text-sm text-muted-foreground bg-muted/20 rounded-lg">
                    No face photos uploaded yet. {canManagePhotos ? 'Upload photos to enable face recognition.' : 'Ask admin/faculty to upload photos.'}
                  </div>
                )}
              </div>
            )}

            {activeTab === 3 && (
              <InfoGrid items={[
                { label: "Batch", value: student.batch },
                { label: "Course", value: student.course },
                { label: "Semester", value: student.semester },
                { label: "Section", value: student.section },
              ]} />
            )}
          </div>
        </div>
      </div>

      {/* 5-Photo Upload Dialog */}
      {showPhotoDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Upload Face Photos</h3>
              <button onClick={() => { setShowPhotoDialog(false); setSelectedFiles([]); }}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              Can add {5 - facePhotos.length} more photo(s). Use clear frontal face photos with good lighting. System handles beard/glasses automatically.
            </p>

            {/* Upload slots */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {[0,1,2,3,4].map(i => {
                const existingPhoto = facePhotos[i];
                const newFile = selectedFiles[i - facePhotos.length];
                const preview = newFile ? URL.createObjectURL(newFile) : null;
                return (
                  <div key={i} className={`aspect-square rounded-lg border-2 overflow-hidden flex items-center justify-center ${
                    existingPhoto ? 'border-green-400' :
                    preview ? 'border-primary' : 'border-dashed border-border bg-muted/20'
                  }`}>
                    {existingPhoto
                      ? <img src={`${API_BASE}${existingPhoto.photo_url}`} className="w-full h-full object-cover" />
                      : preview
                        ? <img src={preview} className="w-full h-full object-cover" />
                        : <span className="text-lg text-muted-foreground/30">{i+1}</span>
                    }
                  </div>
                );
              })}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />

            <div className="space-y-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border bg-muted text-sm hover:bg-muted/80"
              >
                <Upload className="w-4 h-4" />
                {selectedFiles.length > 0 ? `${selectedFiles.length} file(s) selected` : 'Select Photos'}
              </button>

              <button
                onClick={handleUploadPhotos}
                disabled={!selectedFiles.length || uploading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                {uploading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading...</> : <><Camera className="w-4 h-4" /> Submit</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoGrid({ items }: { items: { label: string; value: any }[] }) {
  return (
    <div className="grid grid-cols-2 gap-y-3 gap-x-8">
      {items.map(item => (
        <div key={item.label} className="flex items-start py-2 border-b border-border">
          <span className="text-sm text-muted-foreground w-36 shrink-0">{item.label}</span>
          <span className="text-sm font-medium text-foreground break-words">{item.value || "—"}</span>
        </div>
      ))}
    </div>
  );
}
