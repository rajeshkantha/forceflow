import { AppLayout } from "@/components/app-layout";
import { useListPipelineRuns, useGetPipelineStats } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { GitBranch, GitCommit, CheckCircle2, XCircle, Loader2, CircleDashed } from "lucide-react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

export default function PipelinesPage() {
  const { data: runs, isLoading } = useListPipelineRuns();
  const { data: stats, isLoading: isStatsLoading } = useGetPipelineStats();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "passed": return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><CheckCircle2 className="mr-1 h-3 w-3" /> Passed</Badge>;
      case "failed": return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="mr-1 h-3 w-3" /> Failed</Badge>;
      case "running": return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse"><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Running</Badge>;
      default: return <Badge variant="outline"><CircleDashed className="mr-1 h-3 w-3" /> Pending</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipelines</h1>
          <p className="text-muted-foreground">Monitor CI/CD pipeline runs and deployments.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1"><div className="text-sm font-medium text-muted-foreground">Total Runs</div>{isStatsLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stats?.total || 0}</div>}</CardContent></Card>
          <Card><CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1"><div className="text-sm font-medium text-emerald-500">Passed</div>{isStatsLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold text-emerald-500">{stats?.passed || 0}</div>}</CardContent></Card>
          <Card><CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1"><div className="text-sm font-medium text-red-500">Failed</div>{isStatsLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold text-red-500">{stats?.failed || 0}</div>}</CardContent></Card>
          <Card><CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1"><div className="text-sm font-medium text-blue-500">Running</div>{isStatsLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold text-blue-500">{stats?.running || 0}</div>}</CardContent></Card>
        </div>

        <div className="flex gap-4 items-center">
          <Input placeholder="Search branch or commit..." className="max-w-xs" />
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="passed">Passed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="running">Running</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commit</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-6 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : !runs?.length ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No pipeline runs found.</TableCell></TableRow>
              ) : runs.map((run) => (
                <TableRow key={run.id} className="hover:bg-muted/50 cursor-pointer">
                  <TableCell>
                    <Link href={`/pipelines/${run.id}`} className="block">
                      <div className="flex items-center gap-2">
                        <GitCommit className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm">{(run.commitSha || "").substring(0, 7)}</span>
                        <span className="text-muted-foreground text-sm truncate max-w-[200px]">{run.commitMessage}</span>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/pipelines/${run.id}`} className="block">
                      <div className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-muted-foreground" />{run.branch}</div>
                    </Link>
                  </TableCell>
                  <TableCell><Link href={`/pipelines/${run.id}`} className="block">{getStatusBadge(run.status)}</Link></TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    <Link href={`/pipelines/${run.id}`} className="block">{new Date(run.createdAt).toLocaleString()}</Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
