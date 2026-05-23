import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { useListThreads, useCreateThread, useDeleteThread, useListOrgs, useListModelConfigs, getListThreadsQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Trash2, Bot, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/react";

const ROLES = [
  { id: "frontier", label: "Frontier", description: "Full access — architecture, code, governance", bgClass: "bg-indigo-500/10", textClass: "text-indigo-400", borderClass: "border-indigo-500/30" },
  { id: "developer", label: "Developer", description: "Config, Apex, Flows, Validation Rules", bgClass: "bg-cyan-500/10", textClass: "text-cyan-400", borderClass: "border-cyan-500/30" },
  { id: "sales", label: "Sales", description: "Pipeline, opps, leads, forecasting", bgClass: "bg-emerald-500/10", textClass: "text-emerald-400", borderClass: "border-emerald-500/30" },
  { id: "support", label: "Support", description: "Cases, knowledge, SLAs, escalations", bgClass: "bg-amber-500/10", textClass: "text-amber-400", borderClass: "border-amber-500/30" },
  { id: "sme", label: "SME", description: "Deep read-only org analysis and explanation", bgClass: "bg-violet-500/10", textClass: "text-violet-400", borderClass: "border-violet-500/30" },
];

const ROLE_CONFIG: Record<string, { label: string; bgClass: string; textClass: string; borderClass: string }> = Object.fromEntries(ROLES.map(r => [r.id, r]));

function NewChatModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { data: orgs = [] } = useListOrgs();
  const { data: models = [] } = useListModelConfigs();
  const createThread = useCreateThread();

  const [selectedRole, setSelectedRole] = useState("developer");
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [title, setTitle] = useState("");

  const defaultModel = models.find(m => m.isDefault);
  const memberRole = "frontier"; // TODO: get from tenant context

  const handleCreate = () => {
    createThread.mutate(
      {
        data: {
          role: selectedRole as any,
          orgId: selectedOrgId || undefined,
          modelId: selectedModelId || (defaultModel?.id ?? undefined),
          title: title.trim() || undefined,
        },
      },
      {
        onSuccess: (thread) => {
          queryClient.invalidateQueries({ queryKey: getListThreadsQueryKey() });
          onClose();
          setLocation(`/chat/${thread.id}`);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" /> New Agent Chat
          </DialogTitle>
          <DialogDescription>Choose an agent role, org, and model to start a new conversation.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Role picker */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Agent Role</Label>
            <div className="grid grid-cols-1 gap-2">
              {ROLES.map(role => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                    selectedRole === role.id
                      ? cn("border-primary/50 bg-primary/5", role.bgClass)
                      : "border-border/60 hover:border-border"
                  )}
                >
                  <div className={cn("mt-0.5 h-2 w-2 rounded-full shrink-0", selectedRole === role.id ? `bg-current ${role.textClass}` : "bg-muted-foreground/40")} />
                  <div>
                    <p className={cn("text-sm font-medium", selectedRole === role.id ? role.textClass : "text-foreground")}>{role.label} Agent</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Org */}
          <div className="space-y-1.5">
            <Label htmlFor="org">Salesforce Org <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
              <SelectTrigger id="org">
                <SelectValue placeholder="Select an org..." />
              </SelectTrigger>
              <SelectContent>
                {orgs.length === 0 && <SelectItem value="_none" disabled>No orgs connected</SelectItem>}
                {orgs.map(org => (
                  <SelectItem key={org.id} value={org.id}>
                    <span className={cn("mr-1.5 inline-block h-1.5 w-1.5 rounded-full", org.status === "connected" ? "bg-emerald-500" : "bg-slate-500")} />
                    {org.label}
                    <span className="ml-1 text-muted-foreground text-xs">({org.orgType})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model */}
          <div className="space-y-1.5">
            <Label htmlFor="model">AI Model <span className="text-muted-foreground font-normal">(optional — uses default)</span></Label>
            <Select value={selectedModelId} onValueChange={setSelectedModelId}>
              <SelectTrigger id="model">
                <SelectValue placeholder={defaultModel ? `Default: ${defaultModel.label ?? defaultModel.modelName}` : "Select a model..."} />
              </SelectTrigger>
              <SelectContent>
                {models.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.label ?? model.modelName}
                    {model.isDefault && <span className="ml-1 text-muted-foreground text-xs">(default)</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title">Title <span className="text-muted-foreground font-normal">(optional — auto-generated from first message)</span></Label>
            <Input id="title" placeholder="e.g. Renewal tracking feature" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <Button className="w-full" onClick={handleCreate} disabled={createThread.isPending}>
            {createThread.isPending ? "Creating..." : "Start Chat"}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ChatListPage() {
  const { data: threads, isLoading } = useListThreads();
  const deleteThread = useDeleteThread();
  const queryClient = useQueryClient();
  const [newChatOpen, setNewChatOpen] = useState(false);

  const groupedThreads = threads?.reduce((acc, thread) => {
    const role = thread.role;
    if (!acc[role]) acc[role] = [];
    acc[role].push(thread);
    return acc;
  }, {} as Record<string, typeof threads>) ?? {};

  const handleDelete = (e: React.MouseEvent, threadId: string) => {
    e.preventDefault();
    e.stopPropagation();
    deleteThread.mutate({ threadId }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListThreadsQueryKey() }),
    });
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-10rem)] border border-border rounded-lg overflow-hidden bg-card">
        {/* Sidebar */}
        <div className="w-72 border-r border-border flex flex-col h-full bg-background shrink-0">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h2 className="font-semibold text-sm">Agent Chats</h2>
            <Button size="sm" onClick={() => setNewChatOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Chat
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {isLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : !threads?.length ? (
              <div className="text-center py-8 text-muted-foreground text-sm space-y-3">
                <Bot className="h-8 w-8 mx-auto text-muted-foreground/40" />
                <p>No chats yet</p>
                <Button variant="outline" size="sm" onClick={() => setNewChatOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Start your first chat
                </Button>
              </div>
            ) : (
              Object.entries(groupedThreads).map(([role, roleThreads]) => {
                const cfg = ROLE_CONFIG[role];
                return (
                  <div key={role} className="space-y-1">
                    <div className="flex items-center gap-2 px-2 mb-1">
                      <span className={cn("text-[10px] font-bold uppercase tracking-widest", cfg?.textClass ?? "text-muted-foreground")}>
                        {cfg?.label ?? role} Agent
                      </span>
                    </div>
                    {roleThreads.map(thread => (
                      <Link key={thread.id} href={`/chat/${thread.id}`}>
                        <div className={cn(
                          "p-2.5 rounded-md cursor-pointer transition-colors group flex justify-between items-start",
                          "hover:bg-muted/60"
                        )}>
                          <div className="overflow-hidden flex-1 pr-1">
                            <div className="font-medium text-sm truncate text-foreground/90">{thread.title || "New Conversation"}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">{new Date(thread.createdAt).toLocaleDateString()}</div>
                          </div>
                          <button
                            className="h-6 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive rounded transition-all shrink-0"
                            onClick={e => handleDelete(e, thread.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </Link>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Empty state center */}
        <div className="flex-1 flex flex-col items-center justify-center bg-background/30 gap-4">
          <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
            <Bot className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">ForceFlow AI Agents</p>
            <p className="text-sm text-muted-foreground mt-1">Select a conversation or start a new one.</p>
          </div>
          <Button onClick={() => setNewChatOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Agent Chat
          </Button>
        </div>
      </div>

      <NewChatModal open={newChatOpen} onClose={() => setNewChatOpen(false)} />
    </AppLayout>
  );
}
