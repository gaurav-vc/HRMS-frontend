import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { orgEngineApi } from '@/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Network, Search, Plus, Trash2, Copy, ShieldAlert, FolderTree, Building2, MapPin, Briefcase, Users, LayoutDashboard } from 'lucide-react';
import { toast } from 'sonner';
import { Tree, TreeNode } from 'react-organizational-chart';

export const Route = createFileRoute('/insights/org-tree')({
  component: OrgTreePage,
});

function OrgTreePage() {
  const [tree, setTree] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [nodeTypes, setNodeTypes] = useState<any[]>([]);
  
  // Add Node State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addParentNode, setAddParentNode] = useState<any>(null);
  const [addNodeName, setAddNodeName] = useState('');
  const [addNodeTypeId, setAddNodeTypeId] = useState('');
  
  // Drag and drop state
  const [draggedNode, setDraggedNode] = useState<any>(null);

  // Impact Analysis State
  const [impactModalOpen, setImpactModalOpen] = useState(false);
  const [impactReport, setImpactReport] = useState<any>(null);
  const [pendingAction, setPendingAction] = useState<{type: 'MOVE'|'ARCHIVE', node: any, targetNode?: any} | null>(null);

  const fetchTree = async () => {
    try {
      const data = await orgEngineApi.getTree();
      setTree(data);
      if (data.length > 0) {
        setExpandedNodes(new Set([data[0].id]));
      }
    } catch (e: any) {
      toast.error("Failed to load organization tree");
    } finally {
      setLoading(false);
    }
  };

  const fetchNodeTypes = async () => {
    try {
      const types = await orgEngineApi.getNodeTypes();
      setNodeTypes(types);
      if (types.length > 0) setAddNodeTypeId(types[0].id.toString());
    } catch (e: any) {
      toast.error("Failed to load node types");
    }
  };

  useEffect(() => {
    fetchTree();
    fetchNodeTypes();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addNodeName || !addNodeTypeId) {
      toast.error("Please fill in all fields");
      return;
    }
    
    try {
      await orgEngineApi.createNode({
        name: addNodeName,
        node_type_id: parseInt(addNodeTypeId),
        parent: addParentNode ? addParentNode.id : null
      });
      toast.success("Node added successfully");
      setIsAddModalOpen(false);
      setAddNodeName('');
      fetchTree();
    } catch (error: any) {
      toast.error("Failed to add node");
    }
  };

  const handleDragStart = (e: React.DragEvent, node: any) => {
    e.stopPropagation();
    setDraggedNode(node);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetNode: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedNode || draggedNode.id === targetNode.id) return;
    
    try {
      // Step 1: Run Pre-Commit Impact Analysis
      const report = await orgEngineApi.impactAnalysis(draggedNode.id, 'MOVE', targetNode.id);
      
      if (report.cycle_detected) {
        toast.error("Action denied: This move would create an illegal circular dependency.");
        setDraggedNode(null);
        return;
      }
      
      setImpactReport(report);
      setPendingAction({ type: 'MOVE', node: draggedNode, targetNode });
      setImpactModalOpen(true);
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Failed to analyze impact");
      setDraggedNode(null);
    }
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    
    setImpactModalOpen(false);
    
    try {
      if (pendingAction.type === 'MOVE') {
        await orgEngineApi.moveNode(pendingAction.node.id, pendingAction.targetNode.id);
        toast.success(`Moved ${pendingAction.node.name} under ${pendingAction.targetNode.name}`);
      } else if (pendingAction.type === 'ARCHIVE') {
        await orgEngineApi.archiveNode(pendingAction.node.id);
        toast.success(`Archived ${pendingAction.node.name} successfully`);
      }
      fetchTree();
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Failed to complete action");
    } finally {
      setDraggedNode(null);
      setPendingAction(null);
    }
  };

  const handleClone = async (node: any) => {
    if (!confirm(`Are you sure you want to clone ${node.name} and all its children?`)) return;
    try {
      await orgEngineApi.cloneNode(node.id, node.parent_id);
      toast.success(`Cloned ${node.name} successfully`);
      fetchTree();
    } catch (e: any) {
      toast.error("Failed to clone node");
    }
  };

  const handleArchive = async (node: any) => {
    try {
      // Run Impact Analysis before archiving
      const report = await orgEngineApi.impactAnalysis(node.id, 'ARCHIVE');
      setImpactReport(report);
      setPendingAction({ type: 'ARCHIVE', node });
      setImpactModalOpen(true);
    } catch (e: any) {
      toast.error("Failed to analyze impact");
    }
  };

  // Expand/Collapse State
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());

  // Edit Node State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editNode, setEditNode] = useState<any>(null);
  const [editNodeName, setEditNodeName] = useState('');
  const [editNodeTypeId, setEditNodeTypeId] = useState('');

  const toggleExpand = (e: React.MouseEvent, nodeId: number) => {
    e.stopPropagation();
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNodeName || !editNodeTypeId) {
      toast.error("Please fill in all fields");
      return;
    }
    
    try {
      await orgEngineApi.updateNode(editNode.id, {
        name: editNodeName,
        node_type_id: parseInt(editNodeTypeId),
      });
      toast.success("Node updated successfully");
      setIsEditModalOpen(false);
      fetchTree();
    } catch (error: any) {
      toast.error("Failed to update node");
    }
  };

  const StyledNode = ({ node, parentNodeName, employees = [] }: { node: any, parentNodeName?: string, employees?: any[] }) => {
    const isMatch = search && node.name.toLowerCase().includes(search.toLowerCase());
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    
    // Safely extract type string in case of API inconsistencies
    const typeStr = (node.node_type || node.type || node.nodeType || "Role").toString();
    
    let Icon = FolderTree;
    if (typeStr === 'Organisation' || typeStr === 'Group') Icon = Building2;
    if (typeStr === 'Entity' || typeStr === 'Legal Entity') Icon = Briefcase;
    if (typeStr === 'Branch') Icon = Network;
    if (typeStr === 'Site' || typeStr === 'City' || typeStr === 'Region' || typeStr === 'State') Icon = MapPin;
    if (typeStr === 'Department') Icon = LayoutDashboard;
    if (typeStr === 'Designation' || typeStr === 'Role' || typeStr === 'Position') Icon = ShieldAlert;
    if (typeStr === 'Employee') Icon = Users;

    const NodeBox = ({ employee }: { employee?: any }) => (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, node)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, node)}
        className={`inline-block min-w-[220px] p-4 border rounded-xl bg-card shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-move group relative ${isMatch ? 'ring-2 ring-primary bg-primary/5' : ''}`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-full text-primary group-hover:scale-110 transition-transform">
            <Icon className="h-6 w-6" />
          </div>
          <div className="text-center">
            {employee && (
              <div className="mb-2">
                <div className="font-bold text-base text-primary">
                  {employee.name}
                </div>
              </div>
            )}
            <div className={`font-semibold text-sm ${employee ? 'text-muted-foreground' : ''}`}>{node.name}</div>
            <div className="text-[10px] text-muted-foreground mt-1 font-medium px-2 py-0.5 bg-muted rounded-full inline-block">
              {typeStr}
            </div>
            {parentNodeName && (
              <div className="text-[11px] text-muted-foreground mt-3 border-t pt-2 w-full text-center">
                Reports to: <span className="font-semibold text-foreground">{parentNodeName}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="outline" size="icon" className="h-7 w-7 rounded-full" title="Add Child" onClick={(e) => { e.stopPropagation(); setAddParentNode(node); setIsAddModalOpen(true); }}>
            <Plus className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7 rounded-full" title="Edit Node" onClick={(e) => { 
            e.stopPropagation(); 
            setEditNode(node);
            setEditNodeName(node.name);
            const nt = nodeTypes.find((t:any) => t.name === node.node_type);
            if (nt) setEditNodeTypeId(nt.id.toString());
            setIsEditModalOpen(true); 
          }}>
            <Briefcase className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7 rounded-full text-destructive hover:bg-destructive/10" title="Archive Node" onClick={(e) => { e.stopPropagation(); handleArchive(node); }}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );

    const renderContent = () => {
      if (employees.length > 1) {
        return (
          <div className="flex flex-row justify-center items-center gap-4">
            {employees.map(emp => (
              <NodeBox key={emp.id} employee={emp} />
            ))}
          </div>
        );
      }
      return <NodeBox employee={employees[0]} />;
    };

    return (
      <div className="relative inline-block mt-4 mb-2">
        {parentNodeName && (
          <div 
            className="absolute -top-[16px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-[#818cf8] z-10"
          />
        )}
        {renderContent()}
      </div>
    );
  };

  const renderTreeNodes = (nodes: any[], parentNodeName?: string) => {
    return nodes
      .filter((n) => {
        const tStr = n.node_type || n.type || n.nodeType || "";
        return n.status !== 'Archived' && tStr.toLowerCase() !== 'employee';
      })
      .map((node) => {
        const employees = (node.children || []).filter((c: any) => {
          const tStr = c.node_type || c.type || c.nodeType || "";
          return tStr.toLowerCase() === 'employee' && c.status !== 'Archived';
        });
        const regularChildren = (node.children || []).filter((c: any) => {
          const tStr = c.node_type || c.type || c.nodeType || "";
          return tStr.toLowerCase() !== 'employee';
        });
        const hasChildren = regularChildren.length > 0;
        
        return (
          <TreeNode key={node.id} label={<StyledNode node={node} parentNodeName={parentNodeName} employees={employees} />}>
            {hasChildren && renderTreeNodes(regularChildren, node.name)}
          </TreeNode>
        );
      });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Network className="h-8 w-8 text-primary" />
            Organization Hierarchy
          </h1>
          <p className="text-muted-foreground mt-1">
            Drag and drop nodes to restructure the entire organization instantly.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search nodes..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => { setAddParentNode(null); setIsAddModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Root Node
          </Button>
        </div>
      </div>

      <Card className="p-6 bg-muted/20 min-h-[500px]">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Loading hierarchy...
          </div>
        ) : tree.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-4">
            <ShieldAlert className="h-10 w-10 text-muted-foreground/50" />
            <p>No organization nodes found.</p>
            <p className="text-sm">Run the seed data script to populate the hierarchy.</p>
          </div>
        ) : (
          <div className="overflow-auto pb-10 flex justify-center w-full">
            <div className="inline-block p-4">
              {tree.filter((n) => n.status !== 'Archived').map(rootNode => {
                const rootEmployees = (rootNode.children || []).filter((c: any) => {
                  const tStr = c.node_type || c.type || c.nodeType || "";
                  return tStr.toLowerCase() === 'employee' && c.status !== 'Archived';
                });
                const regularChildren = (rootNode.children || []).filter((c: any) => {
                  const tStr = c.node_type || c.type || c.nodeType || "";
                  return tStr.toLowerCase() !== 'employee';
                });
                
                return (
                  <Tree
                    key={rootNode.id}
                    lineWidth={'3px'}
                    lineColor={'#818cf8'}
                    lineBorderRadius={'12px'}
                    label={<StyledNode node={rootNode} employees={rootEmployees} />}
                  >
                    {regularChildren.length > 0 && renderTreeNodes(regularChildren)}
                  </Tree>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{addParentNode ? `Add Child to ${addParentNode.name}` : 'Add Root Node'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Node Name</label>
              <Input 
                value={addNodeName} 
                onChange={(e) => setAddNodeName(e.target.value)} 
                placeholder="e.g. Sales Department" 
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Node Type</label>
              <select 
                value={addNodeTypeId}
                onChange={(e) => setAddNodeTypeId(e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {nodeTypes.map(nt => (
                  <option key={nt.id} value={nt.id}>{nt.name}</option>
                ))}
              </select>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
              <Button type="submit">Create Node</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Node: {editNode?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Node Name</label>
              <Input 
                value={editNodeName} 
                onChange={(e) => setEditNodeName(e.target.value)} 
                placeholder="e.g. Sales Department" 
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Node Type</label>
              <select 
                value={editNodeTypeId}
                onChange={(e) => setEditNodeTypeId(e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {nodeTypes.map(nt => (
                  <option key={nt.id} value={nt.id}>{nt.name}</option>
                ))}
              </select>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={impactModalOpen} onOpenChange={setImpactModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-warning" />
              Pre-Commit Impact Analysis
            </DialogTitle>
          </DialogHeader>
          {impactReport && (
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                You are about to {impactReport.action.toLowerCase()} <strong>{impactReport.target_node}</strong>. 
                This action will ripple through the organization tree and affect the following items:
              </p>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/50 p-4 rounded-xl text-center border">
                  <div className="text-2xl font-bold text-primary">{impactReport.total_nodes_affected}</div>
                  <div className="text-xs text-muted-foreground mt-1">Total Nodes</div>
                </div>
                <div className="bg-muted/50 p-4 rounded-xl text-center border">
                  <div className="text-2xl font-bold text-primary">{impactReport.employees_affected}</div>
                  <div className="text-xs text-muted-foreground mt-1">Employees</div>
                </div>
                <div className="bg-muted/50 p-4 rounded-xl text-center border">
                  <div className="text-2xl font-bold text-primary">{impactReport.departments_affected}</div>
                  <div className="text-xs text-muted-foreground mt-1">Departments</div>
                </div>
              </div>
              
              <div className="bg-warning/10 text-warning-foreground border border-warning/20 p-3 rounded-lg text-sm flex gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <p>This structural change will automatically re-calculate materialized paths and create immutable audit logs in the Hierarchy History Engine.</p>
              </div>
            </div>
          )}
          <DialogFooter className="pt-6">
            <Button type="button" variant="outline" onClick={() => setImpactModalOpen(false)}>Cancel</Button>
            <Button onClick={confirmAction} variant={pendingAction?.type === 'ARCHIVE' ? 'destructive' : 'default'}>
              Confirm {pendingAction?.type === 'ARCHIVE' ? 'Archive' : 'Move'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
