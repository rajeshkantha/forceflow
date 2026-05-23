import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetTenant } from "@workspace/api-client-react";

import LandingPage from "./pages/landing";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);
  return null;
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(250 100% 65%)",
    colorForeground: "hsl(213 31% 91%)",
    colorMutedForeground: "hsl(215 20.2% 65.1%)",
    colorDanger: "hsl(350 100% 50%)",
    colorBackground: "hsl(222 47% 7%)",
    colorInput: "hsl(216 34% 17%)",
    colorInputForeground: "hsl(213 31% 91%)",
    colorNeutral: "hsl(216 34% 17%)",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-card rounded-2xl w-[440px] max-w-full overflow-hidden border border-border shadow-lg",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-foreground font-semibold",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    formFieldLabel: "text-foreground font-medium",
    footerActionLink: "text-primary hover:text-primary/90 font-medium",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground bg-card",
    formFieldSuccessText: "text-emerald-500",
    alertText: "text-foreground",
    logoBox: "flex justify-center mb-6",
    logoImage: "h-10",
    socialButtonsBlockButton: "border-border hover:bg-muted text-foreground",
    formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
    formFieldInput: "bg-input border-border text-foreground",
    footerAction: "justify-center",
    dividerLine: "bg-border",
    alert: "bg-destructive/10 border-destructive/20 text-foreground",
    otpCodeFieldInput: "bg-input border-border text-foreground",
  },
};

function HomeRedirect() {
  const { isSignedIn, isLoaded } = useUser();
  const { data: tenant, isLoading: isTenantLoading, isError: isTenantError } = useGetTenant();

  if (!isLoaded || (isSignedIn && isTenantLoading)) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isSignedIn) {
    if (isTenantError || !tenant) return <Redirect to="/onboarding" />;
    return <Redirect to="/dashboard" />;
  }

  return <LandingPage />;
}

import {
  DashboardPage,
  OnboardingPage,
  OrgsPage,
  ModelsPage,
  TeamPage,
  ChatListPage,
  ChatPage,
  PipelinesPage,
  PipelineDetailPage,
  AnalysesPage,
  SettingsPage,
} from "./pages";

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "Welcome back to ForceFlow", subtitle: "Sign in to your workspace" } },
        signUp: { start: { title: "Create your ForceFlow account", subtitle: "Set up your Salesforce command center" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/onboarding/*?" component={OnboardingPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/orgs" component={OrgsPage} />
          <Route path="/models" component={ModelsPage} />
          <Route path="/team" component={TeamPage} />
          <Route path="/chat" component={ChatListPage} />
          <Route path="/chat/:threadId" component={ChatPage} />
          <Route path="/pipelines" component={PipelinesPage} />
          <Route path="/pipelines/:runId" component={PipelineDetailPage} />
          <Route path="/analyses" component={AnalysesPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route component={NotFound} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
