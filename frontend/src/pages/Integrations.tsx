import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
    codeExample: `import express from "express";
import { RateGuard } from "@rateguard/node";

const app = express();

// Initialize once with API key (no baseUrl needed)
RateGuard.init({
  apiKey: process.env.RATEGUARD_API_KEY,
});

// Example only: apply middleware to a route you choose
app.post(
  "/api/your-endpoint",
  RateGuard.middleware(),
  async (req, res) => {
    // Your application logic
    res.json({ ok: true });
  }
);`,
    steps: [
      "Install the SDK: npm install @rateguard/node@0.1.2",
      "Initialize RateGuard with only your API key",
      "Apply middleware to the routes you choose (example: POST /api/your-endpoint)",
      "Test: first N requests 200, N+1 returns 429 with retryAfter",
      "Monitor requests and blocks in Dashboard → Analytics/Logs"
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
    "http://localhost:4000/v1/check",
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
  const navigate = useNavigate();

  const handleIntegrationClick = (integration: Integration) => {
    if (integration.id === "nodejs") {
      navigate("/app/integrations/nodejs");
    } else {
      navigate("/app/integrations/coming-soon", {
        state: { name: integration.name, icon: integration.icon }
      });
    }
  };

  return (
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
              className={`card-glow transition-all duration-300 hover:border-primary/50 animate-fade-in`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{integration.icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{integration.name}</h3>
                
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{integration.description}</p>
              <Button 
                type="button"
                variant="outline" 
                className="w-full border-border hover:bg-primary/10 hover:border-primary/50 hover:text-primary"
                onClick={() => handleIntegrationClick(integration)}
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
                <h4 className="font-medium text-foreground">Generate API Key</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Go to Settings → API Keys and generate a new key. Copy it immediately as it won't be shown again.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary font-bold">
                2
              </div>
              <div>
                <h4 className="font-medium text-foreground">Install SDK & Initialize</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Install the Node.js SDK with npm, then initialize it with your API key (no backend URL needed).
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary font-bold">
                3
              </div>
              <div>
                <h4 className="font-medium text-foreground">Configure & Monitor</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Create rate limiting rules in Rules & Policies. Monitor traffic in real-time via Analytics.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
  );
}
