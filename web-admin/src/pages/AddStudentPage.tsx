import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiUpload } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";

const tabs = ["Personal Details", "Contact Details", "Parent Details"];

function FormInput({ label, value, onChange, required, type = "text" }: any) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-muted-foreground">{label}{required && <span className="text-destructive"> *</span>}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={label}
        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
    </div>
  );
}

function FormSelect({ label, value, onChange, options, required }: any) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-muted-foreground">{label}{required && <span className="text-destructive"> *</span>}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none">
        <option value="">— Select —</option>
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export default function AddStudentPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    user_id: "", password: "11111111", admission_no: "", roll_no: "",
    name: "", dob: "", gender: "Male", blood_group: "", batch: "", section: "",
    course: "", semester: "", department_id: "",
    mobile: "", whatsapp_phone: "", email: "", address: "",
    father_name: "", mother_name: "",
  });

  const u = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handleSave = async () => {
    if (!form.user_id || !form.name || !form.admission_no || !form.dob)
      return toast({ title: "Fill required fields", description: "user_id, name, admission_no, dob are required", variant: "destructive" });

    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (photoFile) fd.append("photo", photoFile);
      await apiUpload("/api/students", fd);
      toast({ title: "Student created ✓", description: `${form.name} added successfully` });
      navigate("/admission/students");
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <h1 className="text-xl font-bold text-foreground">Add Student</h1>

      {/* Photo upload */}
      <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-5">
        <div className="w-20 h-20 rounded-xl bg-muted overflow-hidden flex items-center justify-center border border-border cursor-pointer"
          onClick={() => fileRef.current?.click()}>
          {photoPreview ? <img src={photoPreview} alt="Photo" className="w-full h-full object-cover" /> :
            <Upload className="w-8 h-8 text-muted-foreground" />}
        </div>
        <div>
          <p className="font-medium text-sm">Student Photo</p>
          <p className="text-xs text-muted-foreground mt-0.5">Used for face recognition enrollment. JPG/PNG, max 5MB.</p>
          <button onClick={() => fileRef.current?.click()}
            className="mt-2 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/80">
            {photoFile ? "Change Photo" : "Upload Photo"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        </div>
      </div>

      <div className="flex border-b border-border">
        {tabs.map((tab, i) => (
          <button key={tab} onClick={() => setActiveTab(i)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === i ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        {activeTab === 0 && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="User ID" value={form.user_id} onChange={(v: string) => u("user_id", v)} required />
              <FormInput label="Password" value={form.password} onChange={(v: string) => u("password", v)} type="password" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Full Name" value={form.name} onChange={(v: string) => u("name", v)} required />
              <FormInput label="Admission No." value={form.admission_no} onChange={(v: string) => u("admission_no", v)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Date of Birth" value={form.dob} onChange={(v: string) => u("dob", v)} type="date" required />
              <FormInput label="Roll Number" value={form.roll_no} onChange={(v: string) => u("roll_no", v)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormSelect label="Gender" value={form.gender} onChange={(v: string) => u("gender", v)} options={["Male","Female","Other"]} />
              <FormSelect label="Blood Group" value={form.blood_group} onChange={(v: string) => u("blood_group", v)} options={["A+","A-","B+","B-","O+","O-","AB+","AB-"]} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormSelect label="Batch" value={form.batch} onChange={(v: string) => u("batch", v)} options={["2024-2028","2023-2027","2022-2026","2021-2025"]} />
              <FormInput label="Section (e.g. IT-1)" value={(form as any).section} onChange={(v: string) => u("section", v)} />
              <FormInput label="Course" value={form.course} onChange={(v: string) => u("course", v)} />
              <FormSelect label="Semester" value={form.semester} onChange={(v: string) => u("semester", v)} options={["1st","2nd","3rd","4th","5th","6th","7th","8th"]} />
            </div>
          </div>
        )}
        {activeTab === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Mobile" value={form.mobile} onChange={(v: string) => u("mobile", v)} />
              <FormInput label="WhatsApp Number" value={form.whatsapp_phone} onChange={(v: string) => u("whatsapp_phone", v)} />
            </div>
            <FormInput label="Email" value={form.email} onChange={(v: string) => u("email", v)} type="email" />
            <FormInput label="Address" value={form.address} onChange={(v: string) => u("address", v)} />
          </div>
        )}
        {activeTab === 2 && (
          <div className="space-y-4">
            <FormInput label="Father Name" value={form.father_name} onChange={(v: string) => u("father_name", v)} />
            <FormInput label="Mother Name" value={form.mother_name} onChange={(v: string) => u("mother_name", v)} />
          </div>
        )}
        <div className="flex gap-3 mt-6 pt-4 border-t border-border">
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Saving...</span> : "Save Student"}
          </button>
          <button onClick={() => navigate(-1)} className="px-6 py-2.5 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
