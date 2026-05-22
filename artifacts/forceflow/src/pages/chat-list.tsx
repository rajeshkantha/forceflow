import { AppLayout } from "@/components/app-layout";
import { useListThreads } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Empty } from "@/components/ui/empty";

export default function ChatListPage() {
  const { data: threads, isLoading } = useListThreads();

  const groupedThreads = threads?.reduce((acc, thread) => {
    const role = thread.role;
    if (!acc[role]) acc[role] = [];
    acc[role].push(thread);
    return acc;
  }, {} as Record<string, typeof threads>);

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-10rem)] border border-border rounded-lg overflow-hidden bg-card">
        <div className="w-1/3 border-r border-border flex flex-col h-full bg-background">
          <div className="p-4 border-b border-border flex justify-between items-center bg-card">
            <h2 className="font-semibold text-lg">Chats</h2>
            <Button size="icon" variant="ghost"><Plus className="h-5 w-5" /></Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : !threads?.length ? (
               <div className="text-center py-10 text-muted-foreground">No chats yet</div>
            ) : (
              Object.entries(groupedThreads || {}).map(([role, roleThreads]) => (
                <div key={role} className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">{role} Agents</h3>
                  {roleThreads.map((thread) => (
                    <Link key={thread.id} href={`/chat/${thread.id}`}>
                      <div className="p-3 rounded-md hover:bg-muted cursor-pointer transition-colors flex justify-between group">
                        <div className="overflow-hidden pr-2">
                          <div className="font-medium text-sm truncate">{thread.title || "New Conversation"}</div>
                          <div className="text-xs text-muted-foreground mt-1">{new Date(thread.createdAt).toLocaleDateString()}</div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </Link>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center bg-background/50">
          <Empty title="ForceFlow AI Agents" description="Select a conversation from the sidebar or start a new one." />
        </div>
      </div>
    </AppLayout>
  );
}
