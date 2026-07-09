import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { useEffect, useState } from "react";
import { offersApi } from "@/api";
import { Card } from "@/components/ui/card";
import { FileText, Clock, Send, CheckCircle2, XCircle, Timer, UserCheck2, Ban, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/offer-letters")({
  component: OfferLettersDashboard,
});

function OfferLettersDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    offersApi.getDashboardMetrics()
      .then((res: any) => {
        setData(res);
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: "Draft", value: data?.metrics?.['draft'] || data?.metrics?.['Draft'] || 0, icon: FileText, color: "text-muted-foreground" },
    { label: "Pending Approval", value: data?.metrics?.['pendingApproval'] || data?.metrics?.['Pending Approval'] || 0, icon: Clock, color: "text-amber-500" },
    { label: "Awaiting Acceptance", value: data?.metrics?.['awaitingAcceptance'] || data?.metrics?.['Awaiting Acceptance'] || 0, icon: Send, color: "text-blue-500" },
    { label: "Accepted", value: data?.metrics?.['accepted'] || data?.metrics?.['Accepted'] || 0, icon: CheckCircle2, color: "text-emerald-500" },
    { label: "Rejected", value: data?.metrics?.['rejected'] || data?.metrics?.['Rejected'] || 0, icon: XCircle, color: "text-red-500" },
    { label: "Expired", value: data?.metrics?.['expired'] || data?.metrics?.['Expired'] || 0, icon: Timer, color: "text-slate-500" },
    { label: "Joined", value: data?.metrics?.['joined'] || data?.metrics?.['Joined'] || 0, icon: UserCheck2, color: "text-emerald-600" },
    { label: "Declined", value: data?.metrics?.['declined'] || data?.metrics?.['Declined'] || 0, icon: Ban, color: "text-rose-500" },
  ];

  const getStatusColor = (status: string) => {
    if (status === 'Pending Approval') return 'bg-amber-100 text-amber-800';
    if (status === 'Awaiting Acceptance') return 'bg-blue-100 text-blue-800';
    if (status === 'Accepted') return 'bg-emerald-100 text-emerald-800';
    if (status === 'Joined') return 'bg-emerald-200 text-emerald-900';
    if (status === 'Rejected' || status === 'Declined') return 'bg-rose-100 text-rose-800';
    return 'bg-slate-100 text-slate-800';
  };

  return (
    <>
      <div className="flex justify-between items-end mb-6">
        <PageHeader title="Offer Letters" description="Pipeline view across all stages — from draft to joined." />
        <Link to="/all-offers" className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors">
          <FileText className="w-4 h-4 mr-2" /> View All Offers
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">Loading dashboard...</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <Card 
                key={i} 
                className="p-4 flex items-center justify-between cursor-pointer hover:shadow-md transition-all hover:border-primary/50 active:scale-[0.98]"
                onClick={() => navigate({ to: '/all-offers', search: { filter: stat.label } })}
              >
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.value > 0 ? stat.color : "text-foreground"}`}>{stat.value}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="col-span-2 overflow-hidden flex flex-col">
              <div className="border-b px-4 py-3 flex justify-between items-center bg-muted/20">
                <h3 className="font-semibold text-sm">Recent Offers</h3>
                <Link to="/all-offers" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y flex-1">
                {data?.recent?.map((offer: any) => (
                  <div key={offer.id} className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{offer.candidateName}</span>
                        <span className="text-muted-foreground text-xs">·</span>
                        <span className="text-muted-foreground text-xs">{offer.designationName}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {offer.offerNumber} · Joining {offer.joiningDate || 'TBD'}
                      </div>
                    </div>
                    <div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${getStatusColor(offer.status)}`}>
                        {offer.status}
                      </span>
                    </div>
                  </div>
                ))}
                {(!data?.recent || data.recent.length === 0) && (
                  <div className="p-8 text-center text-muted-foreground text-sm">No recent offers.</div>
                )}
              </div>
            </Card>

            <Card className="overflow-hidden flex flex-col">
              <div className="border-b px-4 py-3 bg-muted/20">
                <h3 className="font-semibold text-sm">Upcoming Joining Dates</h3>
              </div>
              <div className="divide-y flex-1">
                {data?.upcoming?.map((offer: any) => (
                  <div key={offer.id} className="p-4 flex justify-between items-start hover:bg-muted/10 transition-colors">
                    <div>
                      <div className="font-semibold text-sm">{offer.candidateName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{offer.departmentName || 'N/A'}</div>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                      {offer.joiningDate}
                    </div>
                  </div>
                ))}
                {(!data?.upcoming || data.upcoming.length === 0) && (
                  <div className="p-8 text-center text-muted-foreground text-sm">No upcoming joins.</div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
