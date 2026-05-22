import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompleteOnboarding } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { Loader2, CheckCircle2, ChevronRight, Cloud, Cpu, Users } from "lucide-react";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const completeOnboarding = useCompleteOnboarding();

  const [formData, setFormData] = useState({
    workspaceName: `${user?.firstName}'s Workspace` || "",
    industry: "",
    orgLabel: "",
    orgUrl: "",
    modelProvider: "openai",
    modelKey: "",
  });

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
    else handleComplete();
  };

  const handleComplete = () => {
    completeOnboarding.mutate({
      data: {
        company: { name: formData.workspaceName, industry: formData.industry },
        org: formData.orgLabel ? {
          label: formData.orgLabel,
          orgType: "developer",
          loginUrl: formData.orgUrl,
          clientId: "dummy",
          clientSecret: "dummy",
        } : undefined,
        model: formData.modelKey ? {
          provider: formData.modelProvider as any,
          modelName: "gpt-4",
          apiKey: formData.modelKey
        } : undefined
      }
    }, {
      onSuccess: () => {
        setLocation("/dashboard");
      }
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <img src="/logo.svg" alt="ForceFlow" className="h-12 w-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold tracking-tight">Welcome to ForceFlow</h1>
          <p className="text-muted-foreground text-sm">Let's set up your command center in a few quick steps.</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step === s ? "bg-primary text-primary-foreground" :
                step > s ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              {s < 4 && <div className={`h-1 w-8 ${step > s ? "bg-primary/20" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        <Card className="border-border/50 shadow-xl">
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle>Workspace Setup</CardTitle>
                <CardDescription>Name your workspace and tell us about your company.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workspaceName">Workspace Name</Label>
                  <Input 
                    id="workspaceName" 
                    value={formData.workspaceName} 
                    onChange={e => setFormData({...formData, workspaceName: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select value={formData.industry} onValueChange={v => setFormData({...formData, industry: v})}>
                    <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
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

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Cloud className="h-5 w-5 text-primary" /> Connect Salesforce</CardTitle>
                <CardDescription>Connect your primary development org (Optional)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgLabel">Org Label</Label>
                  <Input 
                    id="orgLabel" 
                    placeholder="e.g. Dev Sandbox"
                    value={formData.orgLabel} 
                    onChange={e => setFormData({...formData, orgLabel: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgUrl">Login URL</Label>
                  <Input 
                    id="orgUrl" 
                    placeholder="https://test.salesforce.com"
                    value={formData.orgUrl} 
                    onChange={e => setFormData({...formData, orgUrl: e.target.value})} 
                  />
                </div>
              </CardContent>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Cpu className="h-5 w-5 text-primary" /> AI Model Config</CardTitle>
                <CardDescription>Set up your primary AI provider for agents (Optional)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select value={formData.modelProvider} onValueChange={v => setFormData({...formData, modelProvider: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input 
                    id="apiKey" 
                    type="password"
                    placeholder="sk-..."
                    value={formData.modelKey} 
                    onChange={e => setFormData({...formData, modelKey: e.target.value})} 
                  />
                </div>
              </CardContent>
            </>
          )}

          {step === 4 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Ready to Launch</CardTitle>
                <CardDescription>Review your setup before entering the command center.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Workspace</span>
                  <span className="font-medium">{formData.workspaceName}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Salesforce Org</span>
                  <span className="font-medium">{formData.orgLabel || "Skip for now"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">AI Provider</span>
                  <span className="font-medium capitalize">{formData.modelKey ? formData.modelProvider : "Skip for now"}</span>
                </div>
              </CardContent>
            </>
          )}

          <CardFooter className="flex justify-between pt-6 border-t border-border/50">
            <Button variant="ghost" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1 || completeOnboarding.isPending}>
              Back
            </Button>
            <Button onClick={handleNext} disabled={completeOnboarding.isPending}>
              {completeOnboarding.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {step === 4 ? "Launch ForceFlow" : (step === 2 || step === 3) ? "Continue" : "Next"}
              {step !== 4 && <ChevronRight className="ml-2 h-4 w-4" />}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
