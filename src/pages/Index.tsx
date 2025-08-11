import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QrCode, MessageSquare, Globe, BarChart3, Star, Users, Zap, CheckCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { FeatureCard } from "@/components/FeatureCard";
import { PricingCard } from "@/components/PricingCard";

const Index = () => {
  const [activeDemo, setActiveDemo] = useState<"dashboard" | "feedback" | null>(null);

  const features = [
    {
      icon: QrCode,
      title: "QR Code Generation",
      description: "Generate unique QR codes for each branch location"
    },
    {
      icon: Globe,
      title: "Multi-Language Support",
      description: "Automatic language detection and translation"
    },
    {
      icon: MessageSquare,
      title: "Smart Feedback Collection",
      description: "Collect feedback in customers' native language"
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Real-time insights and feedback analytics"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4">
            Smart Feedback Platform
          </Badge>
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Collect Customer Feedback
            <br />
            in Any Language
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Perfect for restaurants, hospitals, hotels, and any business wanting to understand their customers better. 
            Generate QR codes, collect multilingual feedback, and get instant translations.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" onClick={() => setActiveDemo("dashboard")}>
              View Dashboard Demo
            </Button>
            <Button size="lg" variant="outline" onClick={() => setActiveDemo("feedback")}>
              Try Feedback Form
            </Button>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      {activeDemo && (
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">
                {activeDemo === "dashboard" ? "Business Dashboard" : "Customer Feedback Experience"}
              </h2>
              <p className="text-muted-foreground">
                {activeDemo === "dashboard" 
                  ? "Manage your branches and view feedback analytics" 
                  : "What customers see when they scan your QR code"
                }
              </p>
            </div>
            
            {activeDemo === "dashboard" ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Recent Feedback
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { text: "الطعام لذيذ جداً والخدمة ممتازة", lang: "Arabic", rating: 5, translated: false },
                        { text: "Excellent service and great food!", lang: "English", rating: 5, translated: true },
                        { text: "Le service pourrait être amélioré", lang: "French", rating: 3, translated: false }
                      ].map((feedback, i) => (
                        <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{feedback.text}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{feedback.lang}</Badge>
                              <div className="flex">
                                {[...Array(5)].map((_, j) => (
                                  <Star key={j} className={`h-3 w-3 ${j < feedback.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                                ))}
                              </div>
                            </div>
                          </div>
                          <Button size="sm" variant={feedback.translated ? "secondary" : "outline"}>
                            {feedback.translated ? <CheckCircle className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <QrCode className="h-5 w-5" />
                        QR Codes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span>Main Branch</span>
                          <Button size="sm" variant="outline">View QR</Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Downtown Branch</span>
                          <Button size="sm" variant="outline">View QR</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Stats</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Feedback</span>
                          <span className="font-semibold">247</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Rating</span>
                          <span className="font-semibold">4.2/5</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Languages</span>
                          <span className="font-semibold">12</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <Card className="max-w-2xl mx-auto">
                <CardHeader className="text-center">
                  <CardTitle>Welcome to Golden Fork Restaurant! 🍽️</CardTitle>
                  <CardDescription>We'd love to hear your feedback</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <Badge variant="secondary" className="mb-2">Language detected: English</Badge>
                    <p className="text-muted-foreground">Please share your experience in your preferred language</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Rate your experience</label>
                      <div className="flex gap-1 mt-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-8 w-8 text-yellow-400 fill-yellow-400 cursor-pointer hover:scale-110 transition-transform" />
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Tell us more (optional)</label>
                      <textarea 
                        className="w-full mt-2 p-3 border rounded-lg resize-none" 
                        rows={4} 
                        placeholder="Share your thoughts in any language..."
                      />
                    </div>
                    
                    <Button className="w-full" size="lg">
                      Submit Feedback
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <div className="text-center mt-8">
              <Button variant="ghost" onClick={() => setActiveDemo(null)}>
                Close Demo
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Powerful Features</h2>
            <p className="text-xl text-muted-foreground">Everything you need to collect and understand customer feedback</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple Pricing</h2>
            <p className="text-xl text-muted-foreground">Pay only for what you use</p>
          </div>
          
          <div className="flex justify-center">
            <PricingCard />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Start?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join hundreds of businesses already using our platform to improve customer satisfaction
          </p>
          <Button size="lg" className="mr-4">
            Start Free Trial
          </Button>
          <Button size="lg" variant="outline">
            Contact Sales
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
