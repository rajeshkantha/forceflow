import { AppLayout } from "@/components/app-layout";
import { useListTeamMembers } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, Users, ShieldAlert, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@clerk/react";

export default function TeamPage() {
  const { data: members, isLoading } = useListTeamMembers();
  const { user } = useUser();

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "frontier": return <Badge className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20">Frontier</Badge>;
      case "developer": return <Badge className="bg-cyan-500/10 text-cyan-500 border-cyan-500/20">Developer</Badge>;
      case "sales": return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Sales</Badge>;
      case "support": return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Support</Badge>;
      case "sme": return <Badge className="bg-violet-500/10 text-violet-500 border-violet-500/20">SME</Badge>;
      default: return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
            <p className="text-muted-foreground">Manage access and roles for your workspace.</p>
          </div>
          <Button><Plus className="mr-2 h-4 w-4" /> Invite Member</Button>
        </div>

        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : members?.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>{member.userEmail.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">
                          {member.userId === user?.id ? "You" : member.userEmail.split('@')[0]}
                        </div>
                        <div className="text-xs text-muted-foreground">{member.userEmail}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(member.role)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(member.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && !members?.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No team members found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
