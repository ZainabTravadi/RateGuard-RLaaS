import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

interface PublicLayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export function PublicLayout({ children, showNav = true }: PublicLayoutProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleGoToConsole = () => {
    if (isAuthenticated) {
      navigate("/app");
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      {showNav && (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="container mx-auto px-6">
            <div className="flex h-16 items-center justify-between">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <span className="text-lg font-semibold text-foreground">RateGuard</span>
                  <span className="ml-1 text-xs text-muted-foreground">Pro</span>
                </div>
              </Link>

              {/* Navigation Links */}
              <div className="flex items-center gap-6">
                
                <Button onClick={handleGoToConsole} size="default">
                  Go to Console
                </Button>
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Content */}
      <main className={showNav ? "pt-16" : ""}>
        {children}
      </main>

      {/* Footer */}
      {showNav && (
        <footer className="border-t border-border bg-card mt-24">
          <div className="container mx-auto px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Brand */}
              <div className="col-span-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span className="text-lg font-semibold text-foreground">RateGuard</span>
                    <span className="ml-1 text-xs text-muted-foreground">Pro</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Production-grade rate limiting for modern APIs.
                </p>
              </div>

              {/* Product */}
              <div>
                <h4 className="font-semibold text-foreground mb-3">Product</h4>
                <ul className="space-y-2">
                  <li>
                    <Link to="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      Documentation
                    </Link>
                  </li>
                  <li>
                    <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      Pricing
                    </Link>
                  </li>
                  <li>
                    <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      Features
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Resources */}
              <div>
                <h4 className="font-semibold text-foreground mb-3">Resources</h4>
                <ul className="space-y-2">
                  <li>
                    <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      Blog
                    </Link>
                  </li>
                  <li>
                    <a
                      href="https://github.com/rateguard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      GitHub
                    </a>
                  </li>
                  <li>
                    <Link to="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      API Reference
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h4 className="font-semibold text-foreground mb-3">Legal</h4>
                <ul className="space-y-2">
                  <li>
                    <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      Terms
                    </Link>
                  </li>
                  <li>
                    <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      Privacy
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom */}
            <div className="mt-12 pt-8 border-t border-border flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} RateGuard. All rights reserved.
              </p>
              <div className="flex items-center gap-4">
                <a
                  href="https://github.com/rateguard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  GitHub
                </a>
                <a
                  href="https://twitter.com/rateguard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Twitter
                </a>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
