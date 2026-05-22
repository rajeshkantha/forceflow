import { AppLayout } from "@/components/app-layout";
import { useListOrgs } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Cloud, ExternalLink, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Empty } from "@/components/ui/empty";

export default function OrgsPage() {
  const { data: orgs, isLoading } = useListOrgs();

  const getStatusColor = (status: string) => {
    switch(status) {
      case "active": return "bg-emerald-500";
      case "error": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getOrgTypeColor = (type: string) => {
    switch(type) {
      case "production": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "sandbox": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "developer": return "bg-green-500/10 text-green-500 border-green-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Salesforce Orgs</h1>
            <p className="text-muted-foreground">Manage your connected Salesforce environments.</p>
          </div>
          <Button><Plus className="mr-2 h-4 w-4" /> Connect Org</Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-48" />)}
          </div>
        ) : !orgs?.length ? (
          <Empty 
            icon={<Cloud className="h-10 w-10 text-muted-foreground" />}
            title="No Orgs Connected"
            description="Connect your first Salesforce org to start using ForceFlow."
            action={<Button><Plus className="mr-2 h-4 w-4" /> Connect Org</Button>}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orgs.map((org) => (
              <Card key={org.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 text-left">
                      <CardTitle className="flex items-center gap-2">
                        {org.label}
                        <div className={`h-2 w-2 rounded-full ${getStatusColor(org.status)}`} title={org.status} />
                      </CardTitle>
                      <CardDescription className="font-mono text-xs">{org.instanceUrl}</CardDescription>
                    </div>
                    <Badge variant="outline" className={getOrgTypeColor(org.orgType)}>
                      {org.orgType}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-4">
                    Last synced: {org.lastSyncAt ? new Date(org.lastSyncAt).toLocaleString() : 'Never'}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="w-full">
                      <RefreshCw className="h-3 w-3 mr-2" /> Reconnect
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0">
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
