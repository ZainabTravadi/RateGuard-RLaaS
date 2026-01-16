import { useState } from "react";
import { Card } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Check, Copy, Terminal, Package, Code, Settings, Zap, Shield, CheckCircle2, AlertCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function NodeIntegrationPage() {
  const navigate = useNavigate();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback: create a temporary textarea
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
      document.body.removeChild(textarea);
    }
  };

  const steps = [
    {
      number: 1,
      icon: Package,
      title: "Install the SDK",
      description: "Add @rateguard/node to your project using npm or yarn",
      code: "npm install @rateguard/node",
      details: [
        "Requires Node.js 18 or higher",
        "Full TypeScript support included",
        "Works with Express, Fastify, Koa, and any Node.js framework"
      ]
    },
    {
      number: 2,
      icon: Settings,
      title: "Get Your API Key",
      description: "Generate an API key from the RateGuard dashboard",
      code: null,
      details: [
        "Navigate to Settings → API Keys",
        "Click 'Generate New Key'",
        "Copy the key immediately (it won't be shown again)",
        "Store it securely in environment variables"
      ],
      action: {
        label: "Go to Settings",
        link: "/app/settings"
      }
    },
    {
      number: 3,
      icon: Code,
      title: "Initialize the SDK",
      description: "Configure RateGuard with your API key and base URL",
      code: `import { RateGuard } from '@rateguard/node';

// Initialize once at app startup
RateGuard.init({
  apiKey: process.env.RATEGUARD_API_KEY,
  baseUrl: process.env.RATEGUARD_URL || 'http://localhost:4000'
});`,
      details: [
        "Call RateGuard.init() before using any middleware",
        "Use environment variables for security",
        "baseUrl defaults to production if not specified",
        "Set RATEGUARD_URL to your backend URL (e.g., http://localhost:4000)"
      ]
    },
    {
      number: 4,
      icon: Shield,
      title: "Apply Middleware",
      description: "Protect your routes with automatic rate limiting",
      code: `import express from 'express';
import { RateGuard } from '@rateguard/node';

const app = express();

// Option 1: Protect all routes
app.use(RateGuard.middleware());

// Option 2: Protect specific routes
app.get('/api/data', RateGuard.middleware(), (req, res) => {
  res.json({ message: 'Protected by RateGuard' });
});

app.listen(3000);`,
      details: [
        "Middleware automatically checks rate limits for each request",
        "Returns 429 status when limit exceeded",
        "Includes retry-after header in responses",
        "Works with any Express-compatible framework"
      ]
    },
    {
      number: 5,
      icon: Zap,
      title: "Configure Rules",
      description: "Set up rate limiting rules in the RateGuard dashboard",
      code: null,
      details: [
        "Go to Rules & Policies page",
        "Create rules for different endpoints",
        "Set limits (e.g., 100 requests per minute)",
        "Rules apply immediately without code changes"
      ],
      action: {
        label: "Configure Rules",
        link: "/app/rules"
      }
    }
  ];

  const advancedExamples = [
    {
      title: "Programmatic Usage",
      description: "Check rate limits programmatically without middleware",
      code: `import { limit } from '@rateguard/node';

async function processTask(userId) {
  try {
    const result = await limit({
      identifier: userId,
      endpoint: '/api/heavy-task',
      method: 'POST'
    });
    
    console.log(\`Remaining: \${result.remaining}/\${result.limit}\`);
    
    // Process the task
    return await heavyOperation();
  } catch (err) {
    // Rate limited
    throw new Error(\`Rate limited. Retry after \${err.retryAfter}s\`);
  }
}`
    },
    {
      title: "Custom Identifiers",
      description: "Use custom identifiers like user IDs instead of IP addresses",
      code: `app.use((req, res, next) => {
  // Override default IP-based identification
  req.rateguardIdentifier = req.user?.id || req.ip;
  next();
});

// Create custom middleware
function customRateLimiter(req, res, next) {
  const identifier = req.user?.id || req.ip;
  
  limit({
    identifier,
    endpoint: req.path,
    method: req.method
  }).then(() => next())
    .catch(() => res.status(429).json({ 
      error: 'Rate limit exceeded' 
    }));
}`
    },
    {
      title: "Error Handling",
      description: "Handle rate limit errors gracefully",
      code: `app.use((err, req, res, next) => {
  if (err.name === 'RateLimitError') {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: err.retryAfter,
      message: 'Please try again later'
    });
  }
  next(err);
});`
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
        <div className="relative max-w-7xl mx-auto px-6 py-16">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link to="/app/integrations" className="hover:text-foreground transition-colors">
              Integrations
            </Link>
            <span>/</span>
            <span className="text-foreground">Node.js</span>
          </div>
          
          <div className="flex items-start gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <span className="text-5xl">🟢</span>
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-foreground mb-3">
                Node.js Integration Guide
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Production-grade rate limiting for Express, Fastify, and any Node.js application. 
                Get started in under 5 minutes with our official SDK.
              </p>
              <div className="flex items-center gap-4 mt-6">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span className="text-foreground">TypeScript Support</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span className="text-foreground">Auto Fail-Open</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span className="text-foreground">5s Timeout</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Quick Install */}
        <Card className="mb-12 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <Terminal className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-2">Quick Install</h3>
              <div className="flex items-center gap-3">
                <code className="flex-1 px-4 py-3 rounded-lg bg-background border border-border font-mono text-sm text-foreground">
                  npm install @rateguard/node
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy("npm install @rateguard/node", -1)}
                  className="border-border"
                >
                  {copiedIndex === -1 ? (
                    <>
                      <Check className="h-4 w-4 mr-2 text-success" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Step-by-Step Guide */}
        <div className="space-y-8 mb-16">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Step-by-Step Setup</h2>
            <p className="text-muted-foreground">
              Follow these steps to integrate RateGuard into your Node.js application
            </p>
          </div>

          {steps.map((step, index) => (
            <Card key={step.number} className="card-glow animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
              <div className="flex gap-6">
                {/* Step Number */}
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-lg shadow-lg shadow-primary/20">
                    {step.number}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="flex-1 w-0.5 bg-gradient-to-b from-primary/50 to-transparent min-h-[80px]" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-6">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                      <step.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                    </div>
                  </div>

                  {/* Code Block */}
                  {step.code && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground">CODE</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(step.code!, index)}
                          className="text-muted-foreground hover:text-foreground h-7"
                        >
                          {copiedIndex === index ? (
                            <>
                              <Check className="h-3 w-3 mr-2 text-success" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 mr-2" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                      <pre className="code-block">
                        <code className="text-sm">{step.code}</code>
                      </pre>
                    </div>
                  )}

                  {/* Details */}
                  <div className="space-y-2 mb-4">
                    {step.details.map((detail, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{detail}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  {step.action && (
                    <Button 
                      type="button"
                      className="bg-primary hover:bg-primary/90"
                      onClick={() => navigate(step.action!.link)}
                    >
                      {step.action.label}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Advanced Examples */}
        <div className="space-y-6 mb-16">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Advanced Usage</h2>
            <p className="text-muted-foreground">
              Customize RateGuard for your specific use cases
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {advancedExamples.map((example, index) => (
              <Card key={index} className="card-glow">
                <h3 className="text-lg font-semibold text-foreground mb-2">{example.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{example.description}</p>
                
                <div className="relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(example.code, 100 + index)}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-foreground z-10"
                  >
                    {copiedIndex === 100 + index ? (
                      <>
                        <Check className="h-3 w-3 mr-2 text-success" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                  <pre className="code-block">
                    <code className="text-sm">{example.code}</code>
                  </pre>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Important Notes */}
        <Card className="border-warning/30 bg-warning/5">
          <div className="flex gap-4">
            <AlertCircle className="h-6 w-6 text-warning flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Important Notes</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-warning mt-0.5">•</span>
                  <span><strong className="text-foreground">Fail-Open Behavior:</strong> If RateGuard API is unreachable, the SDK will allow requests through and log errors. Your app continues to work.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-warning mt-0.5">•</span>
                  <span><strong className="text-foreground">5-Second Timeout:</strong> API checks timeout after 5 seconds to prevent blocking your application.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-warning mt-0.5">•</span>
                  <span><strong className="text-foreground">Environment Variables:</strong> Always use environment variables for API keys. Never commit them to version control.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-warning mt-0.5">•</span>
                  <span><strong className="text-foreground">Base URL:</strong> Set RATEGUARD_URL to your backend URL (e.g., http://localhost:4000 for development).</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Next Steps */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="card-glow">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 mb-4">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Configure Rules</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Set up rate limiting rules for your endpoints in the dashboard
            </p>
            <Button 
              type="button"
              variant="outline" 
              className="w-full border-border"
              onClick={() => navigate("/app/rules")}
            >
              Go to Rules
            </Button>
          </Card>

          <Card className="card-glow">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 mb-4">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Monitor Traffic</h3>
            <p className="text-sm text-muted-foreground mb-4">
              View real-time analytics and rate limit events
            </p>
            <Button 
              type="button"
              variant="outline" 
              className="w-full border-border"
              onClick={() => navigate("/app/analytics")}
            >
              View Analytics
            </Button>
          </Card>

          <Card className="card-glow">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 mb-4">
              <Terminal className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Check Logs</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Debug issues and track rate limit decisions
            </p>
            <Button 
              type="button"
              variant="outline" 
              className="w-full border-border"
              onClick={() => navigate("/app/logs")}
            >
              View Logs
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
