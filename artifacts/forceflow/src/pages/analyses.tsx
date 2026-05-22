import { AppLayout } from "@/components/app-layout";
import { useListAnalyses } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, FileText, CheckCircle2, CircleDashed, AlertCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function AnalysesPage() {
  const { data: analyses, isLoading } = useListAnalyses();
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "done": return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Approved</Badge>;
      case "executing": return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Executing</Badge>;
      case "failed": return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Failed</Badge>;
      case "draft": return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Needs Approval</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Analyses</h1>
          <p className="text-muted-foreground">Review and approve AI-generated implementation plans.</p>
        </div>

        <div className="rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requirement</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                 Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-64" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : !analyses?.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No analyses found.
                  </TableCell>
                </TableRow>
              ) : (
                analyses.map((analysis) => (
                  <TableRow key={analysis.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedAnalysis(analysis)}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BrainCircuit className="h-4 w-4 text-primary" />
                        <span className="font-medium truncate max-w-md block">{analysis.requirementSummary || 'Untitled Analysis'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(analysis.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(analysis.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="sm">View Details</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Sheet open={!!selectedAnalysis} onOpenChange={(open) => !open && setSelectedAnalysis(null)}>
          <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
            <SheetHeader className="mb-6">
              <SheetTitle className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-primary" />
                Analysis Details
              </SheetTitle>
              <SheetDescription>
                Review the AI agent's findings and implementation plan.
              </SheetDescription>
            </SheetHeader>

            {selectedAnalysis && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold mb-2">Requirement</h3>
                  <div className="p-4 bg-muted rounded-md text-sm border border-border">
                    {selectedAnalysis.requirementSummary}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><FileText className="h-4 w-4" /> Current State</h3>
                   <div className="p-4 bg-background border border-border rounded-md text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                     {JSON.stringify(selectedAnalysis.currentStateAnalysis, null, 2)}
                   </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Gap Analysis</h3>
                   <div className="p-4 bg-background border border-border rounded-md text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                     {JSON.stringify(selectedAnalysis.gapAnalysis, null, 2)}
                   </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Implementation Plan</h3>
                   <div className="p-4 bg-background border border-border rounded-md text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                     {JSON.stringify(selectedAnalysis.implementationPlan, null, 2)}
                   </div>
                </div>

                {selectedAnalysis.status === 'draft' && (
                  <div className="pt-4 border-t border-border flex gap-3">
                    <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600">Approve & Execute</Button>
                    <Button variant="outline" className="flex-1 text-destructive hover:bg-destructive/10">Reject Plan</Button>
                  </div>
                )}
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}
