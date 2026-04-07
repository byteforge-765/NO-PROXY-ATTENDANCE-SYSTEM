import { Construction } from "lucide-react";

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-up" style={{ opacity: 0, animationFillMode: 'forwards' }}>
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Construction className="w-7 h-7 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <p className="text-muted-foreground mt-1 text-sm">This module is coming soon.</p>
    </div>
  );
}
