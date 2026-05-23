import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompleteOnboarding } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { Loader2, CheckCircle2, ChevronRight, Cloud, Cpu, Users, AlertCircle } from "lucide-react";

const OPENROUTER_FREE_MODELS = [
  { value: "meta-llama/llama-3.1-8b-instruct:free", label: "Llama 3.1 8B (free)" },
  { value: "meta-llama/llama-3.2-3b-instruct:free", label: "Llama 3.2 3B (free)" },
  { value: "mistralai/mistral-7b-instruct:free", label: "Mistral 7B (free)" },
  { value: "google/gemma-2-9b-it:free", label: "Gemma 2 9B (free)" },
  { value: "microsoft/phi-3-mini-128k-instruct:free", label: "Phi-3 Mini 128k (free)" },
  { value: "qwen/qwen-2-7b-instruct:free", label: "Qwen 2 7B (free)" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const completeOnboarding = useCompleteOnboarding();
  const [nameError, setNameError] = useState("");
  const [apiError, setApiError] = useState("");

  const [formData, setFormData] = useState({
    workspaceName: user?.firstName ? `${user.firstName}'s Workspace` : "",
    industry: "",
    orgLabel: "",
    orgUrl: "",
    modelProvider: "openrouter",
    modelKey: "",
    modelName: OPENROUTER_FREE_MODELS[0].value,
  });

  const handleNext = () => {
    if (step === 1) {
      if (!formData.workspaceName.trim()) {
        setNameError("Workspace name is required.");
        return;
      }
      setNameError("");
    }
    if (step < 4) setStep(step + 1);
    else handleComplete();
  };

  const handleComplete = () => {
    setApiError("");
    const modelName =
      formData.modelProvider === "openrouter"
        ? formData.modelName
        : formData.modelProvider === "openai"
        ? "gpt-4o"
        : "claude-sonnet-4-5";

    completeOnboarding.mutate(
      {
        data: {
          company: { name: formData.workspaceName.trim(), industry: formData.industry },
          org: formData.orgLabel
            ? {
                label: formData.orgLabel,
                orgType: "developer",
                loginUrl: formData.orgUrl || "https://test.salesforce.com",
                clientId: "dummy",
                clientSecret: "dummy",
              }
            : undefined,
          model: formData.modelKey
            ? {
                provider: formData.modelProvider as any,
                modelName,
                apiKey: formData.modelKey,
                label:
                  formData.modelProvider === "openrouter"
                    ? OPENROUTER_FREE_MODELS.find((m) => m.value === formData.modelName)?.label ?? "OpenRouter"
                    : formData.modelProvider,
              }
            : undefined,
        },
      },
      {
        onSuccess: () => {
          setLocation("/dashboard");
        },
        onError: (err: any) => {
          const msg: string = err?.message ?? err?.toString() ?? "Something went wrong. Please try again.";
          if (msg.toLowerCase().includes("already taken") || msg.toLowerCase().includes("unique")) {
            setStep(1);
            setNameError("This workspace name is already taken. Please choose a different one.");
          } else {
            setApiError(msg);
          }
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <img src="/logo.svg" alt="ForceFlow" className="h-12 w-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold tracking-tight">Welcome to ForceFlow</h1>
          <p className="text-muted-foreground text-sm">Let's set up your command center in a few quick steps.</p>
        </div>

        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : step > s
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              {s < 4 && <div className={`h-1 w-8 ${step > s ? "bg-primary/20" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        <Card className="border-border/50 shadow-xl">
          {/* Step 1 — Workspace */}
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle>Workspace Setup</CardTitle>
                <CardDescription>Choose a unique name for your workspace and tell us about your company.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workspaceName">
                    Workspace Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="workspaceName"
                    placeholder="Acme Corp"
                    value={formData.workspaceName}
                    onChange={(e) => {
                      setFormData({ ...formData, workspaceName: e.target.value });
                      if (e.target.value.trim()) setNameError("");
                    }}
                    className={nameError ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {nameError && (
                    <p className="text-sm text-destructive flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {nameError}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Must be unique across all ForceFlow workspaces.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select value={formData.industry} onValueChange={(v) => setFormData({ ...formData, industry: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tech">Technology</SelectItem>
                      <SelectItem value="finance">Financial Services</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 2 — Salesforce */}
          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5 text-primary" /> Connect Salesforce
                </CardTitle>
                <CardDescription>Connect your primary development org (optional)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgLabel">Org Label</Label>
                  <Input
                    id="orgLabel"
                    placeholder="e.g. Dev Sandbox"
                    value={formData.orgLabel}
                    onChange={(e) => setFormData({ ...formData, orgLabel: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgUrl">Login URL</Label>
                  <Input
                    id="orgUrl"
                    placeholder="https://test.salesforce.com"
                    value={formData.orgUrl}
                    onChange={(e) => setFormData({ ...formData, orgUrl: e.target.value })}
                  />
                </div>
              </CardContent>
            </>
          )}

          {/* Step 3 — AI Model */}
          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-primary" /> AI Model Config
                </CardTitle>
                <CardDescription>Set up your AI provider for agents (optional — skip to configure later)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select
                    value={formData.modelProvider}
                    onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        modelProvider: v,
                        modelName: v === "openrouter" ? OPENROUTER_FREE_MODELS[0].value : formData.modelName,
                        modelKey: "",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openrouter">OpenRouter (free models available)</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.modelProvider === "openrouter" && (
                  <div className="space-y-2">
                    <Label>Free Model</Label>
                    <Select
                      value={formData.modelName}
                      onValueChange={(v) => setFormData({ ...formData, modelName: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPENROUTER_FREE_MODELS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Free-tier models — no billing required on OpenRouter.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="apiKey">
                    {formData.modelProvider === "openrouter" ? "OpenRouter API Key" : "API Key"}
                  </Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder={formData.modelProvider === "openrouter" ? "sk-or-..." : "sk-..."}
                    value={formData.modelKey}
                    onChange={(e) => setFormData({ ...formData, modelKey: e.target.value })}
                  />
                  {formData.modelProvider === "openrouter" && (
                    <p className="text-xs text-muted-foreground">
                      Get a free key at{" "}
                      <a
                        href="https://openrouter.ai/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-2"
                      >
                        openrouter.ai/keys
                      </a>
                    </p>
                  )}
                </div>
              </CardContent>
            </>
          )}

          {/* Step 4 — Review */}
          {step === 4 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Ready to Launch
                </CardTitle>
                <CardDescription>Review your setup before entering the command center.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-0 text-sm">
                <div className="flex justify-between py-2.5 border-b border-border">
                  <span className="text-muted-foreground">Workspace</span>
                  <span className="font-medium">{formData.workspaceName}</span>
                </div>
                <div className="flex justify-between py-2.5 border-b border-border">
                  <span className="text-muted-foreground">Industry</span>
                  <span className="font-medium capitalize">{formData.industry || "Not specified"}</span>
                </div>
                <div className="flex justify-between py-2.5 border-b border-border">
                  <span className="text-muted-foreground">Salesforce Org</span>
                  <span className="font-medium">{formData.orgLabel || "Skip for now"}</span>
                </div>
                <div className="flex justify-between py-2.5 border-b border-border">
                  <span className="text-muted-foreground">AI Provider</span>
                  <span className="font-medium capitalize">
                    {formData.modelKey ? formData.modelProvider : "Skip for now"}
                  </span>
                </div>
                {formData.modelKey && formData.modelProvider === "openrouter" && (
                  <div className="flex justify-between py-2.5 border-b border-border">
                    <span className="text-muted-foreground">Model</span>
                    <span className="font-mono text-xs font-medium">
                      {OPENROUTER_FREE_MODELS.find((m) => m.value === formData.modelName)?.label ?? formData.modelName}
                    </span>
                  </div>
                )}
                {apiError && (
                  <div className="mt-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 flex items-start gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    {apiError}
                  </div>
                )}
              </CardContent>
            </>
          )}

          <CardFooter className="flex justify-between pt-6 border-t border-border/50">
            <Button
              variant="ghost"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1 || completeOnboarding.isPending}
            >
              Back
            </Button>
            <Button onClick={handleNext} disabled={completeOnboarding.isPending}>
              {completeOnboarding.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {step === 4 ? "Launch ForceFlow" : step === 2 || step === 3 ? "Continue" : "Next"}
              {step !== 4 && <ChevronRight className="ml-2 h-4 w-4" />}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
