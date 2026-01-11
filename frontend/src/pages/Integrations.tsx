import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Check, Copy, ExternalLink, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Integration {
  id: string;
  name: string;
  icon: string;
  description: string;
  status: "connected" | "available";
  codeExample: string;
  steps: string[];
}

const integrations: Integration[] = [
  {
    id: "nodejs",
    name: "Node.js",
    icon: "🟢",
    description: "Official SDK for Node.js applications with Express, Fastify, and Koa support.",
    status: "connected",
    codeExample: `import RateGuard from "@rateguard/node";

const limiter = new RateGuard({
  apiKey: "YOUR_API_KEY",
  rules: {
    requests: 100,
    window: "1m"
  }
});

app.use(limiter.middleware());`,
    steps: [
      "Install the SDK: npm install @rateguard/node",
      "Import RateGuard in your application",
      "Initialize with your API key from the Settings page",
      "Add the middleware to your Express/Fastify app",
      "Configure rate limit rules as needed"
    ]
  },
  {
    id: "python",
    name: "Python",
    icon: "🐍",
    description: "Python SDK with support for Django, Flask, and FastAPI frameworks.",
    status: "available",
    codeExample: `from rateguard import RateGuard

limiter = RateGuard(
    api_key="YOUR_API_KEY",
    rules={
        "requests": 100,
        "window": "1m"
    }
)

@app.route("/api/data")
@limiter.limit()
def get_data():
    return {"data": "protected"}`,
    steps: [
      "Install the SDK: pip install rateguard",
      "Import RateGuard in your application",
      "Initialize with your API key",
      "Use the @limiter.limit() decorator on routes",
      "Configure custom rules per endpoint"
    ]
  },
  {
    id: "java",
    name: "Java",
    icon: "☕",
    description: "Java SDK for Spring Boot and enterprise applications.",
    status: "available",
    codeExample: `import com.rateguard.RateGuard;
import com.rateguard.config.RateConfig;

@Configuration
public class RateLimitConfig {
    @Bean
    public RateGuard rateGuard() {
        return RateGuard.builder()
            .apiKey("YOUR_API_KEY")
            .requestsPerMinute(100)
            .build();
    }
}`,
    steps: [
      "Add Maven/Gradle dependency",
      "Create a configuration class",
      "Initialize RateGuard bean with your API key",
      "Annotate controllers with @RateLimit",
      "Monitor through the dashboard"
    ]
  },
  {
    id: "nginx",
    name: "NGINX",
    icon: "⚡",
    description: "NGINX module for edge-level rate limiting with zero application changes.",
    status: "available",
    codeExample: `# nginx.conf
load_module modules/ngx_rateguard_module.so;

http {
    rateguard_api_key "YOUR_API_KEY";
    
    server {
        location /api/ {
            rateguard on;
            rateguard_limit 100r/m;
            proxy_pass http://backend;
        }
    }
}`,
    steps: [
      "Download the NGINX module from our CDN",
      "Load the module in nginx.conf",
      "Set your API key in the http block",
      "Enable rateguard on desired locations",
      "Reload NGINX: nginx -s reload"
    ]
  },
  {
    id: "api-gateway",
    name: "API Gateway",
    icon: "🔌",
    description: "Direct REST API integration for custom implementations and gateways.",
    status: "available",
    codeExample: `// Check rate limit before processing request
const response = await fetch(
  "https://api.rateguard.io/v1/check",
  {
    method: "POST",
    headers: {
      "Authorization": "Bearer YOUR_API_KEY",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      identifier: request.ip,
      endpoint: "/api/data",
      rule: "default"
    })
  }
);

const { allowed, remaining } = await response.json();`,
    steps: [
      "Generate an API key from Settings",
      "Make a POST request to /v1/check endpoint",
      "Include identifier (IP, user ID, etc.)",
      "Check the 'allowed' field in response",
      "Handle rate limit headers appropriately"
    ]
  }
];

export default function IntegrationsPage() {
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
  <>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
          <p className="text-muted-foreground mt-1">
            Connect RateGuard to your applications using our SDKs and APIs
          </p>
        </div>

        {/* Integration Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((integration, index) => (
            <Card 
              key={integration.id} 
              className={`card-glow cursor-pointer transition-all duration-300 hover:border-primary/50 animate-fade-in`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{integration.icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{integration.name}</h3>
                    {integration.status === "connected" && (
                      <span className="badge-pill border status-allowed text-xs">
                        Connected
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{integration.description}</p>
              <Button 
                variant="outline" 
                className="w-full border-border hover:bg-primary/10 hover:border-primary/50 hover:text-primary"
                onClick={() => setSelectedIntegration(integration)}
              >
                View Integration Guide
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>

        {/* Quick Start Section */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
            <CardDescription>Get started in under 5 minutes</CardDescription>
          </CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary font-bold">
                1
              </div>
              <div>
                <h4 className="font-medium text-foreground">Get your API Key</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Navigate to Settings and generate a new API key for your environment.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary font-bold">
                2
              </div>
              <div>
                <h4 className="font-medium text-foreground">Install the SDK</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose your platform above and follow the installation steps.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary font-bold">
                3
              </div>
              <div>
                <h4 className="font-medium text-foreground">Configure Rules</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Set up your rate limiting rules in the Rules & Policies page.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Integration Modal */}
      <Dialog open={!!selectedIntegration} onOpenChange={() => setSelectedIntegration(null)}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{selectedIntegration?.icon}</span>
              <div>
                <DialogTitle className="text-xl">{selectedIntegration?.name} Integration</DialogTitle>
                <DialogDescription>{selectedIntegration?.description}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            {/* Steps */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-3">Setup Steps</h4>
              <div className="space-y-2">
                {selectedIntegration?.steps.map((step, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
                      {index + 1}
                    </div>
                    <p className="text-sm text-muted-foreground pt-0.5">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Code Example */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-foreground">Code Example</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyCode(selectedIntegration?.codeExample || "")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {copiedCode ? (
                    <>
                      <Check className="h-4 w-4 mr-2 text-success" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy code
                    </>
                  )}
                </Button>
              </div>
              <pre className="code-block">
                <code className="text-sm text-foreground">
                  {selectedIntegration?.codeExample}
                </code>
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
