import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { organizationsApi, invoicesApi } from "@/api";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Download, ChevronRight, FileText } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/billing-payments/$orgId")({
  component: BillingDetail,
});

function BillingDetail() {
  const { user } = useAuth();
  const { orgId } = Route.useParams();
  
  const { data: organization, isLoading: isOrgLoading } = useQuery({
    queryKey: ["organization", orgId],
    queryFn: () => organizationsApi.getById(orgId),
  });

  const { data: invoices, isLoading: isInvoicesLoading } = useQuery({
    queryKey: ["invoices", orgId],
    queryFn: () => invoicesApi.getAll(orgId),
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  if (user?.username !== "Vibe_admin") {
    return <Navigate to="/" />;
  }

  if (isOrgLoading || isInvoicesLoading) {
    return <div className="p-8 text-center animate-pulse">Loading billing details...</div>;
  }

  const handleDownload = (invoiceNumber: string) => {
    toast.success(`Downloading invoice ${invoiceNumber}...`);
  };

  const allInvoices = invoices || [];
  
  const filteredInvoices = allInvoices.filter((inv: any) => {
    const matchesSearch = (inv.invoice_number || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center text-sm text-slate-500 mb-1">
            <Link to="/billing-payments" className="hover:text-purple-600">Organization</Link>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span>Billing & Subscriptions</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{organization?.name || "Organization"}</h1>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => toast.success("Downloading CSV...")}>Download CSV</Button>
          <Button className="bg-purple-600 hover:bg-purple-700">Pay Now</Button>
        </div>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-slate-50/50 border-slate-200">
          <CardHeader className="pb-2">
            <Badge variant="secondary" className="w-fit mb-2 text-xs font-semibold bg-blue-100 text-[#1a4cd2] hover:bg-blue-100">NB</Badge>
            <CardDescription className="font-medium text-slate-600">Next Billing Amount</CardDescription>
            <CardTitle className="text-4xl font-bold">${Number(organization?.rateOfBilling || 0).toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">Estimated for next cycle • Renews on {organization?.billingDate || "-"}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-50/50 border-slate-200">
          <CardHeader className="pb-2">
            <Badge variant="secondary" className="w-fit mb-2 text-xs font-semibold bg-blue-100 text-[#1a4cd2] hover:bg-blue-100">CD</Badge>
            <CardDescription className="font-medium text-slate-600">Current Balance Due</CardDescription>
            <CardTitle className="text-4xl font-bold">${Number(organization?.currentDue || 0).toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              {Number(organization?.currentDue || 0) === 0 ? "Everything looks good!" : "Payment is required."}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice History */}
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Invoice History</h2>
            <p className="text-sm text-slate-500">Review and download your recent billing statements</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search invoice #" 
                className="pl-9 w-[250px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex bg-slate-100 p-1 rounded-md">
              {["All", "Paid", "Overdue"].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${statusFilter === status ? 'bg-[#1a4cd2] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border shadow-sm">
          <DataTable
            rows={filteredInvoices}
            rowKey={(r: any) => r.id}
            columns={[
              { 
                key: "invoice", 
                header: "Invoice #", 
                render: (r: any) => <span className="font-medium">{r.invoiceNumber}</span> 
              },
              { 
                key: "billing_date", 
                header: "Billing Date", 
                render: (r: any) => <span>{r.billingDate}</span> 
              },
              { 
                key: "due_date", 
                header: "Due Date", 
                render: (r: any) => <span>{r.dueDate}</span> 
              },
              { 
                key: "amount", 
                header: "Amount", 
                render: (r: any) => <span>${Number(r.amount).toFixed(2)}</span> 
              },
              { 
                key: "status", 
                header: "Status", 
                render: (r: any) => (
                  <Badge variant="outline" className={r.status === 'Paid' ? 'text-purple-600 border-purple-200 bg-purple-50' : 'text-slate-600 border-slate-200 bg-slate-50'}>
                    {r.status}
                  </Badge>
                )
              },
            ]}
            actions={(r: any) => (
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" className="text-purple-600 hover:text-purple-700 hover:bg-purple-50" onClick={() => handleDownload(r.invoice_number)}>
                  Download
                </Button>
              </div>
            )}
          />
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Billing Information</h2>
          <p className="text-sm text-slate-500">Tax details and invoice contact information</p>
          <div className="bg-white p-6 rounded-lg border shadow-sm grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Billing Contact</h4>
                <p className="text-sm text-slate-600">{organization?.billing_contact_email || "billing@example.com"}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Tax ID / VAT</h4>
                <p className="text-sm text-slate-600">{organization?.tax_id || "Not Provided"}</p>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Billing Address</h4>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{organization?.billing_address || "No address provided."}</p>
              <Button variant="link" className="px-0 mt-2 text-purple-600 h-auto">Edit Billing Details</Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Billing Help</h2>
          <div className="bg-white p-2 rounded-lg border shadow-sm space-y-1">
            <Button variant="ghost" className="w-full justify-between font-normal text-slate-600 hover:text-slate-900">
              How do I change my billing cycle?
            </Button>
            <Button variant="ghost" className="w-full justify-between font-normal text-slate-600 hover:text-slate-900">
              When are invoices generated?
            </Button>
            <Button variant="ghost" className="w-full justify-between font-normal text-slate-600 hover:text-slate-900">
              Accepted payment methods?
            </Button>
            <div className="p-2 pt-4 border-t mt-2">
              <Button variant="outline" className="w-full bg-slate-50">Visit Help Center</Button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
