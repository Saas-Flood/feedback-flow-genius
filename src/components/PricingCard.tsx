import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

export const PricingCard = () => {
  const plans = [
    {
      name: "Free Trial",
      price: "Free",
      description: "Try all features for 14 days",
      badge: "14-Day Trial",
      badgeVariant: "default" as const,
      features: [
        "Unlimited feedback submissions",
        "Multi-language support (50+ languages)", 
        "Real-time translation",
        "1 branch only",
        "Analytics dashboard",
        "Email support"
      ],
      limitations: [],
      buttonText: "Start Free Trial",
      buttonVariant: "outline" as const
    },
    {
      name: "Basic Plan",
      price: "$20",
      description: "Perfect for small businesses",
      badge: null,
      features: [
        "Up to 200 feedback submissions per month",
        "Unlimited QR code generation", 
        "Analytics dashboard",
        "Export feedback data",
        "Email support",
        "Unlimited branches"
      ],
      limitations: [
        "No translation features",
        "English only"
      ],
      buttonText: "Choose Basic",
      buttonVariant: "outline" as const
    },
    {
      name: "Pro Plan", 
      price: "$40",
      description: "Complete solution for growing businesses",
      badge: "Most Popular",
      badgeVariant: "secondary" as const,
      features: [
        "Unlimited feedback submissions",
        "Unlimited QR code generation",
        "Multi-language support (50+ languages)",
        "Real-time translation", 
        "Analytics dashboard",
        "Export feedback data",
        "Priority email support",
        "Unlimited branches"
      ],
      limitations: [],
      buttonText: "Choose Pro",
      buttonVariant: "default" as const
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {plans.map((plan, index) => (
        <Card key={index} className={`relative hover:shadow-lg transition-shadow ${plan.badge === "Most Popular" ? "border-primary shadow-md" : ""}`}>
          <CardHeader className="text-center">
            {plan.badge && (
              <Badge variant={plan.badgeVariant} className="w-fit mx-auto mb-2">
                {plan.badge}
              </Badge>
            )}
            <CardTitle className="text-2xl">{plan.name}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
            <div className="text-4xl font-bold mt-4">
              {plan.price}
              {plan.price !== "Free" && (
                <span className="text-lg font-normal text-muted-foreground">/month</span>
              )}
            </div>
            {plan.price !== "Free" && (
              <p className="text-sm text-muted-foreground">
                No setup fees • Cancel anytime
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              {plan.features.map((feature, featureIndex) => (
                <li key={featureIndex} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
              {plan.limitations.map((limitation, limitationIndex) => (
                <li key={limitationIndex} className="flex items-start gap-2">
                  <X className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{limitation}</span>
                </li>
              ))}
            </ul>
            
            <div className="pt-4">
              <Button 
                className="w-full" 
                size="lg"
                variant={plan.buttonVariant}
              >
                {plan.buttonText}
              </Button>
              {plan.name === "Free Trial" && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  No credit card required
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};