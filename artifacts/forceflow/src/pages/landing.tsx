import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, GitBranch, Shield, Zap, Cloud, Users, CheckCircle2, ArrowRight } from "lucide-react";

const FEATURES = [
  {
    icon: Bot,
    title: "Role-Based AI Agents",
    description: "Frontier, Developer, Sales, Support, and SME agents — each with its own tool set, system prompt, and access level scoped to your company's Salesforce org.",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
  },
  {
    icon: Zap,
    title: "Plan & Execute Mode",
    description: "Every change goes through an AI-generated plan with current state analysis, gap detection, and sequenced steps. You approve. The agent executes.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    icon: GitBranch,
    title: "CI/CD Pipeline Engine",
    description: "Git-backed environment promotion from Dev → QA → UAT → Production with delta deployments, Apex test gates, and Frontier approval at every stage.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Shield,
    title: "Intelligent Quality Gates",
    description: "PMD, ESLint, and Salesforce Code Analyzer integrated into every pipeline run. CRITICAL violations block merges. AI generates quick-fix suggestions.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    icon: Cloud,
    title: "Multi-Org Management",
    description: "Connect unlimited Salesforce orgs — Production, Sandbox, Developer, Scratch. Switch between orgs per chat thread with the org carousel.",
    color: "text-sky-400",
    bg: "bg-sky-500/10",
  },
  {
    icon: Users,
    title: "Multi-Tenant Teams",
    description: "Company-scoped workspaces with full RBAC. Frontier onboards the team, assigns roles, and maintains audit logs of every action.",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
];

const SDLC_ROWS = [
  ["Requirement → Design", "4–8 hrs", "30 min", "~85%"],
  ["Dev: Apex + config", "1–3 days", "2–4 hrs", "~80%"],
  ["Code review + quality", "4–8 hrs", "15 min", "~95%"],
  ["Deploy to sandbox", "30–60 min", "2 min", "~97%"],
  ["Write Apex test classes", "4–8 hrs", "30 min", "~90%"],
  ["QA smoke testing", "1–2 days", "30–40 min", "~95%"],
  ["Production deploy", "2–4 hrs", "10 min", "~95%"],
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 w-full border-b border-border/30 bg-background/90 backdrop-blur z-50">
        <div className="container mx-auto h-14 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="ForceFlow" className="h-7 w-7" />
            <span className="font-bold tracking-tight">ForceFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in"><Button variant="ghost" size="sm">Sign In</Button></Link>
            <Link href="/sign-up"><Button size="sm">Get Started <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button></Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="pt-32 pb-20 px-4 md:px-8">
          <div className="container mx-auto max-w-5xl">
            <div className="flex flex-col items-center text-center space-y-6">
              <Badge className="text-xs bg-primary/10 text-primary border-primary/20 px-3 py-1">
                Multi-Tenant · AI-Native · Plan & Execute
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight max-w-4xl">
                Your Salesforce SDLC,<br />
                <span className="text-primary">Compressed to Hours</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
                Role-based AI agents that know your org, generate implementation plans, require your approval, then execute. CI/CD pipelines, quality gates, and autonomous QA — all in one platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link href="/sign-up">
                  <Button size="lg" className="h-11 px-8 text-base">Start for Free</Button>
                </Link>
                <Link href="/sign-in">
                  <Button size="lg" variant="outline" className="h-11 px-8 text-base">Sign In</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* SDLC Table */}
        <section className="py-16 px-4 md:px-8 bg-card/30 border-y border-border/30">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold text-center mb-8">SDLC Time Reduction</h2>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phase</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Manual Today</th>
                    <th className="text-center px-4 py-3 font-medium text-primary">ForceFlow</th>
                    <th className="text-center px-4 py-3 font-medium text-emerald-400">Reduction</th>
                  </tr>
                </thead>
                <tbody>
                  {SDLC_ROWS.map(([phase, manual, forceflow, reduction], i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{phase}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{manual}</td>
                      <td className="px-4 py-3 text-center text-primary font-medium">{forceflow}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">{reduction}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 px-4 md:px-8">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold text-center mb-12">Everything Your Salesforce Team Needs</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map(f => (
                <div key={f.title} className="p-5 rounded-xl border border-border/60 bg-card/50 hover:border-border transition-colors">
                  <div className={`h-9 w-9 rounded-lg ${f.bg} flex items-center justify-center mb-4`}>
                    <f.icon className={`h-5 w-5 ${f.color}`} />
                  </div>
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Roles */}
        <section className="py-16 px-4 md:px-8 bg-card/30 border-y border-border/30">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold text-center mb-3">Five Agent Roles, One Platform</h2>
            <p className="text-muted-foreground text-center text-sm mb-10">Each role has dedicated tools, a company-specific system prompt, and hard refusal patterns.</p>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {[
                { role: "Frontier", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30", desc: "Full access" },
                { role: "Developer", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30", desc: "Code & config" },
                { role: "Sales", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", desc: "Pipeline & CRM" },
                { role: "Support", color: "text-amber-400 bg-amber-500/10 border-amber-500/30", desc: "Cases & SLAs" },
                { role: "SME", color: "text-violet-400 bg-violet-500/10 border-violet-500/30", desc: "Read-only analysis" },
              ].map(r => (
                <div key={r.role} className={`p-4 rounded-lg border ${r.color} text-center`}>
                  <p className="font-semibold text-sm">{r.role}</p>
                  <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4 text-center">
          <div className="container mx-auto max-w-xl space-y-5">
            <h2 className="text-3xl font-bold">Ready to compress your SDLC?</h2>
            <p className="text-muted-foreground">Set up your workspace in under 5 minutes. Free models available via OpenRouter.</p>
            <Link href="/sign-up">
              <Button size="lg" className="h-11 px-10">
                Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/30 py-8 px-4 text-center text-xs text-muted-foreground">
        <p>ForceFlow — making Salesforce SDLC as fast as the ideas that drive it.</p>
      </footer>
    </div>
  );
}
