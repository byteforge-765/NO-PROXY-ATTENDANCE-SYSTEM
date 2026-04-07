import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-config";
import { useAuth } from "@/lib/auth-context";

// ── Types ─────────────────────────────────────────────────────────────────────
interface TgHealth { connected: boolean; graph: string }
interface ProxySuspect { student_id: number; name: string; roll_no?: string; face_confidence: number; gps_distance_m: number; risk_level: string; flags: string[] }
interface LowAttStudent { student_id: number; name: string; roll_no?: string; batch: string; attendance_pct: number; present_count: number; total_count: number; risk: string }
interface SubjectSummary { present: number; absent: number; total: number; percentage: number; below_75: boolean }

// ── Small helpers ─────────────────────────────────────────────────────────────
const badge = (risk: string) => {
  const map: Record<string, string> = { HIGH: "bg-red-100 text-red-700 border border-red-300", MEDIUM: "bg-yellow-100 text-yellow-700 border border-yellow-300", LOW: "bg-green-100 text-green-700 border border-green-300", CRITICAL: "bg-red-100 text-red-700 border border-red-300", WARNING: "bg-orange-100 text-orange-700 border border-orange-300", OK: "bg-green-100 text-green-700 border border-green-300" };
  return map[risk] || "bg-gray-100 text-gray-600";
};

// ═════════════════════════════════════════════════════════════════════════════
export default function TigerGraphPage() {
  useAuth(); // token handled by apiFetch via localStorage
  const [tab, setTab] = useState<"health" | "proxy" | "pattern" | "low">("health");

  // ── Health State ──────────────────────────────────────────────────────────
  const [health, setHealth] = useState<TgHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // ── Proxy Detection State ─────────────────────────────────────────────────
  const [classId, setClassId] = useState("");
  const [proxyData, setProxyData] = useState<{ total_present: number; local_suspects: ProxySuspect[]; analysis_source: string } | null>(null);
  const [proxyLoading, setProxyLoading] = useState(false);

  // ── Attendance Pattern State ──────────────────────────────────────────────
  const [studentId, setStudentId] = useState("");
  const [patternData, setPatternData] = useState<{ student_id: number; subject_summary: Record<string, SubjectSummary>; consecutive_absences_now: number; max_consecutive_absences: number; alert: string | null } | null>(null);
  const [patternLoading, setPatternLoading] = useState(false);

  // ── Low Attendance State ──────────────────────────────────────────────────
  const [batch, setBatch] = useState("");
  const [threshold, setThreshold] = useState("75");
  const [lowData, setLowData] = useState<{ pg_students: LowAttStudent[]; critical_count: number; warning_count: number } | null>(null);
  const [lowLoading, setLowLoading] = useState(false);

  const [error, setError] = useState("");

  // ── Fetch Health ──────────────────────────────────────────────────────────
  const fetchHealth = useCallback(async () => {
    setHealthLoading(true); setError("");
    try {
      const d: any = await apiFetch('/api/tigergraph/health');
      setHealth(d.data);
    } catch (e: any) { setError(e.message || "Failed to reach backend"); }
    setHealthLoading(false);
  }, []);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  // ── Proxy Detection ───────────────────────────────────────────────────────
  const runProxyDetection = async () => {
    if (!classId) return setError("Enter Class ID");
    setProxyLoading(true); setError(""); setProxyData(null);
    try {
      const d: any = await apiFetch(`/api/tigergraph/proxy-detection/${classId}`);
      if (d.success) setProxyData(d.data);
      else setError(d.message);
    } catch (e: any) { setError(e.message || "Request failed"); }
    setProxyLoading(false);
  };

  // ── Attendance Pattern ────────────────────────────────────────────────────
  const runPattern = async () => {
    if (!studentId) return setError("Enter Student ID");
    setPatternLoading(true); setError(""); setPatternData(null);
    try {
      const d: any = await apiFetch(`/api/tigergraph/attendance-pattern/${studentId}`);
      if (d.success) setPatternData(d.data);
      else setError(d.message);
    } catch (e: any) { setError(e.message || "Request failed"); }
    setPatternLoading(false);
  };

  // ── Low Attendance ────────────────────────────────────────────────────────
  const runLowAttendance = async () => {
    if (!batch) return setError("Enter batch");
    setLowLoading(true); setError(""); setLowData(null);
    try {
      const d: any = await apiFetch(`/api/tigergraph/low-attendance?batch=${encodeURIComponent(batch)}&threshold=${threshold}`);
      if (d.success) setLowData(d.data);
      else setError(d.message);
    } catch (e: any) { setError(e.message || "Request failed"); }
    setLowLoading(false);
  };

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const tabs = [
    { id: "health",  label: "🔌 Status" },
    { id: "proxy",   label: "🕵️ Proxy Detection" },
    { id: "pattern", label: "📈 Attendance Pattern" },
    { id: "low",     label: "⚠️ Low Attendance" },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xl flex-shrink-0">
          🐯
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">TigerGraph Analytics</h1>
          <p className="text-gray-500 text-sm mt-0.5">Graph-powered attendance pattern analysis & proxy detection</p>
        </div>
        <div className="ml-auto">
          {health && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${health.connected ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
              {health.connected ? "🟢 Connected" : "🟡 Mock Mode"}
            </span>
          )}
        </div>
      </div>

      {/* Hybrid Architecture Note */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
        <strong>Hybrid Architecture:</strong> TigerGraph is used <em>only</em> for attendance graph analysis & proxy detection. Student records, auth, timetable, and fee data stay in <strong>PostgreSQL</strong>. Live attendance sessions stay in <strong>MongoDB</strong>.
      </div>

      {/* Error */}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      {/* Tab Bar */}
      <div className="flex gap-2 border-b border-gray-200 pb-0">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id as any); setError(""); }}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t.id ? "bg-white border border-b-white border-gray-200 text-indigo-600 -mb-px" : "text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Health Tab ──────────────────────────────────────────────────────── */}
      {tab === "health" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "TigerGraph", value: health?.connected ? "Connected" : "Not Connected", icon: "🐯", color: health?.connected ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200" },
              { label: "Graph Name", value: health?.graph || "ICMS", icon: "🕸️", color: "bg-indigo-50 border-indigo-200" },
              { label: "Mode", value: health?.connected ? "Live Graph Queries" : "Mock / PostgreSQL Fallback", icon: "⚡", color: "bg-purple-50 border-purple-200" },
            ].map(card => (
              <div key={card.label} className={`rounded-xl border p-4 ${card.color}`}>
                <div className="text-2xl mb-2">{card.icon}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">{card.label}</div>
                <div className="font-semibold text-gray-900 mt-0.5">{card.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 mb-3">TigerGraph Features in ICMS</h3>
            <div className="space-y-2 text-sm">
              {[
                { feature: "Proxy Detection", desc: "Detects suspicious attendance (low face confidence + high GPS distance) using graph edge analysis", status: "✅ Active" },
                { feature: "Attendance Pattern Analysis", desc: "Subject-wise attendance trends, consecutive absence streaks per student", status: "✅ Active" },
                { feature: "Low Attendance Alert", desc: "Batch-wide scan for students below 75% using graph traversal queries", status: "✅ Active" },
                { feature: "Consecutive Absence Tracking", desc: "Real-time streak detection per subject for early intervention", status: "✅ Active" },
                { feature: "Auto Sync", desc: "Every time a student marks attendance via OTP, data is pushed to TigerGraph graph automatically", status: "✅ Active" },
              ].map(f => (
                <div key={f.feature} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-green-600 font-medium w-4">{f.status.split(" ")[0]}</span>
                  <div>
                    <div className="font-medium text-gray-900">{f.feature}</div>
                    <div className="text-gray-500 text-xs mt-0.5">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={fetchHealth} disabled={healthLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
            {healthLoading ? "Checking..." : "🔄 Refresh Status"}
          </button>
        </div>
      )}

      {/* ── Proxy Detection Tab ─────────────────────────────────────────────── */}
      {tab === "proxy" && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 mb-1">Proxy Attendance Detection</h3>
            <p className="text-sm text-gray-500 mb-4">Enter a Class ID to find students who may have used proxy attendance (low face confidence or GPS anomalies)</p>
            <div className="flex gap-3">
              <input value={classId} onChange={e => setClassId(e.target.value)} placeholder="Enter Class ID (e.g. 1)"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <button onClick={runProxyDetection} disabled={proxyLoading}
                className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {proxyLoading ? "Analysing..." : "🕵️ Detect Proxies"}
              </button>
            </div>
          </div>

          {proxyData && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Results for Class #{classId}</h3>
                <div className="flex gap-2 text-xs">
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded">{proxyData.total_present} present</span>
                  <span className={`px-2 py-1 rounded ${proxyData.local_suspects.length ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                    {proxyData.local_suspects.length} suspects
                  </span>
                  <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded">Source: {proxyData.analysis_source}</span>
                </div>
              </div>

              {proxyData.local_suspects.length === 0 ? (
                <div className="text-center py-8 text-green-600">✅ No proxy suspects detected for this class</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 text-left text-gray-600">
                      <th className="px-3 py-2 rounded-tl-lg">Student</th>
                      <th className="px-3 py-2">Face Confidence</th>
                      <th className="px-3 py-2">GPS Distance</th>
                      <th className="px-3 py-2">Risk</th>
                      <th className="px-3 py-2 rounded-tr-lg">Flags</th>
                    </tr></thead>
                    <tbody>{proxyData.local_suspects.map((s, i) => (
                      <tr key={s.student_id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-3 py-2 font-medium">{s.name}<div className="text-xs text-gray-400">{s.roll_no}</div></td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-1.5"><div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.round((s.face_confidence || 0) * 100)}%` }} /></div>
                            <span>{s.face_confidence ? Math.round(s.face_confidence * 100) + "%" : "N/A"}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">{s.gps_distance_m ? Math.round(s.gps_distance_m) + "m" : "N/A"}</td>
                        <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badge(s.risk_level)}`}>{s.risk_level}</span></td>
                        <td className="px-3 py-2 text-xs text-gray-500">{s.flags?.join(", ")}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Attendance Pattern Tab ──────────────────────────────────────────── */}
      {tab === "pattern" && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 mb-1">Student Attendance Pattern</h3>
            <p className="text-sm text-gray-500 mb-4">Graph-powered analysis of subject-wise trends and consecutive absence streaks</p>
            <div className="flex gap-3">
              <input value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="Enter Student ID (e.g. 1)"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <button onClick={runPattern} disabled={patternLoading}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {patternLoading ? "Analysing..." : "📈 Analyse Pattern"}
              </button>
            </div>
          </div>

          {patternData && (
            <div className="space-y-4">
              {patternData.alert && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 font-medium text-sm">{patternData.alert}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-orange-600">{patternData.consecutive_absences_now}</div>
                  <div className="text-sm text-gray-500 mt-1">Current Consecutive Absences</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-red-600">{patternData.max_consecutive_absences}</div>
                  <div className="text-sm text-gray-500 mt-1">Max Consecutive Absences (all time)</div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Subject-wise Breakdown</h3>
                {Object.entries(patternData.subject_summary || {}).length === 0 ? (
                  <div className="text-gray-400 text-sm text-center py-4">No attendance data found</div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(patternData.subject_summary || {}).map(([subj, s]) => (
                      <div key={subj} className="flex items-center gap-4">
                        <div className="w-36 text-sm font-medium text-gray-700 truncate">{subj}</div>
                        <div className="flex-1 bg-gray-100 rounded-full h-3 relative">
                          <div className={`h-3 rounded-full transition-all ${s.percentage >= 75 ? "bg-green-500" : s.percentage >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
                            style={{ width: `${s.percentage}%` }} />
                        </div>
                        <div className="w-12 text-sm font-semibold text-right">{s.percentage}%</div>
                        <div className="text-xs text-gray-400">{s.present}/{s.total}</div>
                        {s.below_75 && <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">⚠️ &lt;75%</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Low Attendance Tab ──────────────────────────────────────────────── */}
      {tab === "low" && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 mb-1">Low Attendance Students</h3>
            <p className="text-sm text-gray-500 mb-4">Find students in a batch who are below the attendance threshold</p>
            <div className="flex gap-3 flex-wrap">
              <input value={batch} onChange={e => setBatch(e.target.value)} placeholder="Batch (e.g. BCA-2024)"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <input value={threshold} onChange={e => setThreshold(e.target.value)} placeholder="Threshold %" type="number" min="0" max="100"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <button onClick={runLowAttendance} disabled={lowLoading}
                className="px-5 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
                {lowLoading ? "Searching..." : "⚠️ Find Students"}
              </button>
            </div>
          </div>

          {lowData && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex gap-3">
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">🔴 Critical: {lowData.critical_count}</span>
                <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold">🟡 Warning: {lowData.warning_count}</span>
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">Total: {lowData.pg_students.length}</span>
              </div>

              {lowData.pg_students.length === 0 ? (
                <div className="text-center py-8 text-green-600">✅ All students in this batch are above {threshold}%</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 text-left text-gray-600">
                      <th className="px-3 py-2 rounded-tl-lg">Student</th>
                      <th className="px-3 py-2">Batch / Section</th>
                      <th className="px-3 py-2">Attendance</th>
                      <th className="px-3 py-2">Present / Total</th>
                      <th className="px-3 py-2 rounded-tr-lg">Status</th>
                    </tr></thead>
                    <tbody>{lowData.pg_students.sort((a, b) => a.attendance_pct - b.attendance_pct).map((s, i) => (
                      <tr key={s.student_id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-3 py-2 font-medium">{s.name}<div className="text-xs text-gray-400">{s.roll_no}</div></td>
                        <td className="px-3 py-2 text-gray-500">{s.batch} / {s.section || "—"}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${s.attendance_pct < 60 ? "bg-red-500" : s.attendance_pct < 75 ? "bg-orange-500" : "bg-green-500"}`}
                                style={{ width: `${s.attendance_pct}%` }} />
                            </div>
                            <span className="font-semibold">{s.attendance_pct}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-500">{s.present_count} / {s.total_count}</td>
                        <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badge(s.risk)}`}>{s.risk}</span></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
