import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { useListModelConfigs, useCreateModelConfig, useDeleteModelConfig, useSetDefaultModel, useTestModelConfig, getListModelConfigsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Cpu, Trash2, Star, Zap, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const PROVIDERS = [
  { id: "openrouter", label: "OpenRouter", description: "Access 100+ models including Claude, GPT-4, Llama", placeholder: "sk-or-v1-..." },
  { id: "anthropic", label: "Anthropic", description: "Claude claude-sonnet-4, Claude Haiku — direct", placeholder: "sk-ant-..." },
  { id: "openai", label: "OpenAI", description: "GPT-4o, GPT-4 Turbo — direct", placeholder: "sk-..." },
  { id: "custom", label: "Custom Endpoint", description: "Any OpenAI-compatible API", placeholder: "sk-..." },
];

const SUGGESTED_MODELS: Record<string, string[]> = {
  openrouter: ["anthropic/claude-sonnet-4-5", "anthropic/claude-3.5-sonnet", "openai/gpt-4o", "meta-llama/llama-3.1-70b-instruct", "meta-llama/llama-3.1-8b-instruct:free", "google/gemma-2-9b-it:free"],
  anthropic: ["claude-sonnet-4-5", "claude-haiku-4-5-20251001", "claude-opus-4"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
  custom: [],
};

const PROVIDER_COLORS: Record<string, string> = {
  openrouter: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  anthropic: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  openai: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  custom: "text-slate-400 bg-slate-500/10 border-slate-500/20",
};

function AddModelModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const createModel = useCreateModelConfig();
  const [provider, setProvider] = useState("openrouter");
  const [modelName, setModelName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [label, setLabel] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const suggestedModels = SUGGESTED_MODELS[provider] ?? [];

  const handleAdd = () => {
    if (!modelName || !apiKey) return;
    createModel.mutate(
      {
        data: {
          provider: provider as any,
          modelName,
          apiKey,
          label: label || undefined,
          baseUrl: provider === "custom" ? baseUrl : undefined,
          isDefault,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListModelConfigsQueryKey() });
          onClose();
        },
      }
    );
  };

  const currentProvider = PROVIDERS.find(p => p.id === provider);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Cpu className="h-5 w-5 text-primary" /> Add AI Model</DialogTitle>
          <DialogDescription>Connect an AI provider to power your ForceFlow agents.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Provider */}
          <div className="space-y-2">
            <Label>Provider</Label>
            <div className="grid grid-cols-2 gap-2">
              {PROVIDERS.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setProvider(p.id); setModelName(""); }}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all",
                    provider === p.id ? "border-primary/50 bg-primary/5" : "border-border/60 hover:border-border"
                  )}
                >
                  <p className={cn("text-sm font-medium", provider === p.id ? "text-primary" : "text-foreground")}>{p.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{p.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Model name */}
          <div className="space-y-1.5">
            <Label>Model</Label>
            {suggestedModels.length > 0 ? (
              <>
                <Select value={modelName} onValueChange={setModelName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select or type a model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suggestedModels.map(m => (
                      <SelectItem key={m} value={m} className="font-mono text-xs">{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Or type a custom model name..."
                  value={modelName}
                  onChange={e => setModelName(e.target.value)}
                  className="font-mono text-xs"
                />
              </>
            ) : (
              <Input
                placeholder="e.g. gpt-4o"
                value={modelName}
                onChange={e => setModelName(e.target.value)}
                className="font-mono text-xs"
              />
            )}
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <Label>
              {provider === "openrouter" ? "OpenRouter API Key" : `${currentProvider?.label} API Key`}
            </Label>
            <Input
              type="password"
              placeholder={currentProvider?.placeholder ?? "sk-..."}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="font-mono text-xs"
            />
            {provider === "openrouter" && (
              <p className="text-xs text-muted-foreground">
                Get a free key at{" "}
                <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">openrouter.ai/keys</a>
                {" "}— free models available.
              </p>
            )}
          </div>

          {/* Base URL for custom */}
          {provider === "custom" && (
            <div className="space-y-1.5">
              <Label>Base URL</Label>
              <Input
                placeholder="https://your-endpoint.com/v1"
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          )}

          {/* Label */}
          <div className="space-y-1.5">
            <Label>Label <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input placeholder={`e.g. ${provider === "openrouter" ? "OpenRouter Claude" : "Production GPT-4"}`} value={label} onChange={e => setLabel(e.target.value)} />
          </div>

          {/* Default checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={e => setIsDefault(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-sm text-muted-foreground">Set as default model for all agents</span>
          </label>

          <Button className="w-full" onClick={handleAdd} disabled={!modelName || !apiKey || createModel.isPending}>
            {createModel.isPending ? "Adding..." : "Add Model"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ModelsPage() {
  const { data: models, isLoading } = useListModelConfigs();
  const deleteModel = useDeleteModelConfig();
  const setDefaultModel = useSetDefaultModel();
  const testModel = useTestModelConfig();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; latencyMs?: number | null; message: string } | null>>({});
  const [testingId, setTestingId] = useState<string | null>(null);

  const handleTest = (modelId: string) => {
    setTestingId(modelId);
    testModel.mutate({ modelId }, {
      onSuccess: (result) => {
        setTestResults(prev => ({ ...prev, [modelId]: result }));
        setTestingId(null);
      },
      onError: () => {
        setTestResults(prev => ({ ...prev, [modelId]: { success: false, message: "Test failed", latencyMs: null } }));
        setTestingId(null);
      },
    });
  };

  const handleSetDefault = (modelId: string) => {
    setDefaultModel.mutate({ modelId }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListModelConfigsQueryKey() }),
    });
  };

  const handleDelete = (modelId: string) => {
    if (!confirm("Delete this model config?")) return;
    deleteModel.mutate({ modelId }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListModelConfigsQueryKey() }),
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Models</h1>
            <p className="text-muted-foreground mt-1">Manage AI providers powering your ForceFlow agents.</p>
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Model
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-52" />)}
          </div>
        ) : !models?.length ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No Models Connected</EmptyTitle>
              <EmptyDescription>Add an AI model to start using ForceFlow agents. OpenRouter offers free models to get started.</EmptyDescription>
            </EmptyHeader>
            <Button className="mt-4" onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Your First Model
            </Button>
          </Empty>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {models.map(model => {
              const testResult = testResults[model.id];
              const isTesting = testingId === model.id;
              return (
                <Card key={model.id} className={cn("border-border/70 bg-card/50 transition-colors", model.isDefault && "border-primary/30")}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                          <span className="truncate">{model.label || model.modelName}</span>
                          {model.isDefault && (
                            <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 py-0">Default</Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="font-mono text-xs mt-1 truncate">{model.modelName}</CardDescription>
                      </div>
                      <Badge className={cn("text-xs border shrink-0 capitalize", PROVIDER_COLORS[model.provider] ?? "text-muted-foreground bg-muted border-border")}>
                        {model.provider}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-xs text-muted-foreground">Added {new Date(model.createdAt).toLocaleDateString()}</div>

                    {testResult && (
                      <div className={cn("flex items-center gap-1.5 text-xs p-2 rounded border", testResult.success ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" : "bg-red-500/5 border-red-500/20 text-red-400")}>
                        {testResult.success ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                        {testResult.success ? `Connected${testResult.latencyMs ? ` · ${testResult.latencyMs}ms` : ""}` : testResult.message}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => handleTest(model.id)}
                        disabled={isTesting}
                      >
                        {isTesting ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Testing...</> : <><Zap className="h-3 w-3 mr-1" />Test</>}
                      </Button>
                      {!model.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => handleSetDefault(model.id)}
                          title="Set as default"
                        >
                          <Star className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(model.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AddModelModal open={addOpen} onClose={() => setAddOpen(false)} />
    </AppLayout>
  );
}
