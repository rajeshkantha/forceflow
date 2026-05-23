import { AppLayout } from "@/components/app-layout";
import { useListAnalyses, useApproveAnalysis, getListAnalysesQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, FileText, CheckCircle2, AlertTriangle, Play, XCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

type Analysis = {
  id: string;
  requirementSummary?: string | null;
  status: string;
  currentStateAnalysis?: any;
  gapAnalysis?: any;
  implementationPlan?: any;
  executionLog?: any;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  orgId?: string | null;
};

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "done": return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><CheckCircle2 className="mr-1 h-3 w-3" />Done</Badge>;
    case "approved": return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><Play className="mr-1 h-3 w-3" />Approved</Badge>;
    case "executing": return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse"><Play className="mr-1 h-3 w-3" />Executing</Badge>;
    case "failed": return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="mr-1 h-3 w-3" />Failed</Badge>;
    case "draft": return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20"><AlertTriangle className="mr-1 h-3 w-3" />Needs Approval</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

function JsonBlock({ data, label }: { data: any; label: string }) {
  if (!data) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />{label}
      </h3>
      <div className="p-3 bg-background border border-border rounded-md text-xs font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed max-h-64 overflow-y-auto">
        {typeof data === "string" ? data : JSON.stringify(data, null, 2)}
      </div>
    </div>
  );
}

function PlanSteps({ plan }: { plan: any }) {
  if (!plan) return null;
  const steps: any[] = Array.isArray(plan) ? plan : Array.isArray(plan.steps) ? plan.steps : [];
  if (!steps.length) return <JsonBlock data={plan} label="Implementation Plan" />;

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />Implementation Plan
      </h3>
      <div className="space-y-2">
        {steps.map((step: any, i: number) => (
          <div key={i} className="flex gap-3 p-3 rounded-lg border border-border bg-background/50">
            <div className="h-5 w-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{step.title ?? step.action ?? step.description ?? `Step ${i + 1}`}</p>
              {step.description && step.description !== step.title && (
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
              )}
              {step.effort && <span className="text-xs text-muted-foreground">Est: {step.effort}</span>}
              {step.risk && (
                <span className={cn("ml-2 text-xs font-medium",
                  step.risk === "HIGH" ? "text-red-400" : step.risk === "MEDIUM" ? "text-amber-400" : "text-emerald-400"
                )}>Risk: {step.risk}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalysesPage() {
  const { data: analyses, isLoading } = useListAnalyses();
  const approveAnalysis = useApproveAnalysis();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Analysis | null>(null);

  const handleApprove = (analysisId: string) => {
    approveAnalysis.mutate({ analysisId }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAnalysesQueryKey() }),
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Analyses</h1>
          <p className="text-muted-foreground mt-1">AI-generated implementation plans awaiting your review and approval.</p>
        </div>

        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Requirement</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-64" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                : !analyses?.length
                ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <BrainCircuit className="h-8 w-8 text-muted-foreground/40" />
                          <p>No analyses yet. Analyses are generated when agents build implementation plans in chat.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                : analyses.map(a => (
                    <TableRow key={a.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => setSelected(a as Analysis)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <BrainCircuit className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-medium text-sm truncate max-w-sm">{a.requirementSummary || "Untitled Analysis"}</span>
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={a.status} /></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(a.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-xs">View Plan</Button>
                      </TableCell>
                    </TableRow>
                  ))
              }
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet open={!!selected} onOpenChange={v => !v && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle className="flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5 text-primary" />
                  Implementation Plan
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-6">
                {/* Requirement */}
                <div className="p-4 bg-muted/40 rounded-lg border border-border">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Requirement</p>
                      <p className="text-sm font-medium">{selected.requirementSummary}</p>
                    </div>
                    <StatusBadge status={selected.status} />
                  </div>
                </div>

                <Separator />

                {/* Current state */}
                {selected.currentStateAnalysis && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider text-xs">Current State Analysis</h3>
                    {typeof selected.currentStateAnalysis === "object" && selected.currentStateAnalysis.summary ? (
                      <div className="p-3 bg-background border border-border rounded-md text-sm">
                        {selected.currentStateAnalysis.summary}
                        {selected.currentStateAnalysis.components && (
                          <ul className="mt-2 space-y-1">
                            {selected.currentStateAnalysis.components.map((c: any, i: number) => (
                              <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", c.exists ? "bg-emerald-500" : "bg-red-500")} />
                                {c.name}: {c.status}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : <JsonBlock data={selected.currentStateAnalysis} label="" />}
                  </div>
                )}

                {/* Gap analysis */}
                {selected.gapAnalysis && <JsonBlock data={selected.gapAnalysis} label="Gap Analysis" />}

                {/* Plan steps */}
                <PlanSteps plan={selected.implementationPlan} />

                {/* Execution log */}
                {selected.executionLog && <JsonBlock data={selected.executionLog} label="Execution Log" />}

                {/* Actions */}
                {selected.status === "draft" && (
                  <>
                    <Separator />
                    <div className="flex gap-3">
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => { handleApprove(selected.id); setSelected(null); }}
                        disabled={approveAnalysis.isPending}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Approve & Execute
                      </Button>
                      <Button variant="outline" className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10">
                        Reject Plan
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">Approving will execute all plan steps in sequence with confirmation gates for mutations.</p>
                  </>
                )}

                {selected.approvedBy && (
                  <p className="text-xs text-muted-foreground text-center">
                    Approved {selected.approvedAt ? new Date(selected.approvedAt).toLocaleString() : ""}
                  </p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
