import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { useEffect, useState } from "react";
import { offersApi, employeesApi, offerTemplatesApi } from "@/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Check, MailPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { toast } from "sonner";

export const Route = createFileRoute("/all-offers")({
  component: AllOffersPage,
});

function AllOffersPage() {
  const [data, setData] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("Pending Approval");

  const [open, setOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isSending, setIsSending] = useState(false);

  const tabs = ["All", "Pending Approval", "Completed"];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [offersRes, empsRes, tmplRes] = await Promise.all([
        offersApi.getAll().catch(() => []),
        employeesApi.getAll().catch(() => []),
        offerTemplatesApi.getAll().catch(() => [])
      ]);
      
      const offersList = (offersRes && (offersRes as any).results) || (Array.isArray(offersRes) ? offersRes : []);
      const empsList = (empsRes && (empsRes as any).results) || (Array.isArray(empsRes) ? empsRes : []);
      setTemplates((tmplRes && (tmplRes as any).results) || (Array.isArray(tmplRes) ? tmplRes : []));
      
      const combined = empsList.map((emp: any) => {
        const offer = offersList.find((o: any) => String(o.employee) === String(emp.id) || o.candidate_email === emp.email);
        return {
          id: offer?.id || `emp-${emp.id}`,
          isGenerated: !!offer?.id,
          employeeId: emp.id,
          offerNumber: offer?.offerNumber || offer?.offer_number || `Pending Generation`,
          candidateName: `${emp.firstName || emp.first_name || ''} ${emp.lastName || emp.last_name || ''}`.trim(),
          candidateEmail: emp.email || '',
          designationName: offer?.designationName || offer?.designation_name || emp.designationName || emp.designation_name || 'N/A',
          departmentName: offer?.departmentName || offer?.department_name || emp.departmentName || emp.department_name || 'N/A',
          entityName: offer?.entityName || offer?.entity_name || emp.entityName || emp.entity_name || 'N/A',
          joiningDate: offer?.joiningDate || offer?.joining_date || emp.doj || 'TBD',
          status: offer?.status || "No Offer",
        };
      });
      setData(combined);
    } catch (err: any) {
      setError(err.message || "Failed to fetch offers");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOffer = async () => {
    if (!selectedTemplate) return toast.error("Please select a template");
    setIsSending(true);
    try {
      if (selectedEmp.isGenerated) {
        await offersApi.update(selectedEmp.id, { status: "Awaiting Acceptance", template_id: selectedTemplate });
      } else {
        await offersApi.create({
          employee: selectedEmp.employeeId,
          offer_number: `OFF-${Date.now()}`,
          status: "Awaiting Acceptance",
          template_id: selectedTemplate
        });
      }
      toast.success(`Offer sent to ${selectedEmp.candidateEmail}`);
      setOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(`Failed to send offer: ${err.message || String(err)}`);
    } finally {
      setIsSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'Pending Approval' || status === 'No Offer') return 'bg-amber-100 text-amber-800';
    if (status === 'Awaiting Acceptance') return 'bg-blue-100 text-blue-800';
    if (status === 'Accepted' || status === 'Completed' || status === 'Joined') return 'bg-emerald-100 text-emerald-800';
    if (status === 'Rejected' || status === 'Declined') return 'bg-rose-100 text-rose-800';
    return 'bg-slate-100 text-slate-800';
  };

  const filteredData = data.filter(offer => {
    if (search && !(offer.candidateName || '').toLowerCase().includes(search.toLowerCase()) && !(offer.offerNumber || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (activeTab === "Pending Approval" && !["Pending Approval", "No Offer", "Awaiting Acceptance"].includes(offer.status)) return false;
    if (activeTab === "Completed" && !['Accepted', 'Joined'].includes(offer.status)) return false;
    return true;
  });

  const handleStatusChange = (id: number | string, newStatus: string) => {
    if (typeof id === 'string' && id.startsWith('emp-')) {
      toast.error("Cannot mark accepted before an offer is generated & sent!");
      return;
    }
    offersApi.update(id as number, { status: newStatus }).then(() => {
      fetchData();
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="All Offers" description="Filter the pipeline across every stage." />
      
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by employee, offer number..." 
            className="pl-9 bg-background"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 bg-muted/30 p-1 rounded-lg overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <Card className="border shadow-sm rounded-lg overflow-hidden">
        {error && (
          <div className="m-4 p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
            <h4 className="font-semibold text-sm mb-1">Error Loading Data</h4>
            <p className="text-xs">{error}</p>
          </div>
        )}
        <div className="grid grid-cols-[120px_minmax(180px,1.5fr)_minmax(150px,1fr)_minmax(120px,1fr)_100px_130px_150px] gap-4 py-3 px-6 border-b bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider items-center">
          <div>Offer #</div>
          <div>Candidate</div>
          <div>Designation</div>
          <div>Entity</div>
          <div>Joining</div>
          <div>Status</div>
          <div className="text-right">Actions</div>
        </div>
        <div className="divide-y">
          {filteredData.map(offer => (
            <div key={offer.id} className="grid grid-cols-[120px_minmax(180px,1.5fr)_minmax(150px,1fr)_minmax(120px,1fr)_100px_130px_150px] gap-4 py-4 px-6 items-center hover:bg-muted/30 transition-colors">
              <div className="text-sm font-semibold text-primary hover:underline cursor-pointer truncate">{offer.offerNumber}</div>
              <div className="overflow-hidden">
                <div className="font-semibold text-sm text-foreground truncate">{offer.candidateName}</div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">{offer.candidateEmail}</div>
              </div>
              <div className="overflow-hidden">
                <div className="text-sm text-foreground truncate">{offer.designationName || 'N/A'}</div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">{offer.departmentName || 'N/A'}</div>
              </div>
              <div className="text-sm text-muted-foreground truncate">{offer.entityName || 'N/A'}</div>
              <div className="text-sm text-foreground truncate">{offer.joiningDate || 'TBD'}</div>
              <div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap ${getStatusColor(offer.status)}`}>
                  {offer.status}
                </span>
              </div>
              <div className="flex justify-end gap-2">
                {!['Accepted', 'Joined', 'Declined', 'Expired'].includes(offer.status) && (
                  <Button variant="outline" size="sm" onClick={() => { setSelectedEmp(offer); setOpen(true); }} className="h-8 text-xs px-2 whitespace-nowrap">
                    <MailPlus className="h-3.5 w-3.5 mr-1" /> {offer.status === "Awaiting Acceptance" ? "Resend" : "Send Offer"}
                  </Button>
                )}
                {(offer.status === 'Pending Approval' || offer.status === 'No Offer' || offer.status === 'Awaiting Acceptance') && (
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 transition-colors" title="Mark Accepted" onClick={() => handleStatusChange(offer.id, 'Accepted')}>
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {filteredData.length === 0 && !loading && (
            <div className="p-8 text-center text-muted-foreground text-sm">No offers found.</div>
          )}
          {loading && (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading offers...</div>
          )}
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send Offer Letter</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Candidate</Label>
              <div className="font-medium mt-1">{selectedEmp?.candidateName} ({selectedEmp?.candidateEmail})</div>
            </div>
            <div>
              <Label>Select Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select an offer template" /></SelectTrigger>
                <SelectContent>
                  {(templates || []).map((t: any) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSendOffer} disabled={isSending}>
              {isSending ? "Sending..." : "Send via Email"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
