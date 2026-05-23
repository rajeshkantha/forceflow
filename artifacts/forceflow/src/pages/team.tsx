import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { useListTeamMembers, useInviteTeamMember, useUpdateTeamMember, useRemoveTeamMember, getListTeamMembersQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Mail, RefreshCw, Copy, Check } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const ROLES = [
  { id: "frontier", label: "Frontier", description: "Full access — same as owner", bgClass: "bg-indigo-500/10", textClass: "text-indigo-400", borderClass: "border-indigo-500/30" },
  { id: "developer", label: "Developer", description: "Config, Apex, Flows, deployments", bgClass: "bg-cyan-500/10", textClass: "text-cyan-400", borderClass: "border-cyan-500/30" },
  { id: "sales", label: "Sales", description: "Pipeline and CRM data", bgClass: "bg-emerald-500/10", textClass: "text-emerald-400", borderClass: "border-emerald-500/30" },
  { id: "support", label: "Support", description: "Cases, SLAs, knowledge", bgClass: "bg-amber-500/10", textClass: "text-amber-400", borderClass: "border-amber-500/30" },
  { id: "sme", label: "SME", description: "Read-only org analysis", bgClass: "bg-violet-500/10", textClass: "text-violet-400", borderClass: "border-violet-500/30" },
];

function getRoleBadge(role: string) {
  const r = ROLES.find(x => x.id === role);
  if (!r) return <Badge variant="outline">{role}</Badge>;
  return <Badge className={cn("text-xs border", r.bgClass, r.textClass, r.borderClass)}>{r.label}</Badge>;
}

function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const inviteTeamMember = useInviteTeamMember();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("developer");
  const [inviteResult, setInviteResult] = useState<{ token: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleInvite = () => {
    if (!email.trim()) return;
    inviteTeamMember.mutate(
      { data: { email: email.trim(), role: role as any } },
      {
        onSuccess: (result) => {
          queryClient.invalidateQueries({ queryKey: getListTeamMembersQueryKey() });
          setInviteResult({ token: result.token, email: result.email });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.message ?? "Failed to send invite", variant: "destructive" });
        },
      }
    );
  };

  const inviteLink = inviteResult ? `${window.location.origin}/onboarding/invite?token=${inviteResult.token}` : "";

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setEmail(""); setRole("developer"); setInviteResult(null); setCopied(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> Invite Team Member</DialogTitle>
          <DialogDescription>Send an invite link to a new team member. They'll join your workspace with the selected role.</DialogDescription>
        </DialogHeader>

        {!inviteResult ? (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleInvite()}
              />
            </div>

            <div className="space-y-2">
              <Label>Agent Role</Label>
              <div className="grid gap-2">
                {ROLES.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                      role === r.id ? cn("border-primary/50", r.bgClass) : "border-border/60 hover:border-border"
                    )}
                  >
                    <div className={cn("h-2 w-2 rounded-full shrink-0", role === r.id ? `bg-current ${r.textClass}` : "bg-muted-foreground/40")} />
                    <div>
                      <p className={cn("text-sm font-medium", role === r.id ? r.textClass : "text-foreground")}>{r.label}</p>
                      <p className="text-xs text-muted-foreground">{r.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Button className="w-full" onClick={handleInvite} disabled={!email.trim() || inviteTeamMember.isPending}>
              {inviteTeamMember.isPending ? "Sending..." : "Send Invite"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <Check className="h-4 w-4 text-emerald-500 shrink-0" />
              <p className="text-sm text-emerald-400">Invite created for <span className="font-medium">{inviteResult.email}</span></p>
            </div>
            <div className="space-y-1.5">
              <Label>Invite link (share with your team member)</Label>
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={copyLink}>
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Link expires in 7 days.</p>
            </div>
            <Button variant="outline" className="w-full" onClick={handleClose}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditRoleModal({ member, open, onClose }: { member: any; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const updateMember = useUpdateTeamMember();
  const [role, setRole] = useState(member?.role ?? "developer");

  const handleSave = () => {
    updateMember.mutate(
      { memberId: member.id, data: { role: role as any } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTeamMembersQueryKey() });
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Role</DialogTitle>
          <DialogDescription>Update the agent role for {member?.name || member?.email || "this member"}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          {ROLES.map(r => (
            <button
              key={r.id}
              onClick={() => setRole(r.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                role === r.id ? cn("border-primary/50", r.bgClass) : "border-border/60 hover:border-border"
              )}
            >
              <div className={cn("h-2 w-2 rounded-full shrink-0", role === r.id ? `bg-current ${r.textClass}` : "bg-muted-foreground/40")} />
              <div>
                <p className={cn("text-sm font-medium", role === r.id ? r.textClass : "text-foreground")}>{r.label}</p>
                <p className="text-xs text-muted-foreground">{r.description}</p>
              </div>
            </button>
          ))}
          <Button className="w-full" onClick={handleSave} disabled={updateMember.isPending}>
            {updateMember.isPending ? "Saving..." : "Save Role"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TeamPage() {
  const { data: members, isLoading } = useListTeamMembers();
  const removeTeamMember = useRemoveTeamMember();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editMember, setEditMember] = useState<any>(null);

  const handleRemove = (memberId: string) => {
    if (!confirm("Remove this team member?")) return;
    removeTeamMember.mutate({ memberId }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTeamMembersQueryKey() }),
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Team</h1>
            <p className="text-muted-foreground mt-1">Manage access and agent roles for your workspace.</p>
          </div>
          <Button onClick={() => setInviteOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Invite Member
          </Button>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                : members?.map(member => (
                    <TableRow key={member.id} className="hover:bg-muted/20">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-muted">
                              {(member.name || member.email || member.userId || "?").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm flex items-center gap-1.5">
                              {member.userId === user?.id ? "You" : member.name || member.email || member.userId}
                              {member.userId === user?.id && <Badge variant="outline" className="text-[10px] py-0 px-1.5">You</Badge>}
                            </div>
                            {member.email && member.email !== member.userId && (
                              <div className="text-xs text-muted-foreground">{member.email}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(member.role)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {member.userId !== user?.id && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7"
                                onClick={() => setEditMember(member)}
                              >
                                Change Role
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => handleRemove(member.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
              }
              {!isLoading && !members?.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    No team members yet. Invite your first colleague.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
      {editMember && (
        <EditRoleModal member={editMember} open={!!editMember} onClose={() => setEditMember(null)} />
      )}
    </AppLayout>
  );
}
