import { useNavigate } from "react-router-dom";
import { 
  Shield, 
  Users, 
  BarChart3, 
  Code2, 
  Zap, 
  Lock, 
  Activity, 
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useAuth } from "@/context/AuthContext";

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleGoToConsole = () => {
    if (isAuthenticated) {
      navigate("/app");
    } else {
      navigate("/login");
    }
  };

  const handleViewDocs = () => {
    navigate("/docs");
  };

  const features = [
    {
      icon: Shield,
      title: "Rate Limiting",
      description: "Protect your APIs from abuse with flexible, customizable rate limits. Define rules per endpoint, user, or IP.",
    },
    {
  icon: Users,
  title: "Team Access & Roles",
  description:
    "Invite teammates to your workspace and manage permissions with admin and viewer roles. Collaborate on rate limits, environments, and analytics in one place.",
},
    {
      icon: BarChart3,
      title: "Traffic Analytics",
      description: "Monitor request patterns, identify trends, and optimize your API performance with detailed insights.",
    },
    {
      icon: Code2,
      title: "API-first Integration",
      description: "Simple SDK integration with Node.js, Python, Go, and more. Get started in minutes, not hours.",
    },
    {
      icon: Activity,
      title: "Performance Monitoring",
      description: "Track response times, error rates, and uptime across all your protected endpoints.",
    },
    {
      icon: Lock,
      title: "Security & Compliance",
      description: "Enterprise-grade security with API key management, audit logs, and role-based access control.",
    },
  ];

  const benefits = [
    "Built for production workloads",
    "99.99% uptime SLA",
    "Sub-millisecond latency",
    "Scale to millions of requests",
  ];

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-32 pb-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 tracking-tight">
            Protect your APIs from abuse with RateGuard
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Production-grade rate limiting, alerts, and analytics for modern APIs. 
            Deploy in minutes, scale to millions.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" onClick={handleGoToConsole}>
              Go to Console
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={handleViewDocs}>
              View Docs
            </Button>
          </div>

          {/* Code Preview */}
          <div className="mt-16 p-6 rounded-lg bg-gradient-to-br from-blue-600/30 to-blue-500/10 border border-blue-500/30 text-left">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-warning/60" />
                <div className="w-3 h-3 rounded-full bg-success/60" />
              </div>
              <span className="text-xs text-muted-foreground ml-2">Quick Start</span>
            </div>
            <pre className="text-sm font-mono text-blue-100 overflow-x-auto">
              <code>{`import { RateGuard } from '@rateguard/node';

const limiter = new RateGuard({
  apiKey: process.env.RATEGUARD_API_KEY
});

app.use(limiter.middleware()); // ✨ Instant protection`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything you need to protect your APIs
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive rate limiting and monitoring tools designed for modern development teams.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="bg-card hover:bg-card/80 transition-colors border border-border hover:border-blue-500/40">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600/40 to-blue-500/20 border border-blue-500/40 mb-4">
                    <feature.icon className="h-6 w-6 text-blue-400" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust / Proof Section */}
      <section className="container mx-auto px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-blue-600/25 to-blue-500/15 border border-blue-500/40">
            <CardContent className="p-12">
              <div className="text-center mb-8">
                <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                  Built for production workloads
                </h3>
                <p className="text-lg text-muted-foreground">
                  Trusted by teams who care about reliability and performance.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-green-500/40 to-green-400/20 border border-green-500/40 flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    </div>
                    <span className="text-foreground font-medium">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="mt-12 text-center">
                <Button size="lg" onClick={handleGoToConsole}>
                  Get Started Free
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-6 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600/40 to-blue-500/20 border border-blue-500/40 mb-6">
            <Zap className="h-8 w-8 text-blue-400" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to protect your APIs?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join developers who trust RateGuard to keep their APIs secure and performant.
          </p>
          <Button size="lg" onClick={handleGoToConsole}>
            Start Building Now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}
