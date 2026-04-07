import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Clock } from "lucide-react";

const pastFeedback = [
  { subject: "Lab equipment needs upgrade", status: "resolved", date: "Feb 28, 2026" },
  { subject: "Wi-Fi connectivity in Block B", status: "pending", date: "Mar 5, 2026" },
];

export default function FeedbackPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="animate-fade-up" style={{ opacity: 0, animationFillMode: 'forwards' }}>
        <h1 className="text-2xl font-bold text-foreground" style={{ lineHeight: '1.2' }}>Feedback</h1>
        <p className="text-muted-foreground mt-1">Share your suggestions and concerns.</p>
      </div>

      <div className="bg-card rounded-2xl p-6 card-shadow border border-border animate-fade-up" style={{ opacity: 0, animationDelay: '0.1s', animationFillMode: 'forwards' }}>
        {submitted ? (
          <div className="text-center py-8 animate-scale-in">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
            <h3 className="font-semibold text-foreground text-lg">Feedback Submitted!</h3>
            <p className="text-muted-foreground text-sm mt-1">Thank you. We'll review your feedback shortly.</p>
            <Button className="mt-4 active:scale-95 transition-transform" onClick={() => setSubmitted(false)}>Submit Another</Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Subject</Label>
              <Input placeholder="Brief subject of your feedback" className="rounded-lg" required />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Details</Label>
              <Textarea placeholder="Describe your feedback in detail..." className="rounded-lg min-h-[120px]" required />
            </div>
            <Button type="submit" className="active:scale-95 transition-transform">Submit Feedback</Button>
          </form>
        )}
      </div>

      <div className="bg-card rounded-2xl p-5 card-shadow border border-border animate-fade-up" style={{ opacity: 0, animationDelay: '0.15s', animationFillMode: 'forwards' }}>
        <h3 className="font-semibold text-foreground mb-3">Previous Feedback</h3>
        <div className="space-y-2">
          {pastFeedback.map((f, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <p className="text-sm font-medium text-foreground">{f.subject}</p>
                <p className="text-xs text-muted-foreground">{f.date}</p>
              </div>
              <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                f.status === "resolved" ? "bg-success/10 text-success" : "bg-amber-100 text-amber-600"
              }`}>
                {f.status === "resolved" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {f.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
