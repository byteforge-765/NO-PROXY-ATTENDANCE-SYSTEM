import { useState } from "react";

const modules = [
  "Dashboard", "PreAdmission", "Class", "Admission", "HR", "Attendance",
  "Fee", "Library", "Transport", "SMS", "Mail", "Event", "TimeTable",
  "Hostel", "Examination", "Report",
];

const roles = ["Admin", "Teacher/Faculty", "Accountant"];

export default function PermissionsPage() {
  const [activeRole, setActiveRole] = useState("Admin");
  const [perms, setPerms] = useState<Record<string, Record<string, boolean>>>(() => {
    const init: Record<string, Record<string, boolean>> = {};
    modules.forEach(m => {
      init[m] = { View: true, Add: activeRole === "Admin", Edit: activeRole === "Admin", Delete: activeRole === "Admin" };
    });
    return init;
  });

  const toggle = (mod: string, action: string) => {
    setPerms(prev => ({
      ...prev,
      [mod]: { ...prev[mod], [action]: !prev[mod][action] }
    }));
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <h1 className="text-xl font-bold text-foreground animate-fade-up" style={{ opacity: 0, animationFillMode: "forwards" }}>Permissions</h1>

      <div className="flex gap-2 animate-fade-up" style={{ opacity: 0, animationDelay: "0.05s", animationFillMode: "forwards" }}>
        {roles.map(role => (
          <button key={role} onClick={() => setActiveRole(role)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeRole === role ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}>{role}</button>
        ))}
      </div>

      <div className="bg-card rounded-xl card-shadow border border-border overflow-hidden animate-fade-up" style={{ opacity: 0, animationDelay: "0.1s", animationFillMode: "forwards" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Module</th>
              {["View", "Add", "Edit", "Delete"].map(a => (
                <th key={a} className="text-center px-4 py-3 font-semibold text-muted-foreground">{a}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map(mod => (
              <tr key={mod} className="border-b border-border hover:bg-muted/20">
                <td className="px-4 py-3 font-medium text-foreground">{mod}</td>
                {["View", "Add", "Edit", "Delete"].map(action => (
                  <td key={action} className="px-4 py-3 text-center">
                    <input type="checkbox" checked={perms[mod]?.[action] ?? false} onChange={() => toggle(mod, action)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-ring" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Save Permissions</button>
    </div>
  );
}
