import { Card } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Rocket, Mail, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function ComingSoonPage() {
  const location = useLocation();
  const integrationName = location.state?.name || "This Integration";
  const integrationIcon = location.state?.icon || "🔌";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
      <div className="absolute inset-0 bg-gradient-glow" />
      
      <div className="relative max-w-2xl mx-auto px-6 text-center">
        <Card className="card-glow p-12">
          {/* Icon */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                <span className="text-6xl">{integrationIcon}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-4 mb-8">
            <h1 className="text-3xl font-bold text-foreground">
              {integrationName} Integration
            </h1>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Rocket className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Coming Soon</span>
            </div>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto">
              We're working hard to bring {integrationName} support to RateGuard. 
              Stay tuned for updates!
            </p>
          </div>

          {/* Features Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left">
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <h3 className="font-semibold text-foreground mb-2">Easy Setup</h3>
              <p className="text-sm text-muted-foreground">
                Simple installation and configuration process
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <h3 className="font-semibold text-foreground mb-2">Native SDK</h3>
              <p className="text-sm text-muted-foreground">
                Official SDK with full language support
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <h3 className="font-semibold text-foreground mb-2">Type Safety</h3>
              <p className="text-sm text-muted-foreground">
                Complete type definitions and documentation
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <h3 className="font-semibold text-foreground mb-2">Production Ready</h3>
              <p className="text-sm text-muted-foreground">
                Battle-tested and optimized for scale
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>Want early access? Contact us at support@rateguard.io</span>
            </div>
            
            <Link to="/app/integrations">
              <Button variant="outline" className="border-border">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Integrations
              </Button>
            </Link>
          </div>
        </Card>

        {/* Available Integration */}
        <div className="mt-8 p-4 rounded-lg bg-muted/30 border border-border">
          <p className="text-sm text-muted-foreground mb-3">
            Meanwhile, check out our Node.js integration:
          </p>
          <Link to="/app/integrations/nodejs">
            <Button className="bg-primary hover:bg-primary/90">
              <span className="mr-2">🟢</span>
              View Node.js Guide
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
