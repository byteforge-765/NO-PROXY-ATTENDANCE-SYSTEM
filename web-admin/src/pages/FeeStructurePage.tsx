import { useState } from "react";
import { Plus, Search } from "lucide-react";

const feeHeads = [
  { id: 1, name: "Tuition Fee", amount: 25000, dueDate: "15-04-2026" },
  { id: 2, name: "Transport Fee", amount: 8000, dueDate: "15-04-2026" },
  { id: 3, name: "Hostel Fee", amount: 15000, dueDate: "15-04-2026" },
  { id: 4, name: "Exam Fee", amount: 3000, dueDate: "01-05-2026" },
  { id: 5, name: "Library Fee", amount: 1500, dueDate: "15-04-2026" },
];

export default function FeeStructurePage() {
  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between animate-fade-up" style={{ opacity: 0, animationFillMode: "forwards" }}>
        <h1 className="text-xl font-bold text-foreground">Fee Structure</h1>
        <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
          <Plus className="w-4 h-4" /> Add Fee Head
        </button>
      </div>

      <div className="bg-card rounded-xl card-shadow border border-border overflow-hidden animate-fade-up" style={{ opacity: 0, animationDelay: "0.08s", animationFillMode: "forwards" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Fee Head</th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Amount (₹)</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Due Date</th>
              <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Edit</th>
              <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Delete</th>
            </tr>
          </thead>
          <tbody>
            {feeHeads.map(f => (
              <tr key={f.id} className="border-b border-border hover:bg-muted/20">
                <td className="px-4 py-3 font-medium text-foreground">{f.name}</td>
                <td className="px-4 py-3 text-right text-foreground tabular-nums">₹{f.amount.toLocaleString()}</td>
                <td className="px-4 py-3 text-muted-foreground">{f.dueDate}</td>
                <td className="px-4 py-3 text-center">
                  <button className="text-primary text-sm font-medium hover:underline">Edit</button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button className="text-destructive text-sm font-medium hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30">
              <td className="px-4 py-3 font-bold text-foreground">Total</td>
              <td className="px-4 py-3 text-right font-bold text-foreground tabular-nums">₹{feeHeads.reduce((s, f) => s + f.amount, 0).toLocaleString()}</td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
