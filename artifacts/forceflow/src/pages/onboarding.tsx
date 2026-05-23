import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useCompleteOnboarding, useValidateInviteToken, useAcceptInvite } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { Loader2, CheckCircle2, ChevronRight, Cloud, Cpu, Users, AlertCircle, Building2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const OPENROUTER_FREE_MODELS = [
  { value: "meta-llama/llama-3.1-8b-instruct:free", label: "Llama 3.1 8B (free)" },
  { value: "meta-llama/llama-3.2-3b-instruct:free", label: "Llama 3.2 3B (free)" },
  { value: "mistralai/mistral-7b-instruct:free", label: "Mistral 7B (free)" },
  { value: "google/gemma-2-9b-it:free", label: "Gemma 2 9B (free)" },
  { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet (paid)" },
  { value: "openai/gpt-4o", label: "GPT-4o (paid)" },
];

const SF_CLOUDS = [
  { id: "sales", label: "Sales Cloud" },
  { id: "service", label: "Service Cloud" },
  { id: "experience", label: "Experience Cloud" },
  { id: "cpq", label: "CPQ / Revenue Cloud" },
  { id: "marketing", label: "Marketing Cloud" },
  { id: "field_service", label: "Field Service" },
  { id: "health", label: "Health Cloud" },
  { id: "financial", label: "Financial Services Cloud" },
];

const INDUSTRIES = [
  { value: "technology", label: "Technology" },
  { value: "financial_services", label: "Financial Services" },
  { value: "healthcare", label: "Healthcare" },
  { value: "retail", label: "Retail / CPG" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "professional_services", label: "Professional Services" },
  { value: "nonprofit", label: "Non-Profit" },
  { value: "other", label: "Other" },
];

const COMPANY_SIZES = [
  { value: "1-50", label: "1–50 employees" },
  { value: "51-500", label: "51–500 employees" },
  { value: "501-5000", label: "501–5,000 employees" },
  { value: "5000+", label: "5,000+ employees" },
];

// Invite accept flow (separate from the main onboarding wizard)
function InviteAcceptPage({ token }: { token: string }) {
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const { data: inviteData, isLoading } = useValidateInviteToken({ token });
  const acceptInvite = useAcceptInvite();
  const [error, setError] = useState("");

  const handleAccept = () => {
    acceptInvite.mutate(
      { data: { token, name: user?.fullName ?? undefined } },
      {
        onSuccess: () => setLocation("/dashboard"),
        onError: (err: any) => setError(err?.message ?? "Failed to accept invite"),
      }
    );
  };

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!inviteData?.valid) return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive"><AlertCircle className="h-5 w-5" /> Invalid Invite</CardTitle>
          <CardDescription>This invite link is invalid or has expired. Contact your workspace admin for a new invite.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );

  const ROLE_LABELS: Record<string, string> = { frontier: "Frontier", developer: "Developer", sales: "Sales", support: "Support", sme: "SME" };
  const ROLE_COLORS: Record<string, string> = { frontier: "text-indigo-400", developer: "text-cyan-400", sales: "text-emerald-400", support: "text-amber-400", sme: "text-violet-400" };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <img src="/logo.svg" alt="ForceFlow" className="h-12 w-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Join {inviteData.tenantName}</h1>
          <p className="text-muted-foreground text-sm mt-1">You've been invited to join this ForceFlow workspace.</p>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground text-sm">Workspace</span>
              <span className="font-medium text-sm">{inviteData.tenantName}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground text-sm">Email</span>
              <span className="font-medium text-sm">{inviteData.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground text-sm">Role</span>
              <span className={cn("font-semibold text-sm", ROLE_COLORS[inviteData.role] ?? "text-foreground")}>
                {ROLE_LABELS[inviteData.role] ?? inviteData.role} Agent
              </span>
            </div>
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />{error}
              </div>
            )}
            <Button className="w-full" onClick={handleAccept} disabled={acceptInvite.isPending}>
              {acceptInvite.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Joining...</> : "Accept Invite & Enter Workspace"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const completeOnboarding = useCompleteOnboarding();
  const [nameError, setNameError] = useState("");
  const [apiError, setApiError] = useState("");

  // Check for invite token in URL
  const urlParams = new URLSearchParams(window.location.search);
  const inviteToken = urlParams.get("token");
  if (inviteToken) return <InviteAcceptPage token={inviteToken} />;

  const [formData, setFormData] = useState({
    workspaceName: user?.firstName ? `${user.firstName}'s Workspace` : "",
    industry: "",
    companySize: "",
    orgDescription: "",
    sfClouds: [] as string[],
    orgLabel: "",
    orgUrl: "https://login.salesforce.com",
    orgType: "production",
    modelProvider: "openrouter",
    modelKey: "",
    modelName: OPENROUTER_FREE_MODELS[0].value,
  });

  const update = (key: string, val: any) => setFormData(f => ({ ...f, [key]: val }));

  const toggleCloud = (id: string) => {
    update("sfClouds", formData.sfClouds.includes(id)
      ? formData.sfClouds.filter(c => c !== id)
      : [...formData.sfClouds, id]
    );
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.workspaceName.trim()) { setNameError("Workspace name is required."); return; }
      setNameError("");
    }
    if (step < 4) setStep(step + 1);
    else handleComplete();
  };

  const handleComplete = () => {
    setApiError("");
    const modelName = formData.modelProvider === "openrouter" ? formData.modelName
      : formData.modelProvider === "openai" ? "gpt-4o" : "claude-sonnet-4-5";

    completeOnboarding.mutate(
      {
        data: {
          company: {
            name: formData.workspaceName.trim(),
            industry: formData.industry,
            companySize: formData.companySize,
            sfClouds: formData.sfClouds,
            orgDescription: formData.orgDescription,
          },
          org: formData.orgLabel ? {
            label: formData.orgLabel,
            orgType: formData.orgType as any,
            loginUrl: formData.orgUrl,
            clientId: "pending",
            clientSecret: "pending",
          } : undefined,
          model: formData.modelKey ? {
            provider: formData.modelProvider as any,
            modelName,
            apiKey: formData.modelKey,
            label: formData.modelProvider === "openrouter"
              ? OPENROUTER_FREE_MODELS.find(m => m.value === formData.modelName)?.label ?? "OpenRouter"
              : formData.modelProvider,
          } : undefined,
        },
      },
      {
        onSuccess: () => setLocation("/dashboard"),
        onError: (err: any) => {
          const msg = err?.message ?? err?.toString() ?? "Something went wrong.";
          if (msg.toLowerCase().includes("already taken") || msg.toLowerCase().includes("unique")) {
            setStep(1); setNameError("Workspace name already taken. Choose a different one.");
          } else {
            setApiError(msg);
          }
        },
      }
    );
  };

  const STEPS = [
    { label: "Company", icon: Building2 },
    { label: "Salesforce", icon: Cloud },
    { label: "AI Model", icon: Cpu },
    { label: "Review", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-8">
        <div className="text-center space-y-2">
          <img src="/logo.svg" alt="ForceFlow" className="h-12 w-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold tracking-tight">Welcome to ForceFlow</h1>
          <p className="text-muted-foreground text-sm">Set up your command center in a few quick steps.</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-1">
          {STEPS.map((s, i) => {
            const sNum = i + 1;
            const isActive = step === sNum;
            const isDone = step > sNum;
            return (
              <div key={s.label} className="flex items-center">
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all border",
                  isActive ? "bg-primary text-primary-foreground border-primary" :
                  isDone ? "bg-primary/20 text-primary border-primary/40" :
                  "bg-muted text-muted-foreground border-transparent"
                )}>
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : sNum}
                </div>
                <span className={cn("hidden sm:block text-xs ml-1.5 mr-1", isActive ? "text-foreground font-medium" : "text-muted-foreground")}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && <div className={cn("h-px w-8 mx-2", isDone ? "bg-primary/40" : "bg-border")} />}
              </div>
            );
          })}
        </div>

        <Card className="border-border/50 shadow-xl">
          {/* Step 1 — Company */}
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> Company Profile</CardTitle>
                <CardDescription>Tell us about your company. This context powers your AI agents.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Workspace Name <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="Acme Corp"
                    value={formData.workspaceName}
                    onChange={e => { update("workspaceName", e.target.value); if (e.target.value.trim()) setNameError(""); }}
                    className={nameError ? "border-destructive" : ""}
                  />
                  {nameError && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{nameError}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Select value={formData.industry} onValueChange={v => update("industry", v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Company Size</Label>
                    <Select value={formData.companySize} onValueChange={v => update("companySize", v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{COMPANY_SIZES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Salesforce Clouds in use</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {SF_CLOUDS.map(cloud => (
                      <label key={cloud.id} className={cn(
                        "flex items-center gap-2 p-2.5 rounded-md border cursor-pointer transition-colors text-sm",
                        formData.sfClouds.includes(cloud.id) ? "border-primary/50 bg-primary/5 text-primary" : "border-border/60 hover:border-border text-muted-foreground"
                      )}>
                        <Checkbox
                          checked={formData.sfClouds.includes(cloud.id)}
                          onCheckedChange={() => toggleCloud(cloud.id)}
                          className="shrink-0"
                        />
                        {cloud.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>What does your Salesforce org do? <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Textarea
                    placeholder="e.g. Manages B2B sales pipeline, customer support cases, and field service work orders for industrial equipment."
                    value={formData.orgDescription}
                    onChange={e => update("orgDescription", e.target.value)}
                    className="resize-none"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">This context is injected into every AI agent's system prompt.</p>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 2 — Salesforce Org */}
          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Cloud className="h-5 w-5 text-primary" /> Connect Salesforce</CardTitle>
                <CardDescription>Connect your primary org. You can add more orgs later from the Orgs page.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-md text-xs text-amber-400/90">
                  You'll need a Salesforce Connected App with OAuth enabled. You can skip this step and add orgs later from the Orgs page.
                </div>
                <div className="space-y-2">
                  <Label>Org Label</Label>
                  <Input placeholder="e.g. Production, Dev Sandbox" value={formData.orgLabel} onChange={e => update("orgLabel", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Org Type</Label>
                    <Select value={formData.orgType} onValueChange={v => update("orgType", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="production">Production</SelectItem>
                        <SelectItem value="sandbox">Sandbox</SelectItem>
                        <SelectItem value="developer">Developer Edition</SelectItem>
                        <SelectItem value="scratch">Scratch Org</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Login URL</Label>
                    <Select value={formData.orgUrl} onValueChange={v => update("orgUrl", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="https://login.salesforce.com">login.salesforce.com (Production)</SelectItem>
                        <SelectItem value="https://test.salesforce.com">test.salesforce.com (Sandbox)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 3 — AI Model */}
          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Cpu className="h-5 w-5 text-primary" /> AI Model</CardTitle>
                <CardDescription>Configure the AI model powering your agents. OpenRouter has free models to get started.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select value={formData.modelProvider} onValueChange={v => update("modelProvider", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openrouter">OpenRouter (free models available)</SelectItem>
                      <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                      <SelectItem value="openai">OpenAI (GPT-4)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.modelProvider === "openrouter" && (
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Select value={formData.modelName} onValueChange={v => update("modelName", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {OPENROUTER_FREE_MODELS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    placeholder={formData.modelProvider === "openrouter" ? "sk-or-v1-..." : formData.modelProvider === "anthropic" ? "sk-ant-..." : "sk-..."}
                    value={formData.modelKey}
                    onChange={e => update("modelKey", e.target.value)}
                    className="font-mono text-xs"
                  />
                  {formData.modelProvider === "openrouter" && (
                    <p className="text-xs text-muted-foreground">
                      Free key at <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">openrouter.ai/keys</a>
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
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Ready to Launch</CardTitle>
                <CardDescription>Review your setup before entering the command center.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-0 text-sm">
                {[
                  ["Workspace", formData.workspaceName],
                  ["Industry", formData.industry || "Not specified"],
                  ["Size", formData.companySize || "Not specified"],
                  ["SF Clouds", formData.sfClouds.length ? formData.sfClouds.join(", ") : "None selected"],
                  ["Salesforce Org", formData.orgLabel || "Skip for now"],
                  ["AI Provider", formData.modelKey ? formData.modelProvider : "Skip for now"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-2.5 border-b border-border last:border-0">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium capitalize text-right max-w-[60%] truncate">{value}</span>
                  </div>
                ))}
                {apiError && (
                  <div className="mt-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 flex items-start gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />{apiError}
                  </div>
                )}
              </CardContent>
            </>
          )}

          <CardFooter className="flex justify-between pt-4 border-t border-border/50">
            <Button variant="ghost" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1 || completeOnboarding.isPending}>
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
