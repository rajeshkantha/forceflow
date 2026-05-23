import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { useGetTenant, useUpdateTenant, getGetTenantQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { Save, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

export default function SettingsPage() {
  const { data: tenant, isLoading } = useGetTenant();
  const updateTenant = useUpdateTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [sfClouds, setSfClouds] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  if (tenant && !initialized) {
    setName(tenant.name ?? "");
    setWebsite(tenant.website ?? "");
    setIndustry(tenant.industry ?? "");
    setCompanySize((tenant as any).companySize ?? "");
    setOrgDescription(tenant.orgDescription ?? "");
    setSfClouds((tenant.sfClouds as string[]) ?? []);
    setInitialized(true);
  }

  const toggleCloud = (id: string) => {
    setSfClouds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const handleSave = () => {
    updateTenant.mutate(
      { data: { name, website, industry, orgDescription, sfClouds } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetTenantQueryKey() });
          toast({ title: "Settings saved", description: "Workspace settings updated successfully." });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.message ?? "Failed to save settings", variant: "destructive" });
        },
      }
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your workspace and company context for AI agents.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />Company Profile</CardTitle>
            <CardDescription>This information is injected into every AI agent's system prompt as company context.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {isLoading ? (
              <div className="space-y-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label>Workspace Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Website <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourcompany.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Industry</Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Salesforce Clouds</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {SF_CLOUDS.map(cloud => (
                      <label key={cloud.id} className={cn(
                        "flex items-center gap-2 p-2.5 rounded-md border cursor-pointer text-sm transition-colors",
                        sfClouds.includes(cloud.id) ? "border-primary/40 bg-primary/5 text-primary" : "border-border/60 hover:border-border text-muted-foreground"
                      )}>
                        <Checkbox checked={sfClouds.includes(cloud.id)} onCheckedChange={() => toggleCloud(cloud.id)} className="shrink-0" />
                        {cloud.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Org Description</Label>
                  <Textarea
                    value={orgDescription}
                    onChange={e => setOrgDescription(e.target.value)}
                    placeholder="Describe what your Salesforce org does — this context is injected into every agent."
                    rows={4}
                    className="resize-none"
                  />
                </div>
                <Button onClick={handleSave} disabled={updateTenant.isPending}>
                  {updateTenant.isPending ? "Saving..." : <><Save className="mr-2 h-4 w-4" />Save Settings</>}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workspace Info</CardTitle>
            <CardDescription>Read-only workspace metadata.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-0 text-sm">
            {isLoading ? <Skeleton className="h-24 w-full" /> : (
              <>
                {[
                  ["Tenant ID", tenant?.id],
                  ["Slug", tenant?.slug || "—"],
                  ["Created", tenant ? new Date(tenant.createdAt).toLocaleDateString() : "—"],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex justify-between py-2.5 border-b border-border last:border-0">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-mono text-xs text-foreground truncate max-w-[50%]">{value as string}</span>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
