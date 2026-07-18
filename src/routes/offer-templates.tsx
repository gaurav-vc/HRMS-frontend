import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { useEffect, useState } from "react";
import { offerTemplatesApi } from "@/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilePlus, FileText, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/offer-templates")({
  component: OfferTemplatesPage,
});

function OfferTemplatesPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    category: "",
    body_html: "<h2>Offer of Employment</h2><p>Dear {{candidate_name}},</p><p>We are pleased to offer you the position of {{designation}} at {{entity_name}}.</p>",
    placeholders: ["candidate_name", "designation", "entity_name"]
  });

  const fetchData = () => {
    offerTemplatesApi.getAll()
      .then((res: any) => setData(res))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    if (!newTemplate.name) return toast.error("Name is required");
    setIsSaving(true);
    try {
      await offerTemplatesApi.create(newTemplate);
      toast.success("Template created successfully");
      setOpenCreate(false);
      fetchData();
      setNewTemplate({
        name: "",
        category: "",
        body_html: "<h2>Offer of Employment</h2><p>Dear {{candidate_name}},</p><p>We are pleased to offer you the position of {{designation}} at {{entity_name}}.</p>",
        placeholders: ["candidate_name", "designation", "entity_name"]
      });
    } catch (err: any) {
      toast.error(`Error: ${err.message || "Failed to create"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this template?")) return;
    try {
      await offerTemplatesApi.delete(id);
      toast.success("Template deleted");
      fetchData();
    } catch (err) {
      toast.error("Failed to delete template");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <PageHeader title="Offer Templates" description="Reusable templates with dynamic placeholders. HR can add custom ones per role and entity." />
        <Button onClick={() => setOpenCreate(true)} className="bg-[#0b646c] hover:bg-[#0b646c]/90 text-white flex gap-2 h-10 px-4">
          <FilePlus className="w-4 h-4" /> New Template
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">Loading templates...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {data.map(template => (
            <Card 
              key={template.id} 
              className="p-5 flex flex-col hover:border-[#0b646c]/50 transition-colors cursor-pointer group shadow-sm hover:shadow-md relative"
              onClick={() => setSelectedTemplate(template)}
            >
              <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => handleDelete(template.id, e)}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="flex justify-between items-start mb-4">
                <div className="h-10 w-10 bg-[#0b646c]/10 text-[#0b646c] rounded-lg flex items-center justify-center group-hover:bg-[#0b646c]/20 transition-colors">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50 px-2 py-0.5 rounded">
                  {template.category || 'General'}
                </div>
              </div>
              
              <h3 className="font-semibold text-base text-foreground pr-6">{template.name}</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Updated {new Date(template.updatedAt || template.updated_at).toLocaleDateString()}
              </p>
              
              <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-dashed">
                {(template.placeholders || []).slice(0, 4).map((p: string, i: number) => (
                  <span key={i} className="px-2 py-1 bg-muted/30 border border-muted/60 rounded text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                    {`{{${p}}}`}
                  </span>
                ))}
                {(template.placeholders || []).length > 4 && (
                  <span className="text-xs text-muted-foreground font-medium self-center pl-1">
                    +{(template.placeholders || []).length - 4} more
                  </span>
                )}
              </div>
            </Card>
          ))}
          
          {data.length === 0 && (
            <div className="col-span-full p-12 text-center border-2 border-dashed rounded-lg text-muted-foreground">
              <div className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50 flex items-center justify-center rounded-full bg-muted"><FileText className="h-6 w-6" /></div>
              <p className="text-sm font-medium">No templates created yet.</p>
              <p className="text-xs mt-1">Click "New Template" to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50">
          <DialogHeader className="p-4 border-b bg-white flex flex-row items-center justify-between shrink-0">
            <div>
              <DialogTitle className="text-lg font-semibold text-slate-800">{selectedTemplate?.name}</DialogTitle>
              <p className="text-xs text-slate-500 mt-1">Preview of the offer letter template structure.</p>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-8 bg-slate-100 flex justify-center">
            <div 
              className="bg-white shadow-lg p-10 max-w-3xl w-full min-h-full rounded border prose prose-sm prose-slate"
              dangerouslySetInnerHTML={{ __html: selectedTemplate?.bodyHtml || selectedTemplate?.body_html || '<p class="text-muted-foreground italic text-center mt-10">No content available for this template.</p>' }}
            />
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Create Dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Offer Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input value={newTemplate.name} onChange={e => setNewTemplate({...newTemplate, name: e.target.value})} placeholder="e.g. Standard Developer Offer" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={newTemplate.category} onChange={e => setNewTemplate({...newTemplate, category: e.target.value})} placeholder="e.g. IT Department" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Template Body (HTML)</Label>
              <Textarea 
                value={newTemplate.body_html} 
                onChange={e => setNewTemplate({...newTemplate, body_html: e.target.value})} 
                className="h-64 font-mono text-sm"
                placeholder="<p>Dear {{candidate_name}},</p>..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use {'{{placeholder_name}}'} syntax for dynamic fields. Common placeholders: candidate_name, designation, entity_name, joining_date, ctc.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSaving} className="bg-[#0b646c] hover:bg-[#0b646c]/90 text-white">
              {isSaving ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FileTemplateIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M8 13h2" />
      <path d="M8 17h2" />
      <path d="M14 13h2" />
      <path d="M14 17h2" />
    </svg>
  )
}

