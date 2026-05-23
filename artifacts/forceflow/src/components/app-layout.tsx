import { ReactNode } from "react";
import { Link, useLocation, Redirect } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { useGetTenant } from "@workspace/api-client-react";
import {
  LayoutDashboard,
  MessageSquare,
  BrainCircuit,
  GitBranch,
  Cloud,
  Cpu,
  Users,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

interface AppLayoutProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Chat", href: "/chat", icon: MessageSquare },
  { label: "Analyses", href: "/analyses", icon: BrainCircuit },
  { label: "Pipelines", href: "/pipelines", icon: GitBranch },
  { label: "Orgs", href: "/orgs", icon: Cloud },
  { label: "Models", href: "/models", icon: Cpu },
  { label: "Team", href: "/team", icon: Users },
];

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const { data: tenant, isLoading: isTenantLoading, isError: isTenantError } = useGetTenant();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Redirect to="/sign-in" />;
  }

  // If tenant fetch failed (no tenant/onboarding not done), redirect to onboarding
  if (!isTenantLoading && isTenantError) {
    return <Redirect to="/onboarding" />;
  }

  const NavContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 p-6">
        <img src="/logo.svg" alt="ForceFlow" className="h-8 w-8" />
        <div className="flex flex-col">
          <span className="font-bold leading-none tracking-tight text-foreground">
            ForceFlow
          </span>
          {isTenantLoading ? (
            <Skeleton className="h-3 w-20 mt-1" />
          ) : (
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
              {tenant?.name || "Workspace"}
            </span>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-4">
        {NAV_ITEMS.map((item) => {
          const isActive = location.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <Link href="/settings">
          <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer mb-2">
            <Settings className="h-4 w-4" />
            Settings
          </div>
        </Link>

        <div className="flex items-center justify-between rounded-md p-2 bg-card border border-border">
          <div className="flex items-center gap-3 overflow-hidden">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.imageUrl} />
              <AvatarFallback>
                {user.firstName?.charAt(0) || user.emailAddresses[0].emailAddress.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-medium truncate">
                {user.fullName || "User"}
              </span>
              <span className="text-[10px] text-muted-foreground truncate">
                {user.emailAddresses[0].emailAddress}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card/50 backdrop-blur">
        <NavContent />
      </aside>

      {/* Mobile Header & Sidebar */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-4 border-b border-border bg-card/50 backdrop-blur px-4 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <NavContent />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="ForceFlow" className="h-6 w-6" />
            <span className="font-bold">ForceFlow</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
