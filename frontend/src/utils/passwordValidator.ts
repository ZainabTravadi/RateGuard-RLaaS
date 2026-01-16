/**
 * Password Validation Utility
 * Enforces strong password requirements
 */

export interface PasswordStrength {
  isValid: boolean;
  score: number; // 0-5
  errors: string[];
  feedback: string;
}

export function validatePassword(password: string): PasswordStrength {
  const errors: string[] = [];
  let score = 0;

  // Check minimum length
  if (password.length < 12) {
    errors.push("Password must be at least 12 characters long");
  } else {
    score += 1;
  }

  // Check for uppercase letters
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter (A-Z)");
  } else {
    score += 1;
  }

  // Check for lowercase letters
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter (a-z)");
  } else {
    score += 1;
  }

  // Check for numbers
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number (0-9)");
  } else {
    score += 1;
  }

  // Check for special characters
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character (!@#$%^&*, etc.)");
  } else {
    score += 1;
  }

  // Check for common weak patterns
  if (/(.)\1{2,}/.test(password)) {
    errors.push("Password cannot contain more than 2 consecutive identical characters");
    score = Math.max(0, score - 1);
  }

  // Check if password contains common weak words
  const weakWords = ["password", "123456", "qwerty", "admin", "letmein"];
  if (weakWords.some(word => password.toLowerCase().includes(word))) {
    errors.push("Password contains commonly used weak words");
    score = Math.max(0, score - 1);
  }

  const isValid = errors.length === 0;

  let feedback = "";
  if (isValid) {
    feedback = "✓ Strong password";
  } else if (score >= 3) {
    feedback = "Password is acceptable but could be stronger";
  } else {
    feedback = "Password is too weak";
  }

  return {
    isValid,
    score: Math.min(5, Math.max(0, score)),
    errors,
    feedback,
  };
}

/**
 * Get visual representation of password strength
 */
export function getPasswordStrengthColor(score: number): string {
  if (score <= 1) return "bg-destructive";
  if (score <= 2) return "bg-orange-500";
  if (score <= 3) return "bg-yellow-500";
  if (score <= 4) return "bg-blue-500";
  return "bg-green-500";
}

export function getPasswordStrengthLabel(score: number): string {
  if (score <= 1) return "Very Weak";
  if (score <= 2) return "Weak";
  if (score <= 3) return "Fair";
  if (score <= 4) return "Good";
  return "Very Strong";
}
