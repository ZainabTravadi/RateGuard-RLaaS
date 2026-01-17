import { useState } from "react";
import { CodeBlock } from "@/components/CodeBlock";
import { Card } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ChevronRight, Code2, BookOpen, Shield, Zap } from "lucide-react";

export default function DocsPage() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
      document.body.removeChild(textarea);
    }
  };

  const codeExamples = [
    {
      title: "Install & Initialize",
      description: "Pin version and initialize with API key only",
      code: `import express from "express";
import { RateGuard } from "@rateguard/node";

const app = express();

// Initialize once at startup (no baseUrl needed)
RateGuard.init({
  apiKey: process.env.RATEGUARD_API_KEY,
});`,
      index: 0
    },
    {
      title: "Protect any endpoint",
      description: "Apply middleware selectively to the routes you choose",
      code: `import { RateGuard } from "@rateguard/node";

// Example: protect a POST action
app.post(
  "/api/your-endpoint",
  RateGuard.middleware(),
  async (req, res) => {
    // Your business logic
    res.json({ ok: true });
  }
);

// Example: protect a GET resource
app.get(
  "/api/resource",
  RateGuard.middleware(),
  async (req, res) => {
    res.json({ data: [] });
  }
);`,
      index: 1
    },
    {
      title: "Test & Verify",
      description: "Expect 200 for first N, then 429 with retryAfter",
      code: `# curl examples
# First request should succeed
curl -X POST https://your-app.example.com/api/your-endpoint -H "Content-Type: application/json" -d '{"sample":"payload"}'

# Send multiple rapid requests to trigger the limit
for i in {1..10}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST https://your-app.example.com/api/your-endpoint -H "Content-Type: application/json" -d '{"sample":"payload"}';
done

# Expect 429 with body including retryAfter once limit is exceeded`,
      index: 2
    }
  ];

  const sections = [
    {
      icon: BookOpen,
      title: "Getting Started",
      description: "Learn the basics of RateGuard and set up your first integration",
      items: [
        "Installation",
        "Configuration",
        "Authentication",
        "Your first request"
      ]
    },
    {
      icon: Code2,
      title: "API Reference",
      description: "Complete API documentation for RateGuard SDK and REST API",
      items: [
        "RateGuard.init()",
        "RateGuard.middleware()",
        "RateGuard.checkLimit()",
        "Response formats"
      ]
    },
    {
      icon: Shield,
      title: "Rate Limiting Rules",
      description: "Understand and configure rate limiting rules for your needs",
      items: [
        "Rule creation",
        "Threshold limits",
        "Time windows",
        "Advanced filtering"
      ]
    },
    {
      icon: Zap,
      title: "Best Practices",
      description: "Production-grade patterns for robust rate limiting",
      items: [
        "Error handling",
        "Monitoring & alerts",
        "Performance optimization",
        "Security considerations"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/5 via-background to-background pt-32 pb-20">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-bold text-foreground mb-4">
              Documentation
            </h1>
            <p className="text-xl text-muted-foreground">
              Complete guide to implementing RateGuard in your application. From basic setup to advanced configurations.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {sections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <Card key={idx} className="card-glow hover:border-primary/50 transition-all cursor-pointer">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {section.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {section.description}
                </p>
                <div className="space-y-1">
                  {section.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <ChevronRight className="h-3 w-3" />
                      {item}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Code Examples */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-4">Code Examples</h2>
          <p className="text-muted-foreground mb-8">
            Common integration patterns and usage examples
          </p>

          <div className="grid grid-cols-1 gap-6">
            {codeExamples.map((example) => (
              <Card key={example.index} className="card-glow">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {example.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {example.description}
                </p>
                <CodeBlock
                  code={example.code}
                  language={example.index === 2 ? "bash" : "typescript"}
                  onCopy={() => handleCopy(example.code, example.index)}
                  copied={copiedIndex === example.index}
                />
              </Card>
            ))}
          </div>
        </div>

        {/* Protect Any API Endpoint Guide */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-4">Protect Any API Endpoint</h2>
          <p className="text-muted-foreground mb-8">
            Apply RateGuard to any route in your application. Choose which endpoints to protect and configure different limits per endpoint in the dashboard.
          </p>

          <div className="grid grid-cols-1 gap-6">
            <Card className="card-glow">
              <h3 className="text-lg font-semibold text-foreground mb-2">Setup Overview</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Dashboard: Use your RateGuard workspace to manage API keys and rules</li>
                <li>SDK Package: <span className="font-mono">@rateguard/node@0.1.2</span></li>
                <li>Endpoints to Protect (examples only): <span className="font-mono">/api/your-endpoint</span>, <span className="font-mono">/api/resource</span>, <span className="font-mono">/api/action</span></li>
                <li>Pattern: Install SDK → initialize once → apply middleware per route you choose</li>
                <li>Limits: Configure different thresholds per endpoint/method in the dashboard</li>
              </ul>
            </Card>

            <Card className="card-glow">
              <h3 className="text-lg font-semibold text-foreground mb-2">What To Do</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-foreground">1) Install the SDK</h4>
                  <CodeBlock
                    code="npm install @rateguard/node@0.1.2"
                    language="bash"
                    className="mt-2"
                  />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">2) Initialize in your main app file</h4>
                  <CodeBlock
                    code={`import { RateGuard } from '@rateguard/node';

RateGuard.init({
  apiKey: process.env.RATEGUARD_API_KEY,
});`}
                    language="typescript"
                    className="mt-2"
                  />
                  <p className="text-sm text-muted-foreground mt-2">Store the API key in environment variables. No baseUrl needed.</p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground">3) Apply middleware to the endpoint</h4>
                  <CodeBlock
                    code={`app.post('/api/your-endpoint',
  RateGuard.middleware(),
  async (req, res) => {
    // Example route only—use your own endpoints
    res.json({ ok: true });
  }
);`}
                    language="typescript"
                    className="mt-2"
                  />
                  <p className="text-sm text-muted-foreground mt-2">Apply to any route you want protected. Use separate dashboard rules for different endpoints and methods.</p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground">4) Test the integration</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground mt-2">
                    <li>200/201: Request allowed (within limit)</li>
                    <li>429: Rate limit exceeded (includes <span className="font-mono">retryAfter</span>)</li>
                    <li>Dashboards: Verify requests and blocks in Analytics/Logs</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="card-glow">
              <h3 className="text-lg font-semibold text-foreground mb-2">Testing Checklist</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✓ SDK installed and builds without errors</li>
                <li>✓ RateGuard.init() called with correct API key</li>
                <li>✓ Middleware applied to the routes you chose (e.g., <span className="font-mono">/api/your-endpoint</span>)</li>
                <li>✓ First N requests return 200, N+1 returns 429 with retryAfter</li>
                <li>✓ Dashboard shows request logs and blocks</li>
                <li>✓ Limit resets after window</li>
              </ul>
            </Card>

            <Card className="card-glow">
              <h3 className="text-lg font-semibold text-foreground mb-2">Troubleshooting</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><span className="text-foreground font-medium">Not rate-limiting:</span> Check exact endpoint path/method in your rule, and middleware order (before handler).</li>
                <li><span className="text-foreground font-medium">API key required:</span> Ensure <span className="font-mono">RATEGUARD_API_KEY</span> is set, valid (<span className="font-mono">rg_live_</span>/<span className="font-mono">rg_test_</span>), and not revoked.</li>
                <li><span className="text-foreground font-medium">Global limiting:</span> Remove any global <span className="font-mono">app.use(RateGuard.middleware())</span>; apply only to routes you intend to protect.</li>
              </ul>
            </Card>
          </div>
        </div>

        {/* Key Concepts */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8">Key Concepts</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="card-glow">
              <h3 className="text-xl font-semibold text-foreground mb-3">Rate Limiting</h3>
              <p className="text-muted-foreground mb-4">
                Rate limiting restricts the number of requests a client can make within a specified time window. RateGuard provides flexible configuration to match any use case.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Per-IP, per-user, or custom identifier</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Configurable time windows</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Multiple endpoints with different limits</span>
                </li>
              </ul>
            </Card>

            <Card className="card-glow">
              <h3 className="text-xl font-semibold text-foreground mb-3">Identifiers</h3>
              <p className="text-muted-foreground mb-4">
                RateGuard uses identifiers to track individual clients. Choose the identifier that best matches your use case.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>IP Address (default)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>User ID</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>API Key</span>
                </li>
              </ul>
            </Card>

            <Card className="card-glow">
              <h3 className="text-xl font-semibold text-foreground mb-3">Time Windows</h3>
              <p className="text-muted-foreground mb-4">
                Define the period over which rate limits are enforced. Windows can be seconds, minutes, hours, or days.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Sliding window counters</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Automatic reset</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Sub-second precision</span>
                </li>
              </ul>
            </Card>

            <Card className="card-glow">
              <h3 className="text-xl font-semibold text-foreground mb-3">Responses</h3>
              <p className="text-muted-foreground mb-4">
                RateGuard returns standard HTTP status codes and headers for rate limit responses.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>429 Too Many Requests</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Retry-After header</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>X-RateLimit-* headers</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8">Frequently Asked Questions</h2>

          <div className="space-y-4">
            <Card className="card-glow">
              <h4 className="font-semibold text-foreground mb-2">How is RateGuard different from other rate limiting solutions?</h4>
              <p className="text-muted-foreground">
                RateGuard is purpose-built for modern APIs with blazing-fast response times, flexible configuration, and a developer-friendly dashboard. No complex setup required.
              </p>
            </Card>

            <Card className="card-glow">
              <h4 className="font-semibold text-foreground mb-2">Does RateGuard work with all frameworks?</h4>
              <p className="text-muted-foreground">
                Yes! RateGuard provides SDKs for Node.js (Express, Fastify, Koa), Python (Django, Flask, FastAPI), Java (Spring Boot), and more. We also offer a REST API for custom implementations.
              </p>
            </Card>

            <Card className="card-glow">
              <h4 className="font-semibold text-foreground mb-2">What happens if RateGuard is unavailable?</h4>
              <p className="text-muted-foreground">
                RateGuard uses fail-open behavior. If the service is unreachable, requests are allowed through while the SDK logs the error. Your application continues to serve requests.
              </p>
            </Card>

            <Card className="card-glow">
              <h4 className="font-semibold text-foreground mb-2">Can I test rate limiting locally?</h4>
              <p className="text-muted-foreground">
                Absolutely! For local development, you can point the RateGuard backend via <span className="font-mono">RATEGUARD_URL</span>. In production, the SDK uses the hosted RateGuard service by default.
              </p>
            </Card>
          </div>
        </div>

        {/* Call to Action */}
        <Card className="card-glow border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Ready to implement RateGuard?</h3>
              <p className="text-muted-foreground">
                Follow the integration guides to add rate limiting to your application.
              </p>
            </div>
            <Link to="/app/integrations">
              <Button className="bg-primary hover:bg-primary/90">
                View Integrations
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
