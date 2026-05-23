import { AppLayout } from "@/components/app-layout";
import { useListModelConfigs } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Cpu, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";

export default function ModelsPage() {
  const { data: models, isLoading } = useListModelConfigs();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Models</h1>
            <p className="text-muted-foreground">Manage your connected AI models and providers.</p>
          </div>
          <Button><Plus className="mr-2 h-4 w-4" /> Add Model</Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i => <Skeleton key={i} className="h-48" />)}</div>
        ) : !models?.length ? (
          <Empty><EmptyHeader><EmptyTitle>No Models Connected</EmptyTitle><EmptyDescription>Add an AI model config to start using ForceFlow agents.</EmptyDescription></EmptyHeader></Empty>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {models.map((model) => (
              <Card key={model.id}>
                <CardHeader className="pb-3"><div className="flex justify-between items-start"><div className="space-y-1 text-left"><CardTitle className="flex items-center gap-2">{model.label || model.modelName}{model.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}</CardTitle><CardDescription className="font-mono text-xs">{model.modelName}</CardDescription></div><Badge variant="outline" className="capitalize">{model.provider}</Badge></div></CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-4">Added: {new Date(model.createdAt).toLocaleDateString()}</div>
                  <div className="flex gap-2"><Button variant="outline" size="sm" className="w-full">Test Connection</Button><Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 shrink-0"><Trash2 className="h-4 w-4" /></Button></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
