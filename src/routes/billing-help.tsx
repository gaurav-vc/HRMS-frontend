import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Search,
  HelpCircle,
  CreditCard,
  FileText,
  Calendar,
  ShieldCheck,
  LifeBuoy,
  Send,
  PhoneCall,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/billing-help")({
  component: BillingHelpPage,
});

function BillingHelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMsg, setTicketMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    { id: "all", label: "All Topics", icon: HelpCircle },
    { id: "cycle", label: "Billing Cycle", icon: Calendar },
    { id: "invoices", label: "Invoices & Receipts", icon: FileText },
    { id: "payment", label: "Payment Methods", icon: CreditCard },
    { id: "tax", label: "Tax & Compliance", icon: ShieldCheck },
  ];

  const faqs = [
    {
      id: "faq-1",
      category: "cycle",
      question: "How do I change my billing cycle?",
      answer:
        "You can switch between Monthly and Annual billing cycles at any time from your Organization Billing Settings page. Annual plans include a 15% discount. Changes take effect on your next renewal date.",
    },
    {
      id: "faq-2",
      category: "invoices",
      question: "When are invoices generated?",
      answer:
        "Invoices are automatically generated on the 1st of every month for monthly subscriptions, or on your annual renewal anniversary date. A copy is instantly emailed to your registered Organization Admin contact email.",
    },
    {
      id: "faq-3",
      category: "payment",
      question: "Accepted payment methods?",
      answer:
        "We support all major Credit & Debit Cards (Visa, MasterCard, Amex), Net Banking across 50+ banks, UPI payments, and direct ACH/Wire transfers for Enterprise accounts.",
    },
    {
      id: "faq-4",
      category: "tax",
      question: "How do I update my Tax ID / GST Identification Number?",
      answer:
        "Go to Super Admin > Billing & Payments > Select Organization > Edit Billing Details. Enter your 15-digit GSTIN or Tax ID and save. All future tax invoices will include updated GST details.",
    },
    {
      id: "faq-5",
      category: "payment",
      question: "What happens if a subscription payment fails?",
      answer:
        "If a payment fails, our automated system retries charging your payment method 3 times over a 7-day grace period. Organization access remains active during grace. After 7 days, accounts enter read-only mode until payment is settled.",
    },
    {
      id: "faq-6",
      category: "invoices",
      question: "Can I get customized invoices or PO numbers attached?",
      answer:
        "Yes, custom Purchase Order (PO) numbers can be added under Billing Settings before invoice generation. Once added, PO numbers will reflect on all downloadable PDF invoices.",
    },
  ];

  const filteredFaqs = faqs.filter((item) => {
    const matchesCat = selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch =
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketMsg) {
      toast.error("Please fill in both subject and description.");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success("Support ticket submitted! Our billing team will reach out within 2 hours.");
      setTicketSubject("");
      setTicketMsg("");
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] p-6 space-y-8 max-w-6xl mx-auto">
      {/* Header with Go Back arrow */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="rounded-full hover:bg-slate-200/60 shrink-0"
          title="Go Back"
        >
          <Link to="/billing-payments">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center text-xs font-semibold text-[#1a4cd2] uppercase tracking-wider mb-1">
            Super Admin Portal <span className="mx-2 text-slate-300">•</span> Billing Help Center
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Billing & Subscription Help Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Find answers to common billing questions or reach out to our dedicated support team.
          </p>
        </div>
      </div>

      {/* Hero Search Box */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="max-w-2xl space-y-4 relative z-10">
          <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30 hover:bg-blue-500/20">
            VibeCopilot HRMS Support
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold">How can we help with your billing today?</h2>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search billing cycle, invoices, GST, payment methods..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 bg-white text-slate-900 placeholder:text-slate-400 h-12 text-base rounded-xl border-0 shadow-md focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Filter Categories */}
      <div className="flex flex-wrap gap-2 pt-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <Button
              key={cat.id}
              variant={isActive ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-xl gap-2 transition-all ${
                isActive
                  ? "bg-[#1a4cd2] hover:bg-blue-700 text-white shadow-sm"
                  : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              {cat.label}
            </Button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main FAQs Accordion */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2 text-slate-900">
                <HelpCircle className="w-5 h-5 text-[#1a4cd2]" />
                Frequently Asked Questions
              </CardTitle>
              <CardDescription>
                Click any question to view detailed step-by-step instructions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredFaqs.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-medium text-slate-700">No matching help articles found</p>
                  <p className="text-xs">Try adjusting your search terms or filter selection.</p>
                </div>
              ) : (
                <Accordion type="single" collapsible className="w-full space-y-2">
                  {filteredFaqs.map((faq) => (
                    <AccordionItem
                      key={faq.id}
                      value={faq.id}
                      className="border border-slate-200 rounded-xl px-4 bg-slate-50/50 data-[state=open]:bg-blue-50/30 transition-colors"
                    >
                      <AccordionTrigger className="font-semibold text-slate-800 hover:text-[#1a4cd2] py-4 text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-slate-600 leading-relaxed text-sm pb-4 pt-1">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Contact Support Side Card */}
        <div className="space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-slate-900">
                <LifeBuoy className="w-5 h-5 text-indigo-600" />
                Contact Billing Support
              </CardTitle>
              <CardDescription className="text-xs">
                Need specialized assistance with your organization billing? Submit a ticket directly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSupportSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Subject</label>
                  <Input
                    placeholder="e.g. Invoice discrepancy or GST update"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    className="text-sm bg-slate-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Issue Description</label>
                  <Textarea
                    placeholder="Describe your billing query or issue..."
                    rows={4}
                    value={ticketMsg}
                    onChange={(e) => setTicketMsg(e.target.value)}
                    className="text-sm bg-slate-50"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#1a4cd2] hover:bg-blue-700 text-white gap-2"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? "Submitting..." : "Submit Ticket"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200 bg-slate-900 text-white">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Direct Support Email</h4>
                  <p className="text-xs text-slate-400">billing@vibecopilot.ai</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Enterprise Support Desk</h4>
                  <p className="text-xs text-slate-400">+1 (800) 555-VIBE (Mon-Fri, 9am-6pm)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
