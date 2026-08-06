import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { useEffect, useState } from "react";
import { offerTemplatesApi } from "@/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilePlus, FileText, Trash2, X, Edit2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  const [openEdit, setOpenEdit] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);

  const [newTemplate, setNewTemplate] = useState({
    name: "",
    category: "",
    body_html:
      "<h2>Offer of Employment</h2><p>Dear {{candidate_name}},</p><p>We are pleased to offer you the position of {{designation}} at {{entity_name}}.</p>",
    placeholders: ["candidate_name", "designation", "entity_name"],
    header_html: "",
    footer_html: "",
    header_image: null as File | null,
    footer_image: null as File | null,
    header_image_width: "535",
    header_image_align: "center",
    footer_image_width: "535",
    footer_image_align: "center",
  });

  const fetchData = () => {
    offerTemplatesApi
      .getAll()
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
        body_html:
          "<h2>Offer of Employment</h2><p>Dear {{candidate_name}},</p><p>We are pleased to offer you the position of {{designation}} at {{entity_name}}.</p>",
        placeholders: ["candidate_name", "designation", "entity_name"],
        header_html: "",
        footer_html: "",
        header_image: null,
        footer_image: null,
        header_image_width: "535",
        header_image_align: "center",
        footer_image_width: "535",
        footer_image_align: "center",
      });
    } catch (err: any) {
      toast.error(`Error: ${err.message || "Failed to create"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditOpen = (template: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTemplate({
      id: template.id,
      name: template.name || "",
      category: template.category || "",
      body_html: template.body_html || template.bodyHtml || "",
      header_html: template.header_html || template.headerHtml || "",
      footer_html: template.footer_html || template.footerHtml || "",
      header_image: null,
      footer_image: null,
      header_image_width: template.header_image_width || "535",
      header_image_align: template.header_image_align || "center",
      footer_image_width: template.footer_image_width || "535",
      footer_image_align: template.footer_image_align || "center",
    });
    setOpenEdit(true);
  };

  const handleUpdate = async () => {
    if (!editingTemplate.name) return toast.error("Name is required");
    setIsSaving(true);
    try {
      const updateData: any = {
        name: editingTemplate.name,
        category: editingTemplate.category,
        body_html: editingTemplate.body_html,
        header_html: editingTemplate.header_html,
        footer_html: editingTemplate.footer_html,
        header_image_width: editingTemplate.header_image_width,
        header_image_align: editingTemplate.header_image_align,
        footer_image_width: editingTemplate.footer_image_width,
        footer_image_align: editingTemplate.footer_image_align,
      };
      if (editingTemplate.header_image) updateData.header_image = editingTemplate.header_image;
      if (editingTemplate.footer_image) updateData.footer_image = editingTemplate.footer_image;

      await offerTemplatesApi.update(editingTemplate.id, updateData);
      toast.success("Template updated successfully");
      setOpenEdit(false);
      fetchData();
    } catch (err: any) {
      toast.error(`Error: ${err.message || "Failed to update"}`);
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
        <PageHeader
          title="Offer Templates"
          description="Reusable templates with dynamic placeholders. HR can add custom ones per role and entity."
        />
        <Button
          onClick={() => setOpenCreate(true)}
          className="bg-[#0b646c] hover:bg-[#0b646c]/90 text-white flex gap-2 h-10 px-4"
        >
          <FilePlus className="w-4 h-4" /> New Template
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Loading templates...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {data.map((template) => (
            <Card
              key={template.id}
              className="p-5 flex flex-col hover:border-[#0b646c]/50 transition-colors cursor-pointer group shadow-sm hover:shadow-md relative"
              onClick={() => setSelectedTemplate(template)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="h-10 w-10 bg-[#0b646c]/10 text-[#0b646c] rounded-lg flex items-center justify-center group-hover:bg-[#0b646c]/20 transition-colors">
                  <FileText className="h-5 w-5" />
                </div>
                
                <div className="relative h-8 w-16 flex justify-end">
                  {/* Badge visible by default, fades out on hover */}
                  <div className="absolute top-0 right-0 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50 px-2 py-1 rounded transition-opacity duration-200 group-hover:opacity-0">
                    {template.category || "General"}
                  </div>
                  
                  {/* Buttons hidden by default, fade in on hover */}
                  <div className="absolute -top-1 -right-1 flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-[#0b646c] hover:bg-[#0b646c]/10"
                      onClick={(e) => handleEditOpen(template, e)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDelete(template.id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <h3 className="font-semibold text-base text-foreground pr-6">{template.name}</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Updated {new Date(template.updatedAt || template.updated_at).toLocaleDateString()}
              </p>

              <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-dashed">
                {(template.placeholders || []).slice(0, 4).map((p: string, i: number) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-muted/30 border border-muted/60 rounded text-[10px] font-mono text-muted-foreground whitespace-nowrap"
                  >
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
              <div className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50 flex items-center justify-center rounded-full bg-muted">
                <FileText className="h-6 w-6" />
              </div>
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
              <DialogTitle className="text-lg font-semibold text-slate-800">
                {selectedTemplate?.name}
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-1">
                Preview of the offer letter template structure.
              </p>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-8 bg-slate-100 flex justify-center">
            <div className="bg-white shadow-lg p-10 max-w-3xl w-full min-h-full rounded border flex flex-col">
              
              {/* Header */}
              <div className="mb-6 pb-4 border-b border-dashed flex w-full" style={{ justifyContent: (selectedTemplate?.header_image_align || 'center') === 'left' ? 'flex-start' : (selectedTemplate?.header_image_align === 'right' ? 'flex-end' : 'center') }}>
                {selectedTemplate?.header_html || selectedTemplate?.headerHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: selectedTemplate?.header_html || selectedTemplate?.headerHtml || '' }} />
                ) : (selectedTemplate?.header_image || selectedTemplate?.headerImage) ? (
                  <img src={(selectedTemplate?.header_image || selectedTemplate?.headerImage) as string} alt="Header" className="object-contain" style={{ width: `${(Number(selectedTemplate?.header_image_width || 535) / 535) * 100}%` }} />
                ) : null}
              </div>
              
              {/* Body */}
              <div
                className="prose prose-sm prose-slate max-w-none flex-1"
                dangerouslySetInnerHTML={{
                  __html:
                    selectedTemplate?.bodyHtml ||
                    selectedTemplate?.body_html ||
                    '<p class="text-muted-foreground italic text-center mt-10">No content available for this template.</p>',
                }}
              />
              
              {/* Footer */}
              <div className="mt-8 pt-4 border-t border-dashed flex w-full" style={{ justifyContent: (selectedTemplate?.footer_image_align || 'center') === 'left' ? 'flex-start' : (selectedTemplate?.footer_image_align === 'right' ? 'flex-end' : 'center') }}>
                {selectedTemplate?.footer_html || selectedTemplate?.footerHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: selectedTemplate?.footer_html || selectedTemplate?.footerHtml || '' }} />
                ) : (selectedTemplate?.footer_image || selectedTemplate?.footerImage) ? (
                  <img src={(selectedTemplate?.footer_image || selectedTemplate?.footerImage) as string} alt="Footer" className="object-contain" style={{ width: `${(Number(selectedTemplate?.footer_image_width || 535) / 535) * 100}%` }} />
                ) : null}
              </div>

            </div>
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
                <Input
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="e.g. Standard Developer Offer"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                  placeholder="e.g. IT Department"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Header HTML (Optional)</Label>
                <Textarea
                  value={newTemplate.header_html}
                  onChange={(e) => setNewTemplate({ ...newTemplate, header_html: e.target.value })}
                  className="font-mono text-xs h-20"
                  placeholder="<div>Custom Header...</div>"
                />
              </div>
              <div className="space-y-2">
                <Label>Footer HTML (Optional)</Label>
                <Textarea
                  value={newTemplate.footer_html}
                  onChange={(e) => setNewTemplate({ ...newTemplate, footer_html: e.target.value })}
                  className="font-mono text-xs h-20"
                  placeholder="<div>Custom Footer...</div>"
                />
              </div>
            </div>



            <div className="space-y-2">
              <Label>Template Body (HTML)</Label>
              <Textarea
                value={newTemplate.body_html}
                onChange={(e) => setNewTemplate({ ...newTemplate, body_html: e.target.value })}
                className="h-64 font-mono text-sm"
                placeholder="<p>Dear {{candidate_name}},</p>..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use {"{{placeholder_name}}"} syntax for dynamic fields. Common placeholders:
                candidate_name, designation, entity_name, joining_date, ctc.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isSaving}
              className="bg-[#0b646c] hover:bg-[#0b646c]/90 text-white"
            >
              {isSaving ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Offer Template</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    value={editingTemplate.category}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Header HTML (Optional)</Label>
                  <Textarea
                    value={editingTemplate.header_html}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, header_html: e.target.value })}
                    className="font-mono text-xs h-20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Footer HTML (Optional)</Label>
                  <Textarea
                    value={editingTemplate.footer_html}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, footer_html: e.target.value })}
                    className="font-mono text-xs h-20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Template Body (HTML)</Label>
                <Textarea
                  value={editingTemplate.body_html}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, body_html: e.target.value })}
                  className="h-64 font-mono text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEdit(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={isSaving}
              className="bg-[#0b646c] hover:bg-[#0b646c]/90 text-white"
            >
              {isSaving ? "Saving..." : "Save Changes"}
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
  );
}
