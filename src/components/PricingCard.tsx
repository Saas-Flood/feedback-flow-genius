import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

export const PricingCard = () => {
  const features = [
    "Up to 40 feedback submissions per month",
    "Unlimited QR code generation",
    "Multi-language support (50+ languages)",
    "Real-time translation",
    "Analytics dashboard",
    "Export feedback data",
    "Email support"
  ];

  return (
    <Card className="w-full max-w-md mx-auto hover:shadow-lg transition-shadow">
      <CardHeader className="text-center">
        <Badge variant="secondary" className="w-fit mx-auto mb-2">Most Popular</Badge>
        <CardTitle className="text-2xl">Starter Plan</CardTitle>
        <CardDescription>Perfect for small to medium businesses</CardDescription>
        <div className="text-4xl font-bold mt-4">
          $40<span className="text-lg font-normal text-muted-foreground">/month</span>
        </div>
        <p className="text-sm text-muted-foreground">
          + $10 for each additional branch
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
        
        <div className="pt-4 space-y-2">
          <Button className="w-full" size="lg">
            Start Free Trial
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            14-day free trial • No credit card required
          </p>
        </div>
      </CardContent>
    </Card>
  );
};