import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { validatePassword, getPasswordStrengthLabel, getPasswordStrengthColor } from '@/lib/passwordValidation';
import { Eye, EyeOff, Check, X } from 'lucide-react';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  showStrength?: boolean;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  value,
  onChange,
  label = "Password",
  placeholder = "Enter password",
  required = false,
  showStrength = true
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const passwordStrength = validatePassword(value);

  return (
    <div className="space-y-2">
      <Label htmlFor="password">{label}</Label>
      <div className="relative">
        <Input
          id="password"
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-gray-400" />
          ) : (
            <Eye className="h-4 w-4 text-gray-400" />
          )}
        </button>
      </div>
      
      {showStrength && value && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Password strength:</span>
            <span className={`text-sm font-medium ${getPasswordStrengthColor(passwordStrength.score)}`}>
              {getPasswordStrengthLabel(passwordStrength.score)}
            </span>
          </div>
          <Progress value={(passwordStrength.score / 5) * 100} className="h-2" />
          
          {passwordStrength.feedback.length > 0 && (
            <div className="space-y-1">
              {passwordStrength.feedback.map((feedback, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-red-500">
                  <X className="h-3 w-3" />
                  <span>{feedback}</span>
                </div>
              ))}
            </div>
          )}
          
          {passwordStrength.isValid && (
            <div className="flex items-center gap-2 text-sm text-green-500">
              <Check className="h-3 w-3" />
              <span>Password meets all requirements</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};