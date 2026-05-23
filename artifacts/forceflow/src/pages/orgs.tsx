import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getListOrgsQueryKey, useCreateOrg, useDeleteOrg, useListOrgs, useReconnectOrg } from "@workspace/api-client-react";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Cloud, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";

type FormValues = {
  label: string;
  orgType: "production" | "sandbox" | "developer" | "scratch";
  loginUrl: string;
  clientId: string;
  clientSecret: string;
};

const ORG_TYPES: FormValues["orgType"][] = ["production", "sandbox", "developer", "scratch"];

export default function OrgsPage() {
  const queryClient = useQueryClient();
  const { data: orgs, isLoading } = useListOrgs();
  const createOrg = useCreateOrg();
  const deleteOrg = useDeleteOrg();
  const reconnectOrg = useReconnectOrg();
  const [open, setOpen] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: {
      label: "",
      orgType: "production",
      loginUrl: "https://login.salesforce.com",
      clientId: "",
      clientSecret: "",
    },
  });

  const stats = useMemo(() => {
    const total = orgs?.length ?? 0;
    const connected = orgs?.filter((org) => org.status === "connected").length ?? 0;
    return { total, connected };
  }, [orgs]);

  const onSubmit = form.handleSubmit((values) => {
    createOrg.mutate(
      { data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOrgsQueryKey() });
          form.reset();
          setOpen(false);
        },
      },
    );
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Salesforce Orgs</h1>
            <p className="text-muted-foreground">Manage multiple Salesforce environments from one tenant.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Connect Org</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Connect Salesforce Org</DialogTitle>
                <DialogDescription>Register the org and start OAuth connection.</DialogDescription>
              </DialogHeader>
              <form className="grid gap-4" onSubmit={onSubmit}>
                <div className="grid gap-2"><Label htmlFor="label">Label</Label><Input id="label" {...form.register("label", { required: true })} /></div>
                <div className="grid gap-2"><Label>Org Type</Label><Select value={form.watch("orgType")} onValueChange={(value) => form.setValue("orgType", value as FormValues["orgType"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ORG_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid gap-2"><Label htmlFor="loginUrl">Login URL</Label><Input id="loginUrl" {...form.register("loginUrl", { required: true })} /></div>
                <div className="grid gap-2"><Label htmlFor="clientId">Client ID</Label><Input id="clientId" {...form.register("clientId", { required: true })} /></div>
                <div className="grid gap-2"><Label htmlFor="clientSecret">Client Secret</Label><Input id="clientSecret" type="password" {...form.register("clientSecret", { required: true })} /></div>
                <Button type="submit" disabled={createOrg.isPending}>{createOrg.isPending ? "Connecting..." : "Create & Connect"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Total Orgs</CardTitle><CardDescription>All Salesforce environments in this tenant</CardDescription></CardHeader>
            <CardContent className="text-3xl font-semibold">{stats.total}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Connected</CardTitle><CardDescription>Ready for API access</CardDescription></CardHeader>
            <CardContent className="text-3xl font-semibold">{stats.connected}</CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-56" />)}
          </div>
        ) : !orgs?.length ? (
          <Empty><EmptyHeader><EmptyTitle>No Orgs Connected</EmptyTitle><EmptyDescription>Connect your first Salesforce org to start managing multiple environments.</EmptyDescription></EmptyHeader></Empty>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {orgs.map((org) => (
              <Card key={org.id} className="border-border/70 bg-card/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        {org.label}
                        <span className={`h-2 w-2 rounded-full ${org.status === "connected" ? "bg-emerald-500" : org.status === "error" ? "bg-red-500" : "bg-slate-500"}`} />
                      </CardTitle>
                      <CardDescription className="font-mono text-xs">{org.instanceUrl || org.loginUrl || "Not connected yet"}</CardDescription>
                    </div>
                    <Badge variant="outline" className={orgTypeClass(org.orgType)}>{org.orgType}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground"><span>Status</span><span className="capitalize text-foreground">{org.status}</span></div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground"><span>Last sync</span><span className="font-mono text-foreground">{org.lastSync ? new Date(org.lastSync).toLocaleString() : "Never"}</span></div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => reconnectOrg.mutate({ orgId: org.id }, {
                      onSuccess: (result) => {
                        if (result?.authUrl) window.open(result.authUrl, "_blank", "noopener,noreferrer");
                        queryClient.invalidateQueries({ queryKey: getListOrgsQueryKey() });
                      },
                    })} disabled={reconnectOrg.isPending}>
                      <RefreshCw className="mr-2 h-4 w-4" /> Reconnect
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => deleteOrg.mutate({ orgId: org.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListOrgsQueryKey() }) })} disabled={deleteOrg.isPending}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function orgTypeClass(type: string) {
  switch (type) {
    case "production": return "border-blue-500/20 text-blue-300 bg-blue-500/10";
    case "sandbox": return "border-amber-500/20 text-amber-300 bg-amber-500/10";
    case "developer": return "border-emerald-500/20 text-emerald-300 bg-emerald-500/10";
    default: return "border-slate-500/20 text-slate-300 bg-slate-500/10";
  }
}
