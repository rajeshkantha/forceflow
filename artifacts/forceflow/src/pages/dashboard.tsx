import { AppLayout } from "@/components/app-layout";
import { useGetDashboardSummary, useGetRecentActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Cloud, Users, Cpu, MessageSquare, Activity, Plus } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: activity, isLoading: isLoadingActivity } = useGetRecentActivity({ limit: 5 });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <div className="flex gap-2">
            <Link href="/chat">
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New Chat</Button>
            </Link>
            <Link href="/orgs">
              <Button size="sm" variant="outline"><Cloud className="mr-2 h-4 w-4" /> Connect Org</Button>
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orgs</CardTitle>
              <Cloud className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-8 w-20" /> : (
                <div className="text-2xl font-bold">
                  {summary?.activeOrgs || 0} <span className="text-sm font-normal text-muted-foreground">/ {summary?.totalOrgs || 0}</span>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold">{summary?.teamMembers || 0}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Model</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-8 w-32" /> : (
                <div className="text-lg font-semibold truncate">{summary?.activeModelName || "None"}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Threads</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold">{summary?.recentThreads?.length || 0}</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Recent Threads */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Threads</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : summary?.recentThreads?.length ? (
                <div className="space-y-4">
                  {summary.recentThreads.map((thread) => (
                    <Link key={thread.id} href={`/chat/${thread.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted cursor-pointer transition-colors">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <Badge variant="outline" className="capitalize">{thread.role}</Badge>
                          <span className="font-medium truncate">{thread.title}</span>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                          {new Date(thread.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">No recent threads</div>
              )}
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingActivity ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : activity?.length ? (
                <div className="space-y-4">
                  {activity.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="mt-0.5 rounded-full p-1 bg-primary/10 text-primary">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">No recent activity</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
