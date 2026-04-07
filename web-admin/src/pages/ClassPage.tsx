import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";

const initialClasses = [
  { id: 1, name: "Class-1", grading: "Normal", batches: [] as string[] },
  { id: 2, name: "Class - 2", grading: "Normal", batches: ["2016A", "2016B"] },
];

export default function ClassPage() {
  const [classes, setClasses] = useState(initialClasses);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [showBatchForm, setShowBatchForm] = useState<number | null>(null);
  const [batchName, setBatchName] = useState("");
  const [batchStart, setBatchStart] = useState("");
  const [batchEnd, setBatchEnd] = useState("");

  const addClass = () => {
    if (!newName.trim()) return;
    setClasses(prev => [...prev, { id: Date.now(), name: newName, grading: "Normal", batches: [] }]);
    setNewName("");
    setShowAdd(false);
  };

  const deleteClass = (id: number) => setClasses(prev => prev.filter(c => c.id !== id));

  const addBatch = (classId: number) => {
    if (!batchName.trim()) return;
    setClasses(prev => prev.map(c => c.id === classId ? { ...c, batches: [...c.batches, batchName] } : c));
    setBatchName("");
    setBatchStart("");
    setBatchEnd("");
    setShowBatchForm(null);
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between animate-fade-up" style={{ opacity: 0, animationFillMode: "forwards" }}>
        <h1 className="text-xl font-bold text-primary">CLASS</h1>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90 transition-all">
          <Plus className="w-4 h-4" /> New
        </button>
      </div>

      {showAdd && (
        <div className="bg-card rounded-xl card-shadow border border-border p-5 animate-fade-up" style={{ opacity: 0, animationFillMode: "forwards" }}>
          <h3 className="font-semibold text-foreground mb-3">Add New Class</h3>
          <div className="flex gap-3">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Class Name" className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            <button onClick={addClass} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Save</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg bg-muted text-foreground text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl card-shadow border border-border overflow-hidden animate-fade-up" style={{ opacity: 0, animationDelay: "0.08s", animationFillMode: "forwards" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Class/Section</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Grading Type</th>
              <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Add Batch</th>
              <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Edit</th>
              <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Delete</th>
            </tr>
          </thead>
          <tbody>
            {classes.map(cls => (
              <tr key={cls.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <span className="text-primary font-medium border-l-2 border-primary pl-2">{cls.name}</span>
                </td>
                <td className="px-4 py-3 text-foreground">{cls.grading}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => setShowBatchForm(showBatchForm === cls.id ? null : cls.id)} className="text-primary border-l-2 border-success pl-2 text-sm font-medium hover:underline">
                    Add Batch
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button className="text-primary border-l-2 border-primary pl-2 text-sm font-medium hover:underline">Edit</button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => deleteClass(cls.id)} className="text-destructive border-l-2 border-destructive pl-2 text-sm font-medium hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showBatchForm !== null && (
        <div className="bg-card rounded-xl card-shadow border border-border p-5 animate-fade-up" style={{ opacity: 0, animationFillMode: "forwards" }}>
          <h3 className="text-lg font-bold text-primary mb-4">CLASS</h3>
          <div className="space-y-4 max-w-md mx-auto">
            <div className="flex items-center gap-4">
              <label className="w-28 text-sm text-muted-foreground text-right">Batch Name</label>
              <input value={batchName} onChange={e => setBatchName(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            </div>
            <div className="flex items-center gap-4">
              <label className="w-28 text-sm text-muted-foreground text-right">Start Date</label>
              <input type="date" value={batchStart} onChange={e => setBatchStart(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            </div>
            <div className="flex items-center gap-4">
              <label className="w-28 text-sm text-muted-foreground text-right">End Date</label>
              <input type="date" value={batchEnd} onChange={e => setBatchEnd(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button onClick={() => addBatch(showBatchForm)} className="px-6 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium">Save</button>
              <button onClick={() => setShowBatchForm(null)} className="px-6 py-2 rounded-full bg-muted text-foreground text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
