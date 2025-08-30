export interface PasswordStrength {
  score: number;
  feedback: string[];
  isValid: boolean;
}

export const validatePassword = (password: string): PasswordStrength => {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length < 8) {
    feedback.push("Password must be at least 8 characters long");
  } else if (password.length >= 12) {
    score += 2;
  } else {
    score += 1;
  }

  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    feedback.push("Password must contain at least one uppercase letter");
  } else {
    score += 1;
  }

  // Lowercase check
  if (!/[a-z]/.test(password)) {
    feedback.push("Password must contain at least one lowercase letter");
  } else {
    score += 1;
  }

  // Number check
  if (!/\d/.test(password)) {
    feedback.push("Password must contain at least one number");
  } else {
    score += 1;
  }

  // Special character check
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    feedback.push("Password must contain at least one special character");
  } else {
    score += 1;
  }

  // Common patterns check
  const commonPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /abc123/i,
    /admin/i
  ];

  if (commonPatterns.some(pattern => pattern.test(password))) {
    feedback.push("Password contains common patterns that should be avoided");
    score -= 1;
  }

  // Sequential characters check
  if (/(.)\1{2,}/.test(password)) {
    feedback.push("Password should not contain repeated characters");
    score -= 1;
  }

  const isValid = feedback.length === 0 && password.length >= 8;

  return {
    score: Math.max(0, Math.min(5, score)),
    feedback,
    isValid
  };
};

export const getPasswordStrengthLabel = (score: number): string => {
  switch (score) {
    case 0:
    case 1:
      return "Very Weak";
    case 2:
      return "Weak";
    case 3:
      return "Fair";
    case 4:
      return "Good";
    case 5:
      return "Strong";
    default:
      return "Very Weak";
  }
};

export const getPasswordStrengthColor = (score: number): string => {
  switch (score) {
    case 0:
    case 1:
      return "text-red-500";
    case 2:
      return "text-orange-500";
    case 3:
      return "text-yellow-500";
    case 4:
      return "text-blue-500";
    case 5:
      return "text-green-500";
    default:
      return "text-red-500";
  }
};