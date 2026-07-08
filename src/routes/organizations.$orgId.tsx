import React, { useState } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Edit, Pencil, Trash2, MapPin, Building2, Clock, CheckCircle2, AlertCircle, Copy, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table";
import { organizationsApi, sitesApi } from "@/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/organizations/$orgId")({
  component: OrganizationDetailPage,
  loader: async ({ params }) => {
    return { orgId: params.orgId };
  }
});

function OrganizationDetailPage() {
  const { user } = useAuth();
  const { orgId } = Route.useLoaderData();
  const [emailError, setEmailError] = useState("");

  const { data: organization, isLoading: isLoadingOrg } = useQuery({
    queryKey: ["organization", orgId],
    queryFn: () => organizationsApi.getById(orgId),
  });

  const { data: allSites, isLoading: isLoadingSites } = useQuery({
    queryKey: ["sites"],
    queryFn: () => sitesApi.getAll(),
  });

  if (user?.username !== "Vibe_admin") {
    return <Navigate to="/" />;
  }

  if (isLoadingOrg || isLoadingSites) {
    return <div className="p-8 text-center animate-pulse">Loading organization details...</div>;
  }

  if (!organization) {
    return <div className="p-8 text-center text-red-500">Organization not found.</div>;
  }

  const orgSites = (allSites || []).filter((s: any) => s.organization?.toString() === orgId.toString());

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start bg-white p-6 rounded-xl border shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" asChild>
            <Link to="/organizations">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{organization.name}</h1>
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-mono text-xs">
                ID: {organization.id || orgId}
              </span>
              <Badge variant="outline" className={organization.status === 'Active' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 'text-slate-600 border-slate-200 bg-slate-50'}>
                {organization.status?.toUpperCase() || 'ACTIVE'}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700" 
            onClick={async () => {
              setEmailError("");
              try {
                await organizationsApi.resendEmail(orgId);
                toast.success("Welcome email triggered successfully with Sub-Domain, Login ID, and Password!");
              } catch (err: any) {
                const errMsg = err.response?.data?.error || err.message || "Failed to trigger welcome email.";
                setEmailError(errMsg);
                toast.error("Failed to trigger email. See error box for details.");
              }
            }}
          >
            <Mail className="w-4 h-4 mr-2" />
            Resend Welcome Email
          </Button>
          <Button variant="outline" className="text-slate-700">
            <Pencil className="w-4 h-4 mr-2" />
            Edit Details
          </Button>
          <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {emailError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 shadow-sm flex items-start" role="alert">
          <div className="bg-red-100 p-1 rounded-md mr-3 mt-0.5">
            <Mail className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <strong className="font-bold block mb-1">Email Delivery Failed</strong>
            <span className="block text-sm">{emailError}</span>
            <p className="text-xs text-red-500 mt-2 font-medium">Please check your SMTP credentials in settings.py</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column (Main Info) */}
        <div className="col-span-2 space-y-6">
          
          {/* Organization Profile */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-5 border-b bg-slate-50/50 flex items-center gap-2">
              <div className="bg-indigo-100 p-1.5 rounded-md text-indigo-700">
                <Building2 className="w-4 h-4" />
              </div>
              <h2 className="font-semibold text-slate-800">Organization Profile</h2>
            </div>
            <div className="p-6 grid grid-cols-3 gap-y-6 gap-x-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Company Name</p>
                <p className="font-medium text-slate-800">{organization.companyName || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Entity</p>
                <p className="font-medium text-slate-800">{organization.entityName || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Site Location</p>
                <p className="font-medium text-slate-800">{organization.siteLocation || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Location Details</p>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>
                    {[organization.city, organization.state, organization.country].filter(Boolean).join(', ') || '—'}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Sub-Domain</p>
                <p className="font-medium text-blue-600 hover:underline cursor-pointer">{organization.subDomain || '—'}</p>
              </div>
            </div>
          </div>

          {/* Billing Configuration */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-5 border-b bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-emerald-100 p-1.5 rounded-md text-emerald-700">
                  <span className="font-bold text-sm leading-none">$</span>
                </div>
                <h2 className="font-semibold text-slate-800">Billing Configuration</h2>
              </div>
              <Button variant="outline" size="sm" className="text-xs">View Full Billing</Button>
            </div>
            <div className="p-6 grid grid-cols-3 gap-y-6 gap-x-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Solution Type</p>
                <p className="font-medium text-slate-800">{organization.solutionType || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Solution For</p>
                <p className="font-medium text-slate-800">{organization.solutionFor || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Billing Term</p>
                <p className="font-medium text-slate-800">{organization.billingTerm || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Rate</p>
                <p className="font-medium text-slate-800">{organization.rateOfBilling ? `$${organization.rateOfBilling}` : '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Cycle</p>
                <p className="font-medium text-slate-800">{organization.billingCycle || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Project Duration</p>
                <p className="font-medium text-slate-800">{organization.projectDuration || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Start Date</p>
                <p className="font-medium text-slate-800">{organization.startDate || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">End Date</p>
                <p className="font-medium text-slate-800">{organization.endDate || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Billing Date</p>
                <p className="font-medium text-slate-800">{organization.billingDate || '—'}</p>
              </div>
            </div>
          </div>

          {/* Operational Sites */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-5 border-b bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 p-1.5 rounded-md text-blue-700">
                  <MapPin className="w-4 h-4" />
                </div>
                <h2 className="font-semibold text-slate-800">Operational sites</h2>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs">Manage Sites</Button>
                <Button size="sm" className="bg-[#1a4cd2] hover:bg-[#1641b4] text-xs" asChild>
                  <Link to="/superadmin-sites" search={{ action: 'add', orgId: orgId.toString() }}>
                    + Add Site
                  </Link>
                </Button>
              </div>
            </div>
            <div className="p-0">
              <DataTable
                rows={orgSites}
                rowKey={(r: any) => r.id}
                columns={[
                  { 
                    key: "name", 
                    header: "Site name", 
                    render: (r: any) => <span className="font-medium text-slate-800">{r.name}</span> 
                  },
                  { 
                    key: "product_type", 
                    header: "Product types", 
                    render: (r: any) => <span className="text-slate-600">{r.productType || "—"}</span> 
                  },
                  { 
                    key: "users", 
                    header: "Users", 
                    render: (r: any) => <span className="text-slate-600">{r.usersCount || "0"}</span> 
                  },
                  { 
                    key: "status", 
                    header: "Status", 
                    render: (r: any) => (
                      <Badge variant="outline" className={r.status === 'Active' ? 'text-emerald-600 border-emerald-200 bg-emerald-50 text-[10px]' : 'text-slate-600 border-slate-200 bg-slate-50 text-[10px]'}>
                        {r.status?.toUpperCase() || 'ACTIVE'}
                      </Badge>
                    )
                  },
                ]}
                actions={(r: any) => (
                  <Button variant="link" className="text-blue-600 p-0 h-auto font-medium" asChild>
                    <Link to="/superadmin-sites">Manage</Link>
                  </Button>
                )}
              />
            </div>
          </div>

        </div>

        {/* Right Column (Audit Trail) */}
        <div className="col-span-1">
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-5 border-b bg-slate-50/50 flex items-center gap-2">
              <div className="bg-slate-200 p-1.5 rounded-md text-slate-700">
                <Clock className="w-4 h-4" />
              </div>
              <h2 className="font-semibold text-slate-800">Audit Trail</h2>
            </div>
            <div className="p-6">
              <div className="relative pl-6 pb-6 border-l-2 border-slate-200 last:border-0 last:pb-0">
                <div className="absolute -left-[9px] top-0 bg-white p-1">
                  <div className="w-3 h-3 rounded-full border-2 border-indigo-500 bg-indigo-100"></div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border">
                  <h4 className="font-semibold text-slate-900 text-sm">Organization Created</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {organization.createdAt ? format(new Date(organization.createdAt), 'MMM dd, yyyy, h:mm a') : 'Recently'}
                  </p>
                  <p className="text-xs text-slate-600 mt-2">Created securely by system admin <span className="text-indigo-600">(Admin)</span>.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
