import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <header className="fixed top-0 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto h-16 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="ForceFlow Logo" className="h-8" />
          </div>
          <div className="flex items-center gap-4">
            <Link href="/sign-in">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-32 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col items-center text-center space-y-8 mb-32">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground max-w-4xl leading-tight">
              Command Your Salesforce <br />
              <span className="text-primary">Operations Center</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
              Compress your Salesforce SDLC from weeks to hours. Automated CI/CD, AI agents, and intelligent quality gates in one unified console.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/sign-up">
                <Button size="lg" className="h-12 px-8 text-lg font-medium">Start Building</Button>
              </Link>
              <Link href="/sign-in">
                <Button size="lg" variant="outline" className="h-12 px-8 text-lg font-medium">Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
