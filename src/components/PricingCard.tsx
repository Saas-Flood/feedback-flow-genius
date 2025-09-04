import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const PricingCard = () => {
  const { subscriptionTier, createCheckout, openCustomerPortal, loading } = useSubscription();
  const { user } = useAuth();
  const { toast } = useToast();

  const handlePlanAction = async (plan: any) => {
    if (!user && plan.action === 'upgrade') {
      // Silently redirect to auth page
      window.location.href = '/auth';
      return;
    }

    try {
      if (plan.action === 'current') {
        await openCustomerPortal();
      } else if (plan.action === 'upgrade') {
        await createCheckout(plan.stripeId);
      }
    } catch (error) {
      console.error('Error handling plan action:', error);
    }
  };
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
        "Analytics dashboard"
      ],
      limitations: [],
      buttonText: "Current Plan",
      buttonVariant: "outline" as const,
      action: "current",
      stripeId: null
    },
    {
      name: "Basic Plan",
      price: "$20",
      description: "Perfect for small businesses",
      badge: null,
      features: [
        "Unlimited feedback submissions",
        "Multi-language support (50+ languages)",
        "Real-time translation", 
        "Analytics dashboard",
        "Unlimited branches",
        "$10 per additional branch"
      ],
      limitations: [
        "No data export"
      ],
      buttonText: "Upgrade",
      buttonVariant: "outline" as const,
      action: "upgrade",
      stripeId: "basic"
    },
    {
      name: "Pro Plan", 
      price: "$40",
      description: "Complete solution for growing businesses",
      badge: "Most Popular",
      badgeVariant: "secondary" as const,
      features: [
        "Unlimited feedback submissions",
        "Multi-language support (50+ languages)",
        "Real-time translation", 
        "Analytics dashboard",
        "Export feedback data",
        "Unlimited branches",
        "$10 per additional branch"
      ],
      limitations: [],
      buttonText: "Upgrade",
      buttonVariant: "default" as const,
      action: "upgrade",
      stripeId: "pro"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {plans.map((plan, index) => {
        const isCurrentPlan = (
          (subscriptionTier === 'trial' && plan.name === 'Free Trial') ||
          (subscriptionTier === 'basic' && plan.name === 'Basic Plan') ||
          (subscriptionTier === 'pro' && plan.name === 'Pro Plan')
        );
        
        return (
        <Card key={index} className={`relative hover:shadow-xl transition-all duration-300 hover:scale-105 ${isCurrentPlan ? 'border-success bg-success/5 shadow-lg' : plan.badge === "Most Popular" ? "border-primary bg-gradient-to-br from-primary/5 to-secondary/5 shadow-xl border-2" : "hover:border-primary/50"}`}>
          <CardHeader className="text-center">
            {(plan.badge || isCurrentPlan) && (
              <Badge variant={plan.badgeVariant} className={`w-fit mx-auto mb-2 ${isCurrentPlan ? 'bg-success text-success-foreground' : plan.badge === "Most Popular" ? 'bg-gradient-to-r from-primary to-secondary text-white' : ''}`}>
                {isCurrentPlan ? 'Your Plan' : plan.badge}
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
                className={`w-full transition-all duration-300 ${
                  isCurrentPlan 
                    ? "border-success text-success hover:bg-success hover:text-success-foreground" 
                    : plan.name === "Pro Plan" 
                      ? "bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white shadow-lg hover:shadow-xl" 
                      : plan.name === "Basic Plan"
                        ? "bg-accent hover:bg-accent/90 text-accent-foreground shadow-md hover:shadow-lg"
                        : ""
                }`}
                size="lg"
                variant={isCurrentPlan ? "outline" : plan.buttonVariant}
                onClick={() => handlePlanAction(plan)}
                disabled={loading}
              >
                {isCurrentPlan ? 'Manage Subscription' : plan.buttonText}
              </Button>
              {plan.name === "Free Trial" && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  No credit card required
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        );
      })}
    </div>
  );
};