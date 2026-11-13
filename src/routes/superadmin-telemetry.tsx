import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { isSuperAdminUser } from "@/lib/mock-data";
import { telemetryApi } from "@/api";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Globe,
  Smartphone,
  Play,
  Pause,
  RefreshCw,
  ShieldAlert,
  Zap,
  Server,
  Layers,
  Search,
  Check,
  Building,
  ChevronLeft,
  ChevronRight,
  Filter,
  Code2,
  Terminal,
  Copy,
  PlayCircle,
  Send,
  Sparkles,
  User as UserIcon,
  Radio,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/superadmin-telemetry")({
  component: SuperAdminTelemetryPage,
});

type MainTab = "anomaly" | "catalog" | "traces";
type PlatformTab = "ALL" | "WEB" | "MOBILE";
type StatusFilter = "ALL" | "ACTIVE" | "UNTESTED" | "ANOMALOUS";

function SuperAdminTelemetryPage() {
  const { user, init } = useAuth();
  const isSuperAdmin = isSuperAdminUser(user);

  // Active Main Navigation Tab
  const [activeTab, setActiveTab] = useState<MainTab>("anomaly");

  // Tab 1: Predictive Anomaly States
  const [platform, setPlatform] = useState<PlatformTab>("ALL");
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(2); // 2-second high-resolution refresh
  const [countdown, setCountdown] = useState<number>(2);
  const [runningCanary, setRunningCanary] = useState<boolean>(false);
  const [canaryResult, setCanaryResult] = useState<any>(null);
  const [proberActive, setProberActive] = useState<boolean>(true);
  const [hideHeartbeats, setHideHeartbeats] = useState<boolean>(true);

  // Tab 2: API Catalog & Live Sandbox States
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [moduleFilter, setModuleFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 30;

  // Live Sandbox Executor States
  const [sandboxMethod, setSandboxMethod] = useState<string>("GET");
  const [sandboxEndpoint, setSandboxEndpoint] = useState<string>("/api/employees/");
  const [sandboxTenant, setSandboxTenant] = useState<string>("all");
  const [sandboxPayload, setSandboxPayload] = useState<string>("{\n  \n}");
  const [executingSandbox, setExecutingSandbox] = useState<boolean>(false);
  const [sandboxResponse, setSandboxResponse] = useState<any>(null);

  // Tab 3: Live Request Traces States
  const [tracesData, setTracesData] = useState<any>(null);
  const [loadingTraces, setLoadingTraces] = useState<boolean>(false);
  const [tracesLevelFilter, setTracesLevelFilter] = useState<string>("ALL");
  const [tracesPlatformFilter, setTracesPlatformFilter] = useState<string>("ALL");
  const [tracesTenantFilter, setTracesTenantFilter] = useState<string>("all");
  const [tracesSearch, setTracesSearch] = useState<string>("");
  const [tracesPage, setTracesPage] = useState<number>(1);
  const [selectedTrace, setSelectedTrace] = useState<any>(null);

  // Full API Catalog (loaded on demand for Tab 2)
  const [catalogEndpoints, setCatalogEndpoints] = useState<any[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState<boolean>(false);

  // Stable ref for query filters to prevent interval reset / dropped ticks
  const filtersRef = useRef({
    platform,
    tenantFilter,
    tracesTenantFilter,
    tracesLevelFilter,
    tracesPlatformFilter,
    tracesSearch,
    hideHeartbeats,
    tracesPage,
  });

  useEffect(() => {
    filtersRef.current = {
      platform,
      tenantFilter,
      tracesTenantFilter,
      tracesLevelFilter,
      tracesPlatformFilter,
      tracesSearch,
      hideHeartbeats,
      tracesPage,
    };
  }, [
    platform,
    tenantFilter,
    tracesTenantFilter,
    tracesLevelFilter,
    tracesPlatformFilter,
    tracesSearch,
    hideHeartbeats,
    tracesPage,
  ]);

  // Robust Concurrent Polling Flag
  const isPollingRef = useRef<boolean>(false);

  // Stable Unified Real-Time Poller (Parallel Promises, Stable Closure)
  const pollAllTelemetry = useCallback(
    async (showToast: boolean = false) => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;
      try {
        const f = filtersRef.current;
        const [overviewRes, tracesRes] = await Promise.all([
          telemetryApi.getOverview(f.platform, f.tenantFilter),
          telemetryApi.getLiveTraces({
            tenant: f.tracesTenantFilter,
            level: f.tracesLevelFilter,
            platform: f.tracesPlatformFilter,
            search: f.tracesSearch,
            hideHeartbeats: f.hideHeartbeats,
            page: f.tracesPage,
            pageSize: 30,
          }),
        ]);

        if (overviewRes) {
          setData(overviewRes);
          if (overviewRes?.proberActive !== undefined) {
            setProberActive(overviewRes.proberActive);
          }
        }
        if (tracesRes) {
          setTracesData(tracesRes);
        }

        if (showToast) toast.success("Real-time telemetry refreshed");
      } catch (err: any) {
        if (showToast) toast.error(err.message || "Failed to load telemetry");
      } finally {
        isPollingRef.current = false;
        setLoading(false);
        setLoadingTraces(false);
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    setLoading(true);
    pollAllTelemetry();
  }, [pollAllTelemetry]);

  // Immediate refresh on filter changes
  useEffect(() => {
    pollAllTelemetry();
  }, [platform, tenantFilter, hideHeartbeats, tracesTenantFilter, tracesLevelFilter, tracesPlatformFilter, tracesSearch, tracesPage, pollAllTelemetry]);

  // Periodic Auto-refresh Timer Loop (pure countdown + dedicated poll interval)
  useEffect(() => {
    if (refreshInterval <= 0) return;
    setCountdown(refreshInterval);

    // 1. Visual Countdown Timer (pure state update, NO SIDE EFFECTS)
    const countdownTimer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? refreshInterval : prev - 1));
    }, 1000);

    // 2. Scheduled poll trigger (fires cleanly every refreshInterval seconds)
    const networkTimer = setInterval(() => {
      pollAllTelemetry();
    }, refreshInterval * 1000);

    return () => {
      clearInterval(countdownTimer);
      clearInterval(networkTimer);
    };
  }, [refreshInterval, pollAllTelemetry]);

  // Immediate refresh when tab regains focus or becomes visible
  useEffect(() => {
    const handleFocus = () => {
      setCountdown(refreshInterval);
      pollAllTelemetry();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setCountdown(refreshInterval);
        pollAllTelemetry();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshInterval, pollAllTelemetry]);

  // Load Full Catalog on Demand for Tab 2
  useEffect(() => {
    if (activeTab === "catalog" && catalogEndpoints.length === 0) {
      setLoadingCatalog(true);
      telemetryApi
        .getEndpointsCatalog()
        .then((res) => {
          if (Array.isArray(res)) setCatalogEndpoints(res);
        })
        .catch(() => {})
        .finally(() => setLoadingCatalog(false));
    }
  }, [activeTab, catalogEndpoints.length]);

  // Prober Toggle
  const handleToggleProber = async () => {
    try {
      const next = !proberActive;
      const res = await telemetryApi.toggleProber(next);
      setProberActive(res.active);
      toast.success(res.active ? "Autonomous 5s Prober Activated" : "Autonomous Prober Paused");
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle prober");
    }
  };

  // Run Synthetic Canary Across Tenants
  const handleRunCanary = async () => {
    setRunningCanary(true);
    try {
      const report = await telemetryApi.runSyntheticProbe();
      setCanaryResult(report);
      toast.success(
        `Synthetic Canary completed! ${report.passed || 0}/${report.probesExecuted || 0} probes passed across tenants.`
      );
      pollAllTelemetry();
    } catch (err: any) {
      toast.error(`Canary failed: ${err.message || String(err)}`);
    } finally {
      setRunningCanary(false);
    }
  };

  // Simulate Anomaly
  const handleSimulateAnomaly = async (type: string) => {
    try {
      await telemetryApi.simulateAnomaly(
        type,
        type === "LATENCY_SPIKE"
          ? "/api/payroll/calculate-arrears/"
          : type === "N_PLUS_ONE_SURGE"
          ? "/api/employees/"
          : "/api/attendance/punch/",
        platform === "MOBILE" ? "MOBILE" : "WEB"
      );
      toast.warning(`Simulated ${type.replace(/_/g, " ")} injected into active alerts!`);
      pollAllTelemetry();
    } catch (err: any) {
      toast.error(err.message || "Failed to simulate anomaly");
    }
  };

  // Resolve Anomaly
  const handleResolveAnomaly = async (anomalyId: string) => {
    try {
      await telemetryApi.resolveAnomaly(anomalyId);
      toast.success("Anomaly resolved and cleared");
      pollAllTelemetry();
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve anomaly");
    }
  };

  // Execute Live Sandbox Test
  const handleExecuteSandbox = async () => {
    setExecutingSandbox(true);
    try {
      let parsed = {};
      if (sandboxPayload.trim()) {
        try {
          parsed = JSON.parse(sandboxPayload);
        } catch {
          toast.error("Invalid JSON format in payload");
          setExecutingSandbox(false);
          return;
        }
      }
      const res = await telemetryApi.executeSandboxTest(
        sandboxMethod,
        sandboxEndpoint,
        parsed,
        sandboxTenant
      );
      setSandboxResponse(res);
      toast.success(`Live Sandbox executed: HTTP ${res.statusCode} in ${res.durationMs}ms`);
      pollAllTelemetry();
    } catch (err: any) {
      toast.error(err.message || "Execution failed");
    } finally {
      setExecutingSandbox(false);
    }
  };

  // Quick fill sandbox from catalog table
  const handleSelectEndpointForSandbox = (method: string, endpoint: string) => {
    setSandboxMethod(method);
    setSandboxEndpoint(endpoint);
    setActiveTab("catalog");
    toast.info(`Loaded ${method} ${endpoint} into Live Sandbox`);
    setTimeout(() => {
      document.getElementById("live-sandbox-panel")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Telemetry Summary Computations
  const summary = data || {};
  const healthScore = summary.platformHealthScore ?? 100;
  const p95Latency = summary.globalP95Latency ?? 0;
  const totalCalls = summary.totalRequestsProfiled ?? 0;
  const anomalies = summary.activeAnomalies || [];
  const rawEndpoints = catalogEndpoints.length > 0 ? catalogEndpoints : summary.endpoints || [];
  const totalRegistered = summary.totalEndpointsRegistered || rawEndpoints.length || 488;
  const activeCount = summary.totalEndpointsActive || rawEndpoints.filter((e: any) => e.count > 0).length;
  const untestedCount = Math.max(0, totalRegistered - activeCount);
  const platformSummary = summary.platformSummary || { web: { requests: 0 }, mobile: { requests: 0 } };
  const tenants = summary.tenantBreakdown || [];

  // Recent Live Traces for Tab 1 Stream (binds to full live traces stream + overview fallback)
  const liveStreamTraces = useMemo(() => {
    if (tracesData?.traces && Array.isArray(tracesData.traces) && tracesData.traces.length > 0) {
      return tracesData.traces;
    }
    const rawRecent = summary.recentTraces || [];
    if (hideHeartbeats) {
      return rawRecent.filter((t: any) => !t.isHeartbeat);
    }
    return rawRecent;
  }, [tracesData, summary.recentTraces, hideHeartbeats]);

  const criticalAnomalies = anomalies.filter((a: any) => a.severity === "CRITICAL");
  const warningAnomalies = anomalies.filter((a: any) => a.severity !== "CRITICAL");

  // Filtered Endpoints for Tab 2
  const filteredEndpoints = useMemo(() => {
    return rawEndpoints.filter((ep: any) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          ep.endpoint.toLowerCase().includes(q) ||
          ep.method.toLowerCase().includes(q) ||
          (ep.viewName && ep.viewName.toLowerCase().includes(q)) ||
          (ep.fileSource && ep.fileSource.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (statusFilter === "ACTIVE" && ep.count === 0) return false;
      if (statusFilter === "UNTESTED" && ep.count > 0) return false;
      if (statusFilter === "ANOMALOUS" && (ep.health === "healthy" || ep.health === "untested")) return false;
      if (methodFilter !== "ALL" && ep.method !== methodFilter) return false;
      if (moduleFilter !== "ALL" && !ep.endpoint.includes(`/${moduleFilter}/`)) return false;

      return true;
    });
  }, [rawEndpoints, searchQuery, statusFilter, methodFilter, moduleFilter]);

  // Catalog Pagination
  const totalPages = Math.ceil(filteredEndpoints.length / pageSize) || 1;
  const paginatedEndpoints = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEndpoints.slice(start, start + pageSize);
  }, [filteredEndpoints, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, methodFilter, moduleFilter, platform]);

  if (!init) return null;
  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* =========================================================================
          TOP PILL TABS NAVIGATION BAR (Clean 3 Pillars for HRMS)
          ========================================================================= */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-card border border-border rounded-full shadow-sm">
        {/* Tab 1: Predictive Anomaly & Failure Prevention */}
        <button
          onClick={() => setActiveTab("anomaly")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
            activeTab === "anomaly"
              ? "bg-purple-600 text-white shadow-md"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <Sparkles className="w-4 h-4 shrink-0 text-amber-300" />
          <span>Predictive Anomaly &amp; Failure Prevention</span>
          {anomalies.length > 0 && (
            <span className="ml-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {anomalies.length}
            </span>
          )}
        </button>

        {/* Tab 2: 100% Backend API Catalog & Live Sandbox */}
        <button
          onClick={() => setActiveTab("catalog")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
            activeTab === "catalog"
              ? "bg-purple-600 text-white shadow-md"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <Code2 className="w-4 h-4 shrink-0 text-blue-400" />
          <span>100% Backend API Catalog &amp; Live Sandbox ({totalRegistered})</span>
        </button>

        {/* Tab 3: Live Request Traces & Multi-Tenant Audit Logs */}
        <button
          onClick={() => setActiveTab("traces")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
            activeTab === "traces"
              ? "bg-purple-600 text-white shadow-md"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <Terminal className="w-4 h-4 shrink-0 text-cyan-400" />
          <span>Live Request Traces &amp; Multi-Tenant Audit Logs</span>
          <span className="ml-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-emerald-500/30">
            {tracesData?.total ?? 0}
          </span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: PREDICTIVE ANOMALY & FAILURE PREVENTION + REALTIME API STREAM
          ========================================================================= */}
      {activeTab === "anomaly" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-2xl shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Activity className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Autonomous Failure Prevention Engine</h1>
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 gap-1.5 py-0.5 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                      LIVE TRACKING
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Proactive 5-second synthetic probing &bull; Z-score statistical anomaly detection ($Z &gt; 2.5\sigma$) &bull; Real-time multi-tenant traffic monitoring
                  </p>
                </div>
              </div>
            </div>

            {/* Actions & Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Platform Segregation Tabs */}
              <div className="flex items-center p-1 bg-muted rounded-xl border border-border text-xs font-medium">
                <button
                  onClick={() => setPlatform("ALL")}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    platform === "ALL"
                      ? "bg-background text-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>All Traffic</span>
                </button>
                <button
                  onClick={() => setPlatform("WEB")}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    platform === "WEB"
                      ? "bg-background text-indigo-400 shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Web API</span>
                </button>
                <button
                  onClick={() => setPlatform("MOBILE")}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    platform === "MOBILE"
                      ? "bg-background text-emerald-400 shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile API</span>
                </button>
              </div>

              {/* 5s Autonomous Prober Toggle */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleToggleProber}
                className={`h-9 text-xs font-semibold gap-1.5 ${
                  proberActive ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/5" : "text-muted-foreground"
                }`}
                title="Toggles the 5-second background daemon prober"
              >
                <span className={`w-2 h-2 rounded-full ${proberActive ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"}`} />
                <span>5s Prober: {proberActive ? "ACTIVE" : "PAUSED"}</span>
              </Button>

              {/* Auto-Refresh Timer Countdown */}
              <div className="flex items-center gap-1.5 bg-muted px-2.5 py-1.5 rounded-xl border border-border text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>
                  {refreshInterval > 0 ? (
                    <>Poll in <strong className="font-mono text-foreground">{countdown}s</strong></>
                  ) : (
                    "Paused"
                  )}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 ml-0.5 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    if (refreshInterval > 0) {
                      setRefreshInterval(0);
                    } else {
                      setRefreshInterval(2);
                      setCountdown(2);
                    }
                  }}
                  title={refreshInterval > 0 ? "Pause automatic polling" : "Resume 2s live polling"}
                >
                  {refreshInterval > 0 ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 text-emerald-400" />}
                </Button>
              </div>

              {/* Simulate Anomaly Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs font-semibold border-amber-500/40 text-amber-400 hover:bg-amber-500/10">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Simulate Anomaly</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 text-xs font-medium">
                  <DropdownMenuItem onClick={() => handleSimulateAnomaly("LATENCY_SPIKE")} className="gap-2 cursor-pointer">
                    <span className="text-red-400 font-bold">⚡</span> Latency Spike (Z &gt; 5.4σ)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSimulateAnomaly("N_PLUS_ONE_SURGE")} className="gap-2 cursor-pointer">
                    <span className="text-amber-400 font-bold">🔁</span> N+1 Query Surge (48 queries)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSimulateAnomaly("SERVER_EXCEPTION_5XX")} className="gap-2 cursor-pointer">
                    <span className="text-red-500 font-bold">💥</span> 5xx Crash (OperationalError)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Run Synthetic Canary */}
              <Button
                size="sm"
                onClick={handleRunCanary}
                disabled={runningCanary}
                className="h-9 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold gap-1.5 shadow-sm"
              >
                <Zap className={`w-3.5 h-3.5 ${runningCanary ? "animate-spin text-amber-300" : ""}`} />
                <span>{runningCanary ? "Running Canary..." : "Run Synthetic Canary"}</span>
              </Button>
            </div>
          </div>

          {/* Top Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Platform Health Score */}
            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Platform Health Score
                </CardTitle>
                <ShieldAlert
                  className={`w-4 h-4 ${
                    healthScore >= 90 ? "text-emerald-400" : healthScore >= 70 ? "text-amber-400" : "text-red-400"
                  }`}
                />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-3xl font-bold tracking-tight font-mono ${
                      healthScore >= 90 ? "text-emerald-400" : healthScore >= 70 ? "text-amber-400" : "text-red-400"
                    }`}
                  >
                    {healthScore}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {healthScore >= 90 ? "Optimal" : healthScore >= 70 ? "Degraded" : "Critical"}
                  </span>
                </div>
                <div className="mt-2.5 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      healthScore >= 90 ? "bg-emerald-500" : healthScore >= 70 ? "bg-amber-500" : "bg-red-500"
                    }`}
                    style={{ width: `${healthScore}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Card 2: P95 Tail Latency */}
            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  P95 Tail Latency
                </CardTitle>
                <Clock className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight font-mono">
                    {p95Latency}
                    <span className="text-sm font-normal text-muted-foreground ml-1">ms</span>
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      p95Latency < 250
                        ? "border-emerald-500/30 text-emerald-400"
                        : p95Latency < 600
                        ? "border-amber-500/30 text-amber-400"
                        : "border-red-500/30 text-red-400"
                    }`}
                  >
                    Target &lt;250ms
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Baseline window: 100 requests per endpoint
                </p>
              </CardContent>
            </Card>

            {/* Card 3: Active Anomalies Counter */}
            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Active Anomalies
                </CardTitle>
                <AlertTriangle className={`w-4 h-4 ${anomalies.length > 0 ? "text-amber-400" : "text-emerald-400"}`} />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-3xl font-bold tracking-tight font-mono ${
                      anomalies.length > 0 ? "text-amber-400" : "text-foreground"
                    }`}
                  >
                    {anomalies.length}
                  </span>
                  <div className="flex gap-1">
                    {criticalAnomalies.length > 0 && (
                      <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                        {criticalAnomalies.length} Critical
                      </Badge>
                    )}
                    {warningAnomalies.length > 0 && (
                      <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[10px] py-0 px-1.5">
                        {warningAnomalies.length} Warning
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {anomalies.length === 0 ? "Zero active statistical outliers" : "Immediate triage recommended"}
                </p>
              </CardContent>
            </Card>

            {/* Card 4: Total Profiled Requests */}
            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Profiled Requests
                </CardTitle>
                <Server className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight font-mono">{totalCalls.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">calls</span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3 text-indigo-400" /> Web:{" "}
                    <strong className="text-foreground">{platformSummary.web?.requests || 0}</strong>
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-emerald-400" /> Mobile:{" "}
                    <strong className="text-foreground">{platformSummary.mobile?.requests || 0}</strong>
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* =====================================================================
              FEATURE: LIVE REAL-TIME API ACTIVITY & REQUEST STREAM (ON TAB 1)
              ===================================================================== */}
          <Card className="border border-border shadow-md">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <CardTitle className="text-base font-bold">
                      Live Real-Time API Stream &amp; Tenant Activity
                    </CardTitle>
                    <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                      STREAMING
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Intercepts incoming API requests across all logged-in users and browsers in real time.
                  </CardDescription>
                </div>

                {/* Filter Heartbeats Toggle */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setHideHeartbeats(!hideHeartbeats)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                      hideHeartbeats
                        ? "bg-purple-600 text-white border-purple-500 shadow-sm"
                        : "bg-muted text-muted-foreground border-border hover:text-foreground"
                    }`}
                    title="Filters out repetitive background notification polling to highlight real user actions"
                  >
                    <span>{hideHeartbeats ? "✓ Filter Background Heartbeats" : "Show All Requests"}</span>
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => pollAllTelemetry(true)}
                    className="h-8 text-xs gap-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                    <span>Refresh</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-2.5 px-4 text-left">Time</th>
                      <th className="py-2.5 px-3 text-center">Platform</th>
                      <th className="py-2.5 px-3 text-left">Method</th>
                      <th className="py-2.5 px-4 text-left">API Endpoint</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Duration</th>
                      <th className="py-2.5 px-3 text-right">DB Queries</th>
                      <th className="py-2.5 px-4 text-left">Actor / User</th>
                      <th className="py-2.5 px-4 text-left">Tenant</th>
                      <th className="py-2.5 px-3 text-center">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-mono">
                    {liveStreamTraces.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-muted-foreground font-sans text-xs">
                          No recent non-heartbeat requests. Actions performed in other browsers will appear here instantaneously.
                        </td>
                      </tr>
                    ) : (
                      liveStreamTraces.slice(0, 15).map((t: any) => (
                        <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2 px-4 text-muted-foreground text-[11px] whitespace-nowrap">
                            {t.timestamp ? t.timestamp.split("T")[1]?.replace("Z", "") : "Now"}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Badge variant="outline" className="text-[9px]">
                              {t.platform === "MOBILE" ? (
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                  <Smartphone className="w-2.5 h-2.5" /> MOB
                                </span>
                              ) : (
                                <span className="text-indigo-400 font-bold flex items-center gap-1">
                                  <Globe className="w-2.5 h-2.5" /> WEB
                                </span>
                              )}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 font-bold">
                            <span
                              className={
                                t.method === "GET"
                                  ? "text-blue-400"
                                  : t.method === "POST"
                                  ? "text-emerald-400"
                                  : t.method === "PATCH"
                                  ? "text-amber-400"
                                  : "text-purple-400"
                              }
                            >
                              {t.method}
                            </span>
                          </td>
                          <td className="py-2 px-4 text-foreground font-medium truncate max-w-[240px]" title={t.endpoint}>
                            {t.endpoint}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold ${
                                t.statusCode < 400
                                  ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                                  : t.statusCode < 500
                                  ? "border-amber-500/30 text-amber-400 bg-amber-500/10"
                                  : "border-red-500/30 text-red-400 bg-red-500/10"
                              }`}
                            >
                              {t.statusCode}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-foreground">
                            {t.durationMs}ms
                          </td>
                          <td className="py-2 px-3 text-right text-muted-foreground">
                            {t.queryCount}
                          </td>
                          <td className="py-2 px-4 text-foreground font-sans text-xs">
                            <div className="flex items-center gap-1.5">
                              <UserIcon className="w-3 h-3 text-primary shrink-0" />
                              <span className="font-semibold truncate max-w-[150px]" title={t.actorEmail}>
                                {t.actorEmail && t.actorEmail !== "anonymous" ? t.actorEmail : "anonymous"}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-4 text-muted-foreground font-sans text-[11px]">
                            {t.tenantId}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedTrace(t)}
                              className="h-6 text-[11px] px-2 text-cyan-400 hover:bg-cyan-500/10 font-sans font-semibold"
                            >
                              <Eye className="w-3 h-3 mr-0.5" />
                              <span>Inspect</span>
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Active Anomalies Feed */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>Active Anomalies &amp; Prescriptions ({anomalies.length})</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Live outlier alerts detected via rolling Z-score and database execution tracing.
                  </CardDescription>
                </div>
                {anomalies.length > 0 && (
                  <Badge variant="outline" className="text-xs font-mono">
                    {anomalies.length} to resolve
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {anomalies.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-xs space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-foreground text-sm">All Monitored Endpoints Healthy</p>
                  <p>Zero active latency spikes, query surges, or unhandled exceptions detected.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {anomalies.map((anom: any) => (
                    <div
                      key={anom.id}
                      className={`p-4 rounded-xl border transition-all ${
                        anom.severity === "CRITICAL"
                          ? "bg-red-500/5 border-red-500/30"
                          : "bg-amber-500/5 border-amber-500/30"
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <Badge
                              variant={anom.severity === "CRITICAL" ? "destructive" : "outline"}
                              className={`text-[10px] font-bold ${
                                anom.severity !== "CRITICAL" ? "border-amber-500/40 text-amber-400 bg-amber-500/10" : ""
                              }`}
                            >
                              {anom.severity}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] bg-background">
                              {anom.platform === "MOBILE" ? (
                                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                                  <Smartphone className="w-3 h-3" /> MOBILE
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-indigo-400 font-semibold">
                                  <Globe className="w-3 h-3" /> WEB
                                </span>
                              )}
                            </Badge>
                            <span className="font-mono font-bold text-foreground">
                              {anom.method} {anom.endpoint}
                            </span>
                            <span className="text-muted-foreground">&bull;</span>
                            <span className="text-muted-foreground text-[11px]">{anom.timestamp}</span>
                            {anom.tenantId && (
                              <Badge variant="secondary" className="text-[10px]">
                                Tenant: {anom.tenantId}
                              </Badge>
                            )}
                          </div>

                          <p className="text-xs text-foreground font-medium leading-relaxed">
                            <strong className="text-amber-400">Diagnosis:</strong> {anom.diagnosis}
                          </p>

                          <div className="text-xs text-muted-foreground bg-background/80 p-2.5 rounded-lg border border-border/60 flex items-start gap-2">
                            <Zap className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-foreground">Prescription:</strong> {anom.prescription}
                              {anom.fileSource && anom.fileSource !== "N/A" && (
                                <div className="mt-1 font-mono text-[11px] text-primary">
                                  Location: {anom.fileSource}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResolveAnomaly(anom.id)}
                            className="h-8 text-xs font-semibold gap-1 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30"
                          >
                            <Check className="w-3 h-3" />
                            <span>Resolve</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Multi-Tenant Activity Breakdown Table */}
          {tenants.length > 0 && (
            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Building className="w-4 h-4 text-primary" />
                  <span>Multi-Tenant Profiling Breakdown</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Segmented traffic, error rates, and average latencies across registered organizations.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                      <tr>
                        <th className="py-2.5 px-4 text-left">Tenant ID</th>
                        <th className="py-2.5 px-4 text-right">Profiled Calls</th>
                        <th className="py-2.5 px-4 text-right">Errors</th>
                        <th className="py-2.5 px-4 text-right">Error Rate</th>
                        <th className="py-2.5 px-4 text-right">Avg Latency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 font-mono">
                      {tenants.map((t: any) => (
                        <tr key={t.tenantId} className="hover:bg-muted/30">
                          <td className="py-2.5 px-4 font-bold text-foreground">{t.tenantId}</td>
                          <td className="py-2.5 px-4 text-right">{t.requests}</td>
                          <td className="py-2.5 px-4 text-right text-red-400">{t.errors}</td>
                          <td className="py-2.5 px-4 text-right">{t.errorRate}%</td>
                          <td className="py-2.5 px-4 text-right">{t.avgLatency}ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: 100% BACKEND API CATALOG & LIVE SANDBOX MATRIX
          ========================================================================= */}
      {activeTab === "catalog" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-5 rounded-2xl shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Code2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">100% Backend API Catalog &amp; Live Sandbox</h1>
                    <Badge variant="outline" className="font-mono text-xs">
                      {totalRegistered} Registered APIs
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Runtime URL introspection &bull; Python inspect static checks (Auth, CSRF, Atomic, Lines) &bull; Embedded Live Sandbox Executor
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={loadingCatalog}
                onClick={() => {
                  setLoadingCatalog(true);
                  telemetryApi
                    .getEndpointsCatalog()
                    .then((res) => {
                      if (Array.isArray(res)) setCatalogEndpoints(res);
                      toast.success("API catalog refreshed");
                    })
                    .catch(() => toast.error("Failed to refresh catalog"))
                    .finally(() => setLoadingCatalog(false));
                }}
                className="h-9 gap-1.5 text-xs font-semibold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingCatalog ? "animate-spin" : ""}`} />
                <span>Refresh Catalog</span>
              </Button>
            </div>
          </div>

          {/* Catalog Table Card */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Server className="w-4 h-4 text-primary" />
                      <span>Registered Endpoints Matrix</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {filteredEndpoints.length} of {totalRegistered} Matching
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Filter by HTTP method, module, or status &bull; Click "Test in Sandbox" on any endpoint to execute a synthetic test.
                    </CardDescription>
                  </div>

                  {/* Search Input */}
                  <div className="w-full sm:w-72 relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search endpoint, method, view, source..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 pl-8 text-xs bg-muted/50 font-mono"
                    />
                  </div>
                </div>

                {/* Filter Pills Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40 text-xs">
                  {/* Status Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Filter className="w-3 h-3" /> Status:
                    </span>
                    <div className="flex gap-1 bg-muted/80 p-0.5 rounded-lg border border-border">
                      {(["ALL", "ACTIVE", "UNTESTED", "ANOMALOUS"] as StatusFilter[]).map((st) => (
                        <button
                          key={st}
                          onClick={() => setStatusFilter(st)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                            statusFilter === st
                              ? "bg-background text-foreground shadow-sm font-bold"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {st === "ALL"
                            ? `All (${totalRegistered})`
                            : st === "ACTIVE"
                            ? `Active (${activeCount})`
                            : st === "UNTESTED"
                            ? `Untested (${untestedCount})`
                            : "Anomalous"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Method Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Method:
                    </span>
                    <div className="flex gap-1 bg-muted/80 p-0.5 rounded-lg border border-border">
                      {["ALL", "GET", "POST", "PATCH", "DELETE", "PUT"].map((m) => (
                        <button
                          key={m}
                          onClick={() => setMethodFilter(m)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
                            methodFilter === m
                              ? "bg-background text-foreground shadow-sm font-bold"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Module Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Module:
                    </span>
                    <select
                      value={moduleFilter}
                      onChange={(e) => setModuleFilter(e.target.value)}
                      className="bg-muted border border-border rounded-lg text-[11px] font-medium h-7 px-2 text-foreground"
                    >
                      <option value="ALL">All Modules</option>
                      <option value="organisation">Organisation</option>
                      <option value="employees">Employees</option>
                      <option value="attendance">Attendance</option>
                      <option value="leaves">Leaves</option>
                      <option value="payroll">Payroll</option>
                      <option value="announcements">Announcements</option>
                      <option value="admin_org">Admin Org</option>
                      <option value="reports">Reports</option>
                      <option value="auth">Auth</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Method</th>
                      <th className="py-2.5 px-3 text-left">Canonical Endpoint Path</th>
                      <th className="py-2.5 px-2 text-center">Auth</th>
                      <th className="py-2.5 px-2 text-center">CSRF</th>
                      <th className="py-2.5 px-2 text-center">Atomic</th>
                      <th className="py-2.5 px-2 text-center">Complexity</th>
                      <th className="py-2.5 px-3 text-right">Calls</th>
                      <th className="py-2.5 px-3 text-right">P95</th>
                      <th className="py-2.5 px-3 text-right">DB Queries</th>
                      <th className="py-2.5 px-3 text-center">Health</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {paginatedEndpoints.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-10 text-center text-muted-foreground">
                          No APIs matching the selected criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedEndpoints.map((ep: any) => (
                        <tr key={ep.key} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2 px-3">
                            <Badge
                              variant="outline"
                              className={`font-mono text-[10px] font-bold ${
                                ep.method === "GET"
                                  ? "text-blue-400 border-blue-500/30 bg-blue-500/10"
                                  : ep.method === "POST"
                                  ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                                  : ep.method === "PATCH"
                                  ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
                                  : ep.method === "PUT"
                                  ? "text-purple-400 border-purple-500/30 bg-purple-500/10"
                                  : "text-red-400 border-red-500/30 bg-red-500/10"
                              }`}
                            >
                              {ep.method}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 font-mono font-medium text-foreground">
                            {ep.endpoint}
                            {ep.fileSource && (
                              <div className="text-[10px] text-muted-foreground/70 truncate max-w-[280px]">
                                {ep.fileSource}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {ep.hasAuthRequired ? (
                              <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                                Required
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">Public</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {ep.isCsrfExempt ? (
                              <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400">
                                Exempt
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400">
                                Protected
                              </Badge>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {ep.isAtomic ? (
                              <Badge variant="outline" className="text-[9px] border-purple-500/30 text-purple-400 bg-purple-500/10">
                                Atomic
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground/60 text-[10px]">—</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center font-mono">
                            {ep.isComplex ? (
                              <Badge variant="destructive" className="text-[9px] px-1 py-0">
                                &gt;80 Lines
                              </Badge>
                            ) : ep.lineCount > 0 ? (
                              <span className="text-muted-foreground text-[10px]">{ep.lineCount}L</span>
                            ) : (
                              <span className="text-muted-foreground/50 text-[10px]">—</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-semibold">
                            {ep.count > 0 ? ep.count : <span className="text-muted-foreground/50 font-normal">0</span>}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">
                            {ep.count > 0 ? `${ep.p95}ms` : "—"}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">
                            {ep.count > 0 ? ep.avgDbQueries : "—"}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[9px] capitalize ${
                                ep.health === "healthy"
                                  ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-bold"
                                  : ep.health === "degraded"
                                  ? "border-amber-500/30 text-amber-400 bg-amber-500/10 font-bold"
                                  : ep.health === "critical"
                                  ? "border-red-500/30 text-red-400 bg-red-500/10 font-bold"
                                  : "border-muted text-muted-foreground/60 bg-muted/20"
                              }`}
                            >
                              {ep.health}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSelectEndpointForSandbox(ep.method, ep.endpoint)}
                              className="h-6 text-[11px] px-2 text-primary hover:bg-primary/10 gap-1 font-semibold"
                            >
                              <PlayCircle className="w-3 h-3" />
                              <span>Test</span>
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-border gap-3 text-xs text-muted-foreground">
                <div>
                  Showing <strong>{filteredEndpoints.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{" "}
                  <strong>{Math.min(currentPage * pageSize, filteredEndpoints.length)}</strong> of{" "}
                  <strong>{filteredEndpoints.length}</strong> matching endpoints
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="h-8 text-xs gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </Button>
                  <span className="px-2 font-mono text-xs text-foreground font-semibold">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="h-8 text-xs gap-1"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interactive Live Sandbox Panel */}
          <div id="live-sandbox-panel">
            <Card className="border border-border shadow-md">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-purple-400" />
                      <span>Interactive Live API Sandbox</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Execute synthetic requests against any registered endpoint with tenant context and view real-time latency and query counts.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    Superadmin Sandbox
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  {/* Method */}
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase">Method</label>
                    <select
                      value={sandboxMethod}
                      onChange={(e) => setSandboxMethod(e.target.value)}
                      className="w-full mt-1 bg-muted border border-border rounded-lg text-xs font-mono font-bold h-9 px-2 text-foreground"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PATCH">PATCH</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>

                  {/* Endpoint Path */}
                  <div className="md:col-span-6">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase">Endpoint Path</label>
                    <Input
                      value={sandboxEndpoint}
                      onChange={(e) => setSandboxEndpoint(e.target.value)}
                      placeholder="/api/employees/"
                      className="mt-1 h-9 font-mono text-xs"
                    />
                  </div>

                  {/* Tenant Context */}
                  <div className="md:col-span-4">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase">Tenant Context</label>
                    <select
                      value={sandboxTenant}
                      onChange={(e) => setSandboxTenant(e.target.value)}
                      className="w-full mt-1 bg-muted border border-border rounded-lg text-xs font-medium h-9 px-2 text-foreground"
                    >
                      <option value="all">System Core (Master Tenant)</option>
                      <option value="org_1">Tenant 1: Lotus Developers</option>
                      <option value="org_2">Tenant 2: Apex Enterprises</option>
                      <option value="org_3">Tenant 3: Vertex Global</option>
                    </select>
                  </div>
                </div>

                {/* Payload Editor (for POST/PATCH/PUT) */}
                {["POST", "PATCH", "PUT"].includes(sandboxMethod) && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase">Request Payload (JSON)</label>
                      <span className="text-[10px] text-muted-foreground font-mono">application/json</span>
                    </div>
                    <Textarea
                      value={sandboxPayload}
                      onChange={(e) => setSandboxPayload(e.target.value)}
                      rows={4}
                      className="font-mono text-xs bg-muted/40"
                      placeholder='{ "key": "value" }'
                    />
                  </div>
                )}

                {/* Action button */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleExecuteSandbox}
                    disabled={executingSandbox}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-9 gap-1.5 shadow-sm"
                  >
                    <Send className={`w-3.5 h-3.5 ${executingSandbox ? "animate-spin" : ""}`} />
                    <span>{executingSandbox ? "Executing Request..." : "Execute Request"}</span>
                  </Button>
                </div>

                {/* Sandbox Response Viewer */}
                {sandboxResponse && (
                  <div className="mt-4 p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={sandboxResponse.statusCode < 400 ? "outline" : "destructive"}
                          className={`font-mono text-xs ${
                            sandboxResponse.statusCode < 400 ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10 font-bold" : ""
                          }`}
                        >
                          HTTP {sandboxResponse.statusCode}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                          Duration: <strong className="text-foreground">{sandboxResponse.durationMs}ms</strong>
                        </span>
                        <span className="text-muted-foreground">&bull;</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          DB Queries: <strong className="text-foreground">{sandboxResponse.queryCount}</strong>
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(sandboxResponse.responseData, null, 2));
                          toast.success("Response JSON copied to clipboard");
                        }}
                        className="h-7 text-xs gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy JSON</span>
                      </Button>
                    </div>

                    <pre className="p-3 rounded-lg bg-background border border-border text-[11px] font-mono overflow-x-auto max-h-72">
                      {JSON.stringify(sandboxResponse.responseData, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: LIVE REQUEST TRACES & MULTI-TENANT AUDIT LOGS
          ========================================================================= */}
      {activeTab === "traces" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-5 rounded-2xl shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Terminal className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Live Request Traces &amp; Multi-Tenant Audit Logs</h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Real-time request stream &bull; Correlation IDs &bull; SQL query counts &bull; Detailed trace inspection
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setHideHeartbeats(!hideHeartbeats)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                  hideHeartbeats
                    ? "bg-purple-600 text-white border-purple-500 shadow-sm"
                    : "bg-muted text-muted-foreground border-border hover:text-foreground"
                }`}
                title="Filters out repetitive background notification polling to highlight real user actions"
              >
                <span>{hideHeartbeats ? "✓ Filter Background Heartbeats" : "Show All Requests"}</span>
              </button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => pollAllTelemetry(true)}
                disabled={loadingTraces}
                className="h-9 gap-1.5 text-xs font-semibold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingTraces ? "animate-spin" : ""}`} />
                <span>Refresh Traces</span>
              </Button>
            </div>
          </div>

          {/* Filters Bar */}
          <Card className="border border-border shadow-sm p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {/* Search */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase">Search Trace</label>
                <div className="relative mt-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search endpoint, correlation, email..."
                    value={tracesSearch}
                    onChange={(e) => setTracesSearch(e.target.value)}
                    className="h-8 pl-8 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Log Level */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase">Log Level</label>
                <select
                  value={tracesLevelFilter}
                  onChange={(e) => setTracesLevelFilter(e.target.value)}
                  className="w-full mt-1 bg-muted border border-border rounded-lg text-xs font-medium h-8 px-2 text-foreground"
                >
                  <option value="ALL">All Levels</option>
                  <option value="INFO">INFO (&lt; 400)</option>
                  <option value="WARN">WARN (4xx Client Errors)</option>
                  <option value="ERROR">ERROR (5xx Server Exceptions)</option>
                </select>
              </div>

              {/* Platform */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase">Client Platform</label>
                <select
                  value={tracesPlatformFilter}
                  onChange={(e) => setTracesPlatformFilter(e.target.value)}
                  className="w-full mt-1 bg-muted border border-border rounded-lg text-xs font-medium h-8 px-2 text-foreground"
                >
                  <option value="ALL">All Traffic</option>
                  <option value="WEB">Web API</option>
                  <option value="MOBILE">Mobile API</option>
                </select>
              </div>

              {/* Tenant */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase">Tenant Scope</label>
                <select
                  value={tracesTenantFilter}
                  onChange={(e) => setTracesTenantFilter(e.target.value)}
                  className="w-full mt-1 bg-muted border border-border rounded-lg text-xs font-medium h-8 px-2 text-foreground"
                >
                  <option value="all">All Tenants</option>
                  <option value="org_1">Lotus Developers</option>
                  <option value="org_2">Apex Enterprises</option>
                  <option value="system">System Core</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Live Traces Table */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>Real-Time Request Stream ({tracesData?.total ?? 0})</span>
                </CardTitle>
                <Badge variant="outline" className="font-mono text-xs">
                  Ring Buffer: 250 Traces
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-2.5 px-4 text-left">Timestamp</th>
                      <th className="py-2.5 px-4 text-left">Correlation ID</th>
                      <th className="py-2.5 px-3 text-center">Platform</th>
                      <th className="py-2.5 px-3 text-left">Method</th>
                      <th className="py-2.5 px-4 text-left">Endpoint</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Duration</th>
                      <th className="py-2.5 px-3 text-right">SQL Queries</th>
                      <th className="py-2.5 px-4 text-left">Actor / User</th>
                      <th className="py-2.5 px-4 text-left">Tenant</th>
                      <th className="py-2.5 px-4 text-center">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-mono">
                    {(tracesData?.traces || []).length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-10 text-center text-muted-foreground font-sans">
                          No request traces recorded yet. Traces will appear here as live API traffic flows.
                        </td>
                      </tr>
                    ) : (
                      (tracesData?.traces || []).map((t: any) => (
                        <tr key={t.id} className="hover:bg-muted/30">
                          <td className="py-2 px-4 text-muted-foreground text-[11px]">{t.timestamp}</td>
                          <td className="py-2 px-4 text-primary font-bold text-[11px]">{t.correlationId}</td>
                          <td className="py-2 px-3 text-center">
                            <Badge variant="outline" className="text-[9px]">
                              {t.platform === "MOBILE" ? (
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                  <Smartphone className="w-2.5 h-2.5" /> MOB
                                </span>
                              ) : (
                                <span className="text-indigo-400 font-bold flex items-center gap-1">
                                  <Globe className="w-2.5 h-2.5" /> WEB
                                </span>
                              )}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 font-bold">
                            <span
                              className={
                                t.method === "GET"
                                  ? "text-blue-400"
                                  : t.method === "POST"
                                  ? "text-emerald-400"
                                  : "text-amber-400"
                              }
                            >
                              {t.method}
                            </span>
                          </td>
                          <td className="py-2 px-4 text-foreground font-medium">{t.endpoint}</td>
                          <td className="py-2 px-3 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold ${
                                t.statusCode < 400
                                  ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                                  : t.statusCode < 500
                                  ? "border-amber-500/30 text-amber-400 bg-amber-500/10"
                                  : "border-red-500/30 text-red-400 bg-red-500/10"
                              }`}
                            >
                              {t.statusCode}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-foreground">{t.durationMs}ms</td>
                          <td className="py-2 px-3 text-right">{t.queryCount}</td>
                          <td className="py-2 px-4 text-foreground font-sans text-xs">
                            <div className="flex items-center gap-1.5">
                              <UserIcon className="w-3 h-3 text-primary shrink-0" />
                              <span className="font-semibold truncate max-w-[150px]" title={t.actorEmail}>
                                {t.actorEmail && t.actorEmail !== "anonymous" ? t.actorEmail : "anonymous"}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-4 text-muted-foreground font-sans text-[11px]">{t.tenantId}</td>
                          <td className="py-2 px-4 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedTrace(t)}
                              className="h-6 text-[11px] px-2 text-cyan-400 hover:bg-cyan-500/10 font-sans font-semibold"
                            >
                              Inspect
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =========================================================================
          GLOBAL REAL-TIME TRACE INSPECTION MODAL (Accessible from Tab 1 & Tab 3)
          ========================================================================= */}
      <Dialog open={!!selectedTrace} onOpenChange={() => setSelectedTrace(null)}>
        <DialogContent className="max-w-2xl w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto font-sans p-6 rounded-2xl border border-border shadow-2xl bg-card">
          <DialogHeader className="border-b border-border/50 pb-3">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Terminal className="w-5 h-5 text-cyan-400" />
              <span>Request Trace Inspection</span>
            </DialogTitle>
            <DialogDescription className="font-mono text-xs flex items-center justify-between gap-2 mt-1">
              <span>Correlation ID: <strong className="text-foreground">{selectedTrace?.correlationId}</strong></span>
              {selectedTrace?.timestamp && (
                <span className="text-muted-foreground">{selectedTrace.timestamp}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedTrace && (
            <div className="space-y-4 text-xs min-w-0 max-w-full overflow-hidden mt-2">
              {/* Summary badges */}
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-muted/40 border border-border/60 font-mono text-xs w-full max-w-full overflow-hidden">
                <Badge variant="outline" className="font-bold text-foreground text-xs px-2.5 py-1 shrink-0">
                  <span
                    className={
                      selectedTrace.method === "GET"
                        ? "text-blue-400"
                        : selectedTrace.method === "POST"
                        ? "text-emerald-400"
                        : selectedTrace.method === "PATCH"
                        ? "text-amber-400"
                        : "text-purple-400"
                    }
                  >
                    {selectedTrace.method}
                  </span>
                  <span className="ml-1.5 font-mono truncate max-w-[200px] sm:max-w-[320px]" title={selectedTrace.endpoint}>
                    {selectedTrace.endpoint}
                  </span>
                </Badge>
                <Badge
                  variant="outline"
                  className={`font-bold text-xs px-2 py-0.5 shrink-0 ${
                    selectedTrace.statusCode < 400
                      ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                      : selectedTrace.statusCode < 500
                      ? "border-amber-500/30 text-amber-400 bg-amber-500/10"
                      : "border-red-500/30 text-red-400 bg-red-500/10"
                  }`}
                >
                  HTTP {selectedTrace.statusCode}
                </Badge>
                <div className="flex items-center gap-2 ml-auto text-muted-foreground text-[11px] shrink-0 font-sans">
                  <span>Duration: <strong className="text-foreground font-mono">{selectedTrace.durationMs}ms</strong></span>
                  <span>&bull;</span>
                  <span>DB: <strong className="text-foreground font-mono">{selectedTrace.queryCount} queries</strong></span>
                  <span>&bull;</span>
                  <Badge variant="secondary" className="text-[10px] uppercase font-bold py-0 h-5">
                    {selectedTrace.platform}
                  </Badge>
                </div>
              </div>

              {/* Actor & Tenant Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-border bg-card/60 text-xs w-full min-w-0">
                <div className="min-w-0">
                  <span className="text-muted-foreground block text-[11px] font-medium">Actor / User</span>
                  <strong className="text-foreground font-mono truncate block text-xs" title={selectedTrace.actorEmail}>
                    {selectedTrace.actorEmail || "anonymous"}
                  </strong>
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground block text-[11px] font-medium">Tenant Scope</span>
                  <strong className="text-foreground font-mono truncate block text-xs" title={selectedTrace.tenantId}>
                    {selectedTrace.tenantId}
                  </strong>
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground block text-[11px] font-medium">Client IP</span>
                  <span className="font-mono text-foreground truncate block">{selectedTrace.clientIp || "127.0.0.1"}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground block text-[11px] font-medium">Resolved View / Source</span>
                  <span className="font-mono text-foreground truncate block text-[11px]" title={selectedTrace.fileSource || selectedTrace.viewName}>
                    {selectedTrace.fileSource || selectedTrace.viewName || "unknown"}
                  </span>
                </div>
              </div>

              {/* Request Headers */}
              <div className="w-full min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Request Headers</h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground gap-1"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(selectedTrace.headers, null, 2));
                      toast.success("Headers copied to clipboard");
                    }}
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </Button>
                </div>
                <div className="rounded-xl border border-border bg-muted/40 p-3 max-w-full overflow-hidden">
                  <pre className="font-mono text-[11px] leading-relaxed text-foreground max-w-full overflow-x-auto whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                    {JSON.stringify(selectedTrace.headers, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Query Parameters */}
              {selectedTrace.queryParams && Object.keys(selectedTrace.queryParams).length > 0 && (
                <div className="w-full min-w-0">
                  <h4 className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider mb-1.5">Query Parameters</h4>
                  <div className="rounded-xl border border-border bg-muted/40 p-3 max-w-full overflow-hidden">
                    <pre className="font-mono text-[11px] leading-relaxed text-foreground max-w-full overflow-x-auto whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                      {JSON.stringify(selectedTrace.queryParams, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Exception Details */}
              {selectedTrace.errorMessage && (
                <div className="w-full min-w-0">
                  <h4 className="font-semibold text-red-400 uppercase text-[10px] tracking-wider mb-1.5">Exception Details</h4>
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 max-w-full overflow-hidden">
                    <pre className="font-mono text-[11px] leading-relaxed text-red-300 max-w-full overflow-x-auto whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                      {selectedTrace.errorMessage}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
