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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { toast } from "sonner";

type AllOffersSearch = {
  filter?: string;
};

export const Route = createFileRoute("/all-offers")({
  validateSearch: (search: Record<string, unknown>): AllOffersSearch => {
    return {
      filter: search.filter as string | undefined,
    };
  },
  component: AllOffersPage,
});

function AllOffersPage() {
  const [data, setData] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = Route.useSearch();
  const initialFilter = searchParams.filter;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter || "All");

  const [open, setOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [emailBodyText, setEmailBodyText] = useState<string>("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [offersRes, empsRes, tmplRes] = await Promise.all([
        offersApi.getAll().catch(() => []),
        employeesApi.getAll().catch(() => []),
        offerTemplatesApi.getAll().catch(() => []),
      ]);

      const offersList =
        (offersRes && (offersRes as any).results) || (Array.isArray(offersRes) ? offersRes : []);
      const empsList =
        (empsRes && (empsRes as any).results) || (Array.isArray(empsRes) ? empsRes : []);
      setTemplates(
        (tmplRes && (tmplRes as any).results) || (Array.isArray(tmplRes) ? tmplRes : []),
      );

      const combined = empsList.map((emp: any) => {
        const offer = offersList.find(
          (o: any) => String(o.employee) === String(emp.id) || o.candidate_email === emp.email,
        );
        return {
          id: offer?.id || `emp-${emp.id}`,
          isGenerated: !!offer?.id,
          employeeId: emp.id,
          offerNumber: offer?.offerNumber || offer?.offer_number || `Pending Generation`,
          candidateName:
            `${emp.firstName || emp.first_name || ""} ${emp.lastName || emp.last_name || ""}`.trim(),
          candidateEmail: emp.email || "",
          designationName:
            offer?.designationName ||
            offer?.designation_name ||
            emp.designationName ||
            emp.designation_name ||
            "N/A",
          departmentName:
            offer?.departmentName ||
            offer?.department_name ||
            emp.departmentName ||
            emp.department_name ||
            "N/A",
          entityName:
            offer?.entityName || offer?.entity_name || emp.entityName || emp.entity_name || "N/A",
          joiningDate: offer?.joiningDate || offer?.joining_date || emp.doj || "TBD",
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

  const handlePreviewOffer = async () => {
    if (!selectedTemplate) return toast.error("Please select a template");
    setIsSending(true);
    try {
      const res = await offersApi.previewOffer({
        employee_id: selectedEmp.employeeId,
        template_id: selectedTemplate,
      });
      setPreviewHtml(res.html);
      setIsPreviewMode(true);
    } catch (err: any) {
      toast.error(`Failed to generate preview: ${err.message || String(err)}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendCustomOffer = async () => {
    setIsSending(true);
    try {
      await offersApi.sendCustomOffer({
        employee_id: selectedEmp.employeeId,
        template_id: selectedTemplate,
        html_content: previewHtml,
        email_body_text: emailBodyText,
      });
      toast.success(`Offer sent to ${selectedEmp.candidateEmail}`);
      setOpen(false);
      setIsPreviewMode(false);
      fetchData();
    } catch (err: any) {
      toast.error(`Failed to send offer: ${err.message || String(err)}`);
    } finally {
      setIsSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === "Pending Approval" || status === "No Offer")
      return "bg-amber-100 text-amber-800";
    if (status === "Awaiting Acceptance") return "bg-blue-100 text-blue-800";
    if (status === "Accepted" || status === "Completed" || status === "Joined")
      return "bg-emerald-100 text-emerald-800";
    if (status === "Rejected" || status === "Declined") return "bg-rose-100 text-rose-800";
    return "bg-slate-100 text-slate-800";
  };

  const filteredData = data.filter((offer) => {
    if (
      search &&
      !(offer.candidateName || "").toLowerCase().includes(search.toLowerCase()) &&
      !(offer.offerNumber || "").toLowerCase().includes(search.toLowerCase())
    )
      return false;

    if (statusFilter !== "All") {
      if (statusFilter === "Completed") {
        if (!["Accepted", "Joined"].includes(offer.status)) return false;
      } else if (offer.status !== statusFilter) {
        return false;
      }
    }

    return true;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleStatusChange = (id: number | string, newStatus: string) => {
    if (typeof id === "string" && id.startsWith("emp-")) {
      toast.error("Cannot mark accepted before an offer is generated & sent!");
      return;
    }
    offersApi.update(id as number, { status: newStatus }).then(() => {
      fetchData();
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Offers"
        description="Filter the pipeline across every stage."
        showBack={true}
      />

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by employee, offer number..."
            className="pl-9 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
            }}
          >
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="No Offer">No Offer</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Pending Approval">Pending Approval</SelectItem>
              <SelectItem value="Awaiting Acceptance">Awaiting Acceptance</SelectItem>
              <SelectItem value="Completed">Completed (Accepted/Joined)</SelectItem>
              <SelectItem value="Accepted">Accepted</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
              <SelectItem value="Joined">Joined</SelectItem>
              <SelectItem value="Declined">Declined</SelectItem>
              <SelectItem value="Expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border shadow-sm rounded-lg overflow-hidden flex flex-col">
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
        <div className="divide-y flex-1">
          {paginatedData.map((offer) => (
            <div
              key={offer.id}
              className="grid grid-cols-[120px_minmax(180px,1.5fr)_minmax(150px,1fr)_minmax(120px,1fr)_100px_130px_150px] gap-4 py-4 px-6 items-center hover:bg-muted/30 transition-colors"
            >
              <div className="text-sm font-semibold text-primary hover:underline cursor-pointer truncate">
                {offer.offerNumber}
              </div>
              <div className="overflow-hidden">
                <div className="font-semibold text-sm text-foreground truncate">
                  {offer.candidateName}
                </div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">
                  {offer.candidateEmail}
                </div>
              </div>
              <div className="overflow-hidden">
                <div className="text-sm text-foreground truncate">
                  {offer.designationName || "N/A"}
                </div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">
                  {offer.departmentName || "N/A"}
                </div>
              </div>
              <div className="text-sm text-muted-foreground truncate">
                {offer.entityName || "N/A"}
              </div>
              <div className="text-sm text-foreground truncate">{offer.joiningDate || "TBD"}</div>
              <div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap ${getStatusColor(offer.status)}`}
                >
                  {offer.status}
                </span>
              </div>
              <div className="flex justify-end gap-2">
                {!["Accepted", "Joined", "Declined", "Expired"].includes(offer.status) ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedEmp(offer);
                        setEmailBodyText(`Dear ${offer.candidateName},\n\nCongratulations!\n\nWe are thrilled to extend an offer for the position of ${offer.designationName || 'Employee'} at ${offer.entityName || 'the company'}.\n\nPlease find your detailed offer letter attached to this email. Kindly review the document, and if you choose to accept, follow the instructions provided within the attachment.\n\nIf you have any questions or need further clarification, please feel free to reach out.\n\nBest regards,\nHR Department\n${offer.entityName || 'the company'}`);
                        setOpen(true);
                      }}
                      className="h-8 text-xs px-2 whitespace-nowrap"
                    >
                      <MailPlus className="h-3.5 w-3.5 mr-1" />{" "}
                      {offer.status === "Awaiting Acceptance" ? "Resend" : "Send Offer"}
                    </Button>
                    {(offer.status === "Pending Approval" ||
                      offer.status === "No Offer" ||
                      offer.status === "Awaiting Acceptance") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                        title="Mark Accepted"
                        onClick={() => handleStatusChange(offer.id, "Accepted")}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground italic mr-2">No Action</span>
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
        
        {!loading && filteredData.length > 0 && (
          <div className="flex items-center justify-end px-6 py-3 border-t bg-slate-50/50">
            <div className="flex gap-1.5 items-center">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 px-3 text-xs"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center justify-center px-3 text-xs font-semibold text-slate-700 bg-white border h-8 rounded-md min-w-[80px]">
                Page {currentPage} of {totalPages || 1}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 px-3 text-xs"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog 
        open={open} 
        onOpenChange={(val) => {
          setOpen(val);
          if (!val) {
            setIsPreviewMode(false);
            setEmailBodyText("");
          }
        }}
      >
        <DialogContent className={isPreviewMode ? "max-w-5xl" : "max-w-md"}>
          <DialogHeader>
            <DialogTitle>{isPreviewMode ? "Preview & Edit Offer Letter" : "Send Offer Letter"}</DialogTitle>
          </DialogHeader>
          
          {!isPreviewMode ? (
              <div className="space-y-4 py-4">
                <div>
                  <Label>Candidate</Label>
                  <div className="font-medium mt-1">
                    {selectedEmp?.candidateName} ({selectedEmp?.candidateEmail})
                  </div>
                </div>
                <div>
                  <Label>Select Template</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select an offer template" />
                    </SelectTrigger>
                    <SelectContent>
                      {(templates || []).map((t: any) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
          ) : (
              <div className="space-y-4 pt-1 pb-4">
                 <div className="text-sm text-muted-foreground -mt-2">
                    Review the generated offer letter. You can manually edit any missing fields (highlighted in red) or customize the message below before sending.
                 </div>
                 
                 <div className="space-y-2">
                    <Label>Custom Email Message (Optional)</Label>
                    <Textarea 
                       placeholder="e.g. Please find your detailed offer letter attached. We are looking forward to welcoming you to the team!"
                       value={emailBodyText}
                       onChange={(e) => setEmailBodyText(e.target.value)}
                       className="h-48 text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground">This text will be the entire body of the email. Feel free to format with new lines, they will be preserved.</p>
                 </div>

                 <div className="flex flex-col gap-2 overflow-hidden relative group h-[45vh]">
                    <Label>PDF Attachment Preview (Visual Editor)</Label>
                    <div 
                      className="flex-1 overflow-auto border rounded-md bg-white shadow-inner p-6 focus:outline-none focus:ring-2 focus:ring-[#0b646c]/50 transition-shadow" 
                      contentEditable
                      suppressContentEditableWarning={true}
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                      onBlur={(e) => setPreviewHtml(e.currentTarget.innerHTML)}
                    />
                    <div className="absolute top-10 right-6 text-[10px] bg-[#0b646c]/10 text-[#0b646c] px-2 py-0.5 rounded shadow-sm font-semibold pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
                      EDITABLE
                    </div>
                 </div>
              </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
                if (isPreviewMode) {
                    setIsPreviewMode(false);
                } else {
                    setOpen(false);
                }
            }}>
              {isPreviewMode ? "Back" : "Cancel"}
            </Button>
            
            {!isPreviewMode ? (
                <Button onClick={handlePreviewOffer} disabled={isSending}>
                  {isSending ? "Generating..." : "Preview Offer"}
                </Button>
            ) : (
                <Button onClick={handleSendCustomOffer} disabled={isSending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {isSending ? "Sending..." : "Finalize & Send Email"}
                </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
