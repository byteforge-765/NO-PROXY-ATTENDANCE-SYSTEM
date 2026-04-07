import { useState } from "react";
import { Check, X } from "lucide-react";

const students = [
  { rollNo: "CS-101", name: "AARAV JAIN", admNo: "14107" },
  { rollNo: "CS-102", name: "AARSH BANSAL", admNo: "14120" },
  { rollNo: "CS-103", name: "AAYUSH SEHGAL", admNo: "14112" },
  { rollNo: "CS-104", name: "AAYUSH ARORA", admNo: "14104" },
  { rollNo: "CS-105", name: "AKSHAT GOEL", admNo: "14875" },
  { rollNo: "CS-106", name: "AKSHIT DABAS", admNo: "14329" },
  { rollNo: "CS-107", name: "AKSHITA GARG", admNo: "14118" },
  { rollNo: "CS-108", name: "ARIN CHHIKARA", admNo: "14096" },
  { rollNo: "CS-109", name: "ARNAV SHARMA", admNo: "14328" },
  { rollNo: "CS-110", name: "AVNI SHARMA", admNo: "14099" },
];

export default function StudentTransferPage() {
  const [fromBatch, setFromBatch] = useState("Class-2 (2015B)");
  const [selected, setSelected] = useState<string[]>(students.slice(0, 3).map(s => s.rollNo));
  const [showConfirm, setShowConfirm] = useState(false);
  const [leavingDate, setLeavingDate] = useState("2016-04-03");
  const [shortNote, setShortNote] = useState("Passing out");

  const toggleSelect = (rollNo: string) => {
    setSelected(prev => prev.includes(rollNo) ? prev.filter(r => r !== rollNo) : [...prev, rollNo]);
  };

  const selectAll = () => {
    if (selected.length === students.length) setSelected([]);
    else setSelected(students.map(s => s.rollNo));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between animate-fade-up" style={{ opacity: 0, animationFillMode: "forwards" }}>
        <h1 className="text-xl font-bold text-primary">STUDENT TRANSFER</h1>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Transfer Student</button>
          <button className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium">Graduate Students</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fade-up" style={{ opacity: 0, animationDelay: "0.05s", animationFillMode: "forwards" }}>
        {/* Student List */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm text-muted-foreground">From</span>
            <select value={fromBatch} onChange={e => setFromBatch(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-card text-sm">
              <option>Class-2 (2015B)</option>
              <option>Class-1 (2016A)</option>
            </select>
          </div>

          <div className="bg-card rounded-xl card-shadow border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-3 py-3 text-left">
                    <input type="checkbox" checked={selected.length === students.length} onChange={selectAll} className="rounded" />
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-muted-foreground">Student Name</th>
                  <th className="px-3 py-3 text-left font-semibold text-muted-foreground">Admission Number</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.rollNo} className="border-b border-border hover:bg-muted/20">
                    <td className="px-3 py-2.5">
                      <input type="checkbox" checked={selected.includes(s.rollNo)} onChange={() => toggleSelect(s.rollNo)} className="rounded" />
                    </td>
                    <td className="px-3 py-2.5 text-foreground font-medium">{s.name}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{s.admNo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transfer Details */}
        <div className="space-y-4">
          <div className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Graduating batch</span>
              <p className="font-semibold text-foreground mt-0.5">Class-2 (2015B)</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Short Note</span>
              <p className="font-medium text-foreground mt-0.5">{shortNote}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Leaving Date</span>
              <input type="date" value={leavingDate} onChange={e => setLeavingDate(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
            </div>
          </div>
          <button onClick={() => setShowConfirm(true)} className="w-full px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium">
            Graduate Students
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl card-shadow border border-border p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-foreground">Student transfer confirmation</h3>
            <p className="text-sm text-muted-foreground mt-2">Are you sure to transfer selected student</p>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowConfirm(false)} className="px-6 py-2 rounded-lg bg-warning text-warning-foreground text-sm font-medium">Ok</button>
              <button onClick={() => setShowConfirm(false)} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
