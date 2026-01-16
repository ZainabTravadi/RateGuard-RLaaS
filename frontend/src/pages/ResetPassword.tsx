import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Zap, AlertCircle, CheckCircle } from "lucide-react";
import { validatePassword, getPasswordStrengthColor, getPasswordStrengthLabel } from "@/utils/passwordValidator";

const API = "http://localhost:4000";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [step, setStep] = useState<"otp" | "password">("otp");

  const passwordValidation = validatePassword(password);

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    } else {
      navigate("/forgot-password");
    }
  }, [location, navigate]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(errorData || "Invalid OTP");
      }

      setOtpVerified(true);
      setStep("password");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!passwordValidation.isValid) {
      setError("Password does not meet security requirements");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, password }),
      });

      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(errorData || "Failed to reset password");
      }

      setSuccess(true);
      setTimeout(() => {
        navigate("/app");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout showNav={false}>
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <span className="text-2xl font-semibold text-foreground">RateGuard</span>
              <span className="ml-1 text-sm text-muted-foreground">Pro</span>
            </div>
          </div>

          <Card>
            <CardHeader className="space-y-1">
              {step === "otp" ? (
                <>
                  <CardTitle className="text-2xl font-bold">Verify OTP</CardTitle>
                  <CardDescription>
                    Enter the 6-digit code sent to {email}
                  </CardDescription>
                </>
              ) : (
                <>
                  <CardTitle className="text-2xl font-bold">Create new password</CardTitle>
                  <CardDescription>
                    Enter a strong password for your account
                  </CardDescription>
                </>
              )}
            </CardHeader>
            <CardContent>
              {step === "otp" ? (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="otp" className="text-sm font-medium text-foreground">
                      OTP Code
                    </label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                      disabled={loading}
                      autoFocus
                      className="text-center text-lg tracking-widest"
                    />
                  </div>

                  {error && (
                    <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                    {loading ? "Verifying..." : "Verify OTP"}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Didn't receive the code?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setOtp("");
                        setError("");
                        // Could implement resend logic here
                      }}
                      className="text-primary hover:underline"
                    >
                      Resend OTP
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium text-foreground">
                      New Password
                    </label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading || success}
                    />

                    {password && (
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Strength</span>
                            <span
                              className={`text-xs font-semibold ${
                                passwordValidation.score <= 2
                                  ? "text-destructive"
                                  : passwordValidation.score <= 3
                                  ? "text-yellow-600"
                                  : passwordValidation.score <= 4
                                  ? "text-blue-600"
                                  : "text-green-600"
                              }`}
                            >
                              {getPasswordStrengthLabel(passwordValidation.score)}
                            </span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${getPasswordStrengthColor(
                                passwordValidation.score
                              )}`}
                              style={{ width: `${(passwordValidation.score / 5) * 100}%` }}
                            />
                          </div>
                        </div>

                        {passwordValidation.errors.length > 0 && (
                          <div className="space-y-1">
                            {passwordValidation.errors.map((error, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-xs text-destructive">
                                <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>{error}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {passwordValidation.isValid && (
                          <div className="flex items-start gap-2 text-xs text-green-600">
                            <CheckCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span>✓ {passwordValidation.feedback}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                      Confirm Password
                    </label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading || success}
                    />
                  </div>

                  {error && (
                    <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="p-3 rounded-md bg-green-600/10 border border-green-600/20 flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-green-600">Password reset successful! Redirecting...</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || success || !passwordValidation.isValid}
                  >
                    {loading ? "Resetting..." : success ? "Success!" : "Reset Password"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}
