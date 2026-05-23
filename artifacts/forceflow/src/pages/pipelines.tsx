import { AppLayout } from "@/components/app-layout";
import { useListPipelineRuns, useGetPipelineStats } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GitBranch, GitCommit, CheckCircle2, XCircle, Loader2, CircleDashed, GitMerge } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "passed": return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><CheckCircle2 className="mr-1 h-3 w-3" />Passed</Badge>;
    case "failed": return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="mr-1 h-3 w-3" />Failed</Badge>;
    case "running": return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse"><Loader2 className="mr-1 h-3 w-3 animate-spin" />Running</Badge>;
    case "cancelled": return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20"><XCircle className="mr-1 h-3 w-3" />Cancelled</Badge>;
    default: return <Badge variant="outline"><CircleDashed className="mr-1 h-3 w-3" />Pending</Badge>;
  }
}

export default function PipelinesPage() {
  const { data: runs, isLoading } = useListPipelineRuns();
  const { data: stats, isLoading: statsLoading } = useGetPipelineStats();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pipelines</h1>
            <p className="text-muted-foreground mt-1">Monitor CI/CD runs, deployments, and stage approvals.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Runs", value: stats?.total, color: "text-foreground" },
            { label: "Passed", value: stats?.passed, color: "text-emerald-400" },
            { label: "Failed", value: stats?.failed, color: "text-red-400" },
            { label: "Running", value: stats?.running, color: "text-blue-400" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                {statsLoading ? <Skeleton className="h-8 w-16 mx-auto" /> : (
                  <p className={cn("text-2xl font-bold", s.color)}>{s.value ?? 0}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Runs table */}
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Commit</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Started</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                : !runs?.length
                ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <GitBranch className="h-8 w-8 text-muted-foreground/40" />
                          <p>No pipeline runs yet.</p>
                          <p className="text-xs">Connect a GitHub/GitLab repo in Settings to enable CI/CD.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                : runs.map(run => (
                    <TableRow key={run.id} className="hover:bg-muted/20">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <GitCommit className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="font-medium text-sm truncate max-w-xs">{run.commitMessage || "No message"}</p>
                            <p className="text-xs text-muted-foreground font-mono">{run.commitSha?.slice(0, 7) ?? "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <GitMerge className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-mono text-xs">{run.branch ?? "main"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{run.triggerType ?? "manual"}</Badge>
                      </TableCell>
                      <TableCell><StatusBadge status={run.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-muted-foreground text-xs">{new Date(run.createdAt).toLocaleString()}</span>
                          <Link href={`/pipelines/${run.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 text-xs">Details</Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
              }
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
