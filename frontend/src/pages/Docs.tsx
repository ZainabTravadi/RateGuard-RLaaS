import { useState } from "react";
import { CodeBlock } from "@/components/CodeBlock";
import { Card } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ChevronRight, Code2, BookOpen, Shield, Zap, CheckCircle2, AlertCircle } from "lucide-react";

export default function DocsPage() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

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

  const steps = [
    {
      number: "1",
      title: "Install the SDK",
      code: "npm install @rateguard/node",
      description: "Add the RateGuard SDK to your Node.js project"
    },
    {
      number: "2",
      title: "Configure Environment Variables",
      code: `RATEGUARD_API_KEY=your_api_key_here
RATEGUARD_BASE_URL=http://localhost:4000`,
      description: "Create a .env file with your API key and backend URL"
    },
    {
      number: "3",
      title: "Create an API Key",
      description: "In the RateGuard dashboard:\n1. Open your project\n2. Go to API keys or settings\n3. Create a new API key\n4. Copy into RATEGUARD_API_KEY\n5. Keep private, don't commit to source control"
    },
    {
      number: "4",
      title: "Add Express Integration",
      code: `import express from "express";
import dotenv from "dotenv";
import { RateGuard } from "@rateguard/node";

dotenv.config();

RateGuard.init({
  apiKey: process.env.RATEGUARD_API_KEY,
  baseUrl: process.env.RATEGUARD_BASE_URL
});

const app = express();

app.use(express.json());

app.use(
  RateGuard.middleware({
    identifier: (req) =>
      req.headers["x-user-id"] || req.ip
  })
);

app.get("/health", (req, res) => {
  res.json({
    status: "ok"
  });
});

app.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Protected route"
  });
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(
    \`Test app running on http://localhost:\${PORT}\`
  );
});`,
      description: "Copy-paste ready Express app with RateGuard middleware"
    }
  ];

  const archFlow = [
    { name: "Your Express App", icon: "📱" },
    { name: "RateGuard SDK Middleware", icon: "🔒" },
    { name: "RateGuard Backend API", icon: "⚙️" },
    { name: "Redis + Database", icon: "💾" },
    { name: "Analytics + Logs", icon: "📊" },
    { name: "Frontend Dashboard", icon: "📈" }
  ];

  const faqItems = [
    {
      question: "What is dashboard-controlled rate limiting?",
      answer: "You define rate limits in the RateGuard dashboard instead of hardcoding them in application code. The SDK fetches rules dynamically and enforces them at runtime. Change limits instantly without redeploying."
    },
    {
      question: "How do I identify who is being rate limited?",
      answer: "The identifier function in the middleware determines who is being limited. By default, it uses the client's IP address. You can customize it to use user ID, API key, or any other identifier that makes sense for your app."
    },
    {
      question: "What happens if the backend is unreachable?",
      answer: "RateGuard uses fail-open behavior. If the backend is down, requests are allowed through by default. An error will be logged so you know there's a connectivity issue. Your application continues to serve requests."
    },
    {
      question: "Can I test rate limiting locally?",
      answer: "Yes! Use http://localhost:4000 for RATEGUARD_BASE_URL during local development. In production, use your deployed backend URL. Both environments can have different API keys."
    },
    {
      question: "Why aren't my rules applying?",
      answer: "Check that: (1) the rule is enabled in the dashboard, (2) the endpoint path/method matches exactly, (3) the middleware is applied before your route handler, (4) the identifier matches your intended scope."
    }
  ];

  const troubleshooting = [
    {
      title: "Invalid API Key",
      symptom: "App starts but requests aren't authenticated against RateGuard or SDK reports auth error",
      fixes: [
        "Verify RATEGUARD_API_KEY is set in environment",
        "Confirm key was copied from correct dashboard project/environment",
        "Restart app after changing .env"
      ]
    },
    {
      title: "Backend Unreachable",
      symptom: "SDK cannot contact the RateGuard backend",
      fixes: [
        "Check RATEGUARD_BASE_URL",
        "Confirm backend is running and reachable from your app",
        "Verify local dev URLs differ from production URLs"
      ]
    },
    {
      title: "Rules Not Applying",
      symptom: "Requests keep passing even though a dashboard rule exists",
      fixes: [
        "Make sure the rule is enabled in dashboard",
        "Verify rule targets correct endpoint, method, or scope",
        "Confirm route is actually protected by middleware",
        "Check that identifier matches the scope you intended"
      ]
    },
    {
      title: "Blocked Requests Not Visible",
      symptom: "Clients receive 429, but no blocked events in dashboard",
      fixes: [
        "Verify app uses correct project API key",
        "Confirm backend URL points to same environment as dashboard",
        "Wait a moment and refresh dashboard analytics or logs"
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
              Getting Started with RateGuard
            </h1>
            <p className="text-xl text-muted-foreground">
              Complete setup guide for integrating RateGuard into your Node.js application. From installation to production deployment.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        
        {/* Architecture Overview */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-4">Architecture Overview</h2>
          <p className="text-muted-foreground mb-8">
            RateGuard follows a simple flow: Dashboard defines rules, SDK fetches them dynamically, middleware enforces automatically, analytics update in real-time.
          </p>
          
          <Card className="card-glow p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
              {archFlow.map((item, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <div className="text-4xl mb-2">{item.icon}</div>
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  {idx < archFlow.length - 1 && (
                    <div className="hidden md:block text-2xl text-muted-foreground mt-4">↓</div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-8 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Key principle:</strong> Developers do NOT hardcode rate limits. Rules live in the dashboard, and the SDK applies them dynamically without requiring app redeployment.
              </p>
            </div>
          </Card>
        </div>

        {/* Step-by-Step Setup */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8">Step-by-Step Setup</h2>

          <div className="space-y-6">
            {steps.map((step, idx) => (
              <Card key={idx} className="card-glow">
                <div className="flex gap-6">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 border border-primary/20">
                      <span className="text-lg font-bold text-primary">{step.number}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-3">{step.title}</h3>
                    <p className="text-muted-foreground mb-4 whitespace-pre-wrap">{step.description}</p>
                    {step.code && (
                      <CodeBlock
                        code={step.code}
                        language={step.number === "1" || step.number === "2" ? "bash" : "typescript"}
                        onCopy={() => handleCopy(step.code, parseInt(step.number))}
                        copied={copiedIndex === parseInt(step.number)}
                      />
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Key Information Sections */}
        <div className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="card-glow">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Code2 className="h-5 w-5 text-primary" />
                Environment Variables
              </h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-mono text-primary mb-1">RATEGUARD_API_KEY</p>
                  <p className="text-muted-foreground">Created in dashboard. Identifies your project and authenticates SDK requests.</p>
                </div>
                <div>
                  <p className="font-mono text-primary mb-1">RATEGUARD_BASE_URL</p>
                  <p className="text-muted-foreground">Local: http://localhost:4000 | Production: your deployed backend URL</p>
                </div>
              </div>
            </Card>

            <Card className="card-glow">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Why This Order Matters
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span><strong>dotenv.config()</strong> loads env before SDK init</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span><strong>RateGuard.init()</strong> runs once at startup</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span><strong>Middleware</strong> protects every request</span>
                </li>
              </ul>
            </Card>

            <Card className="card-glow">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Creating Dashboard Rules
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Rules are NOT in code. They live in the dashboard and apply dynamically.
              </p>
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                <li>Open RateGuard dashboard</li>
                <li>Navigate to Rules page</li>
                <li>Click Create Rule</li>
                <li>Set limit (e.g., 10 requests/minute)</li>
                <li>Set endpoint and scope</li>
                <li>Enable rule</li>
              </ol>
            </Card>

            <Card className="card-glow">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Testing Rate Limiting
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Send repeated requests to test enforcement:
              </p>
              <CodeBlock
                code={`for i in {1..20}; do
  curl http://localhost:3000/test
done`}
                language="bash"
                onCopy={() => handleCopy(`for i in {1..20}; do\n  curl http://localhost:3000/test\ndone`, 99)}
                copied={copiedIndex === 99}
                className="text-xs"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Expected: First 10 → 200, remaining → 429
              </p>
            </Card>
          </div>
        </div>

        {/* Response Format */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-4">Expected Response Format</h2>
          <p className="text-muted-foreground mb-6">
            When a rate limit is exceeded, the SDK returns 429 with metadata to help clients understand when to retry.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="card-glow">
              <h3 className="text-lg font-semibold text-foreground mb-4">Response Headers</h3>
              <CodeBlock
                code={`X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
Retry-After: 42`}
                language="text"
                onCopy={() => handleCopy(`X-RateLimit-Limit: 10\nX-RateLimit-Remaining: 0\nRetry-After: 42`, 100)}
                copied={copiedIndex === 100}
              />
            </Card>

            <Card className="card-glow">
              <h3 className="text-lg font-semibold text-foreground mb-4">Response Body (429)</h3>
              <CodeBlock
                code={`{
  "error": "Rate limit exceeded",
  "retryAfter": 42
}`}
                language="json"
                onCopy={() => handleCopy(`{\n  "error": "Rate limit exceeded",\n  "retryAfter": 42\n}`, 101)}
                copied={copiedIndex === 101}
              />
            </Card>
          </div>
        </div>

        {/* Dashboard Metrics */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-4">Dashboard Metrics</h2>
          <p className="text-muted-foreground mb-6">
            Once traffic flows through your app, the dashboard displays:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              "Total Requests",
              "Blocked Requests",
              "Request Logs",
              "Traffic Analytics",
              "Block Rate %",
              "Peak Hours"
            ].map((metric, idx) => (
              <Card key={idx} className="card-glow">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="font-medium text-foreground">{metric}</span>
                </div>
              </Card>
            ))}
          </div>

          <Card className="card-glow mt-6 bg-muted/50">
            <p className="text-sm text-muted-foreground">
              Use these metrics to verify that rules are firing, traffic patterns are visible, and blocked requests are being recorded as expected.
            </p>
          </Card>
        </div>

        {/* Troubleshooting */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8">Troubleshooting</h2>

          <div className="space-y-6">
            {troubleshooting.map((item, idx) => (
              <Card key={idx} className="card-glow border-l-4 border-l-primary/30">
                <div className="flex gap-4">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      <strong>Symptom:</strong> {item.symptom}
                    </p>
                    <p className="text-sm font-medium text-foreground mb-2">Fixes:</p>
                    <ul className="space-y-1">
                      {item.fixes.map((fix, fixIdx) => (
                        <li key={fixIdx} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-primary">→</span>
                          {fix}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Production Checklist */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-4">Production Checklist</h2>
          
          <Card className="card-glow">
            <ul className="space-y-3">
              {[
                "Set RATEGUARD_API_KEY and RATEGUARD_BASE_URL in runtime environment",
                "Keep rate limits in dashboard, not in app code",
                "Initialize SDK once at process startup",
                "Apply RateGuard.middleware() before protected routes",
                "Test /test route with repeated requests, verify 429 responses",
                "Review dashboard logs and analytics after rollout"
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{item}</span>
                </div>
              ))}
            </ul>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8">Frequently Asked Questions</h2>

          <div className="space-y-4">
            {faqItems.map((item, idx) => (
              <Card
                key={idx}
                className="card-glow cursor-pointer transition-all"
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
              >
                <div className="flex items-start justify-between gap-4">
                  <h4 className="font-semibold text-foreground">{item.question}</h4>
                  <ChevronRight
                    className={`h-5 w-5 text-muted-foreground flex-shrink-0 transition-transform ${
                      expandedFaq === idx ? "rotate-90" : ""
                    }`}
                  />
                </div>
                {expandedFaq === idx && (
                  <p className="text-muted-foreground mt-4 pt-4 border-t border-border">
                    {item.answer}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Summary */}
        <Card className="card-glow border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Ready to Deploy?</h3>
              <p className="text-muted-foreground">
                Your app initializes the SDK once. The dashboard defines rules. Middleware enforces automatically. Changes take effect instantly without redeploying.
              </p>
            </div>
            <Link to="/app/rules">
              <Button className="bg-primary hover:bg-primary/90 whitespace-nowrap">
                Create a Rule
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
