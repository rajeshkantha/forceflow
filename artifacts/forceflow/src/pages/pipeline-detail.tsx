import { AppLayout } from "@/components/app-layout";
import { useParams } from "wouter";
import { useGetPipelineRun } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitBranch, GitCommit, CheckCircle2, XCircle, Loader2, CircleDashed, Check } from "lucide-react";

export default function PipelineDetailPage() {
  const { runId } = useParams();
  const { data: run, isLoading } = useGetPipelineRun(runId || "");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "passed": return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1 text-sm"><CheckCircle2 className="mr-2 h-4 w-4" /> Passed</Badge>;
      case "failed": return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 px-3 py-1 text-sm"><XCircle className="mr-2 h-4 w-4" /> Failed</Badge>;
      case "running": return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 px-3 py-1 text-sm animate-pulse"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running</Badge>;
      default: return <Badge variant="outline" className="px-3 py-1 text-sm"><CircleDashed className="mr-2 h-4 w-4" /> Pending</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <GitBranch className="h-4 w-4" /> {run?.branch || <Skeleton className="h-4 w-20 inline-block" />}
            <span>•</span>
            <GitCommit className="h-4 w-4" /> <span className="font-mono">{run?.commitSha?.substring(0, 7) || <Skeleton className="h-4 w-16 inline-block" />}</span>
          </div>
          <div className="flex justify-between items-start">
            <h1 className="text-2xl font-bold tracking-tight">{run?.commitMessage || <Skeleton className="h-8 w-64" />}</h1>
            {isLoading ? <Skeleton className="h-8 w-24" /> : run && getStatusBadge(run.status)}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div>Started {run ? new Date(run.createdAt).toLocaleString() : <Skeleton className="h-4 w-32 inline-block" />}</div>
            {run?.completedAt && <div>Completed {new Date(run.completedAt).toLocaleString()}</div>}
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Pipeline Stages</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-6">
                {[1, 2, 3].map(i => <div key={i} className="flex gap-4"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-8 w-full" /></div>)}
              </div>
            ) : (
              <div className="space-y-0 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-border">
                {run?.stages && Object.entries(run.stages).map(([stageName, stageData]: [string, any]) => {
                  let Icon = CircleDashed;
                  let iconClass = "text-muted-foreground bg-background";
                  if (stageData.status === "passed") { Icon = Check; iconClass = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"; }
                  else if (stageData.status === "failed") { Icon = XCircle; iconClass = "text-red-500 bg-red-500/10 border-red-500/20"; }
                  else if (stageData.status === "running") { Icon = Loader2; iconClass = "text-blue-500 bg-blue-500/10 border-blue-500/20 animate-spin"; }

                  return (
                    <div key={stageName} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active py-4">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full border border-border shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ${iconClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-border bg-card shadow">
                        <div className="flex items-center justify-between space-x-2 mb-1">
                          <div className="font-bold text-foreground capitalize">{stageName.replace('_', ' ')}</div>
                        </div>
                        <div className="text-sm text-muted-foreground">Status: <span className="capitalize">{stageData.status}</span></div>
                        {stageData.status === "pending_approval" && (
                          <div className="mt-4 pt-4 border-t border-border flex gap-2">
                            <Button size="sm" className="w-full bg-emerald-500 hover:bg-emerald-600">Approve</Button>
                            <Button size="sm" variant="outline" className="w-full text-destructive hover:bg-destructive/10">Reject</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
