import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ANALYZE-FEEDBACK] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Get request body
    const { type, timeRange } = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    logStep("Fetching feedback data", { type, timeRange });

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Fetch feedback data
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedback')
      .select('id, subject, message, rating, created_at, status, priority, customer_name')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (feedbackError) throw feedbackError;

    logStep("Feedback data fetched", { count: feedback?.length });

    if (!feedback || feedback.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        insights: {
          summary: "No feedback data available for the selected time period.",
          trends: [],
          recommendations: ["Start collecting feedback to generate insights."],
          sentiment: { positive: 0, neutral: 0, negative: 0 },
          keyTopics: []
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate basic statistics
    const stats = {
      totalFeedback: feedback.length,
      averageRating: feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length,
      ratingDistribution: {
        1: feedback.filter(f => f.rating === 1).length,
        2: feedback.filter(f => f.rating === 2).length,
        3: feedback.filter(f => f.rating === 3).length,
        4: feedback.filter(f => f.rating === 4).length,
        5: feedback.filter(f => f.rating === 5).length,
      },
      pendingCount: feedback.filter(f => f.status === 'pending').length,
      resolvedCount: feedback.filter(f => f.status === 'resolved').length
    };

    // Prepare data for AI analysis
    const feedbackSummary = feedback.map(f => ({
      rating: f.rating,
      subject: f.subject,
      message: f.message?.substring(0, 200), // Limit message length
      status: f.status,
      priority: f.priority
    }));

    let prompt = '';
    
    switch (type) {
      case 'sentiment':
        prompt = `Analyze the sentiment and themes in this customer feedback data. Provide insights about customer satisfaction, common complaints, and positive feedback patterns.

Feedback data (${feedback.length} responses):
${JSON.stringify(feedbackSummary, null, 2)}

Please provide a JSON response with:
- sentiment: {positive: number, neutral: number, negative: number} (percentages)
- keyTopics: array of main topics/themes mentioned
- summary: brief overview of customer sentiment
- recommendations: array of 3-5 actionable recommendations

Respond ONLY with valid JSON.`;
        break;

      case 'trends':
        prompt = `Analyze trends and patterns in this customer feedback data. Focus on rating distributions, common issues, and improvement opportunities.

Feedback data (${feedback.length} responses):
${JSON.stringify(feedbackSummary, null, 2)}

Please provide a JSON response with:
- trends: array of key trends identified
- ratingDistribution: {1: count, 2: count, 3: count, 4: count, 5: count}
- summary: brief overview of trends
- recommendations: array of 3-5 actionable recommendations

Respond ONLY with valid JSON.`;
        break;

      case 'recommendations':
        prompt = `Analyze this customer feedback data and provide strategic recommendations for business improvement.

Feedback data (${feedback.length} responses):
${JSON.stringify(feedbackSummary, null, 2)}

Please provide a JSON response with:
- recommendations: array of 5-7 detailed actionable recommendations
- priorityActions: array of top 3 most important actions
- summary: brief overview of the analysis
- impactAreas: array of business areas that need attention

Respond ONLY with valid JSON.`;
        break;

      default:
        prompt = `Provide a comprehensive analysis of this customer feedback data including sentiment, trends, and recommendations.

Feedback data (${feedback.length} responses):
${JSON.stringify(feedbackSummary, null, 2)}

Please provide a JSON response with:
- sentiment: {positive: number, neutral: number, negative: number}
- trends: array of key trends
- recommendations: array of actionable recommendations
- summary: comprehensive overview
- keyTopics: main themes identified

Respond ONLY with valid JSON.`;
    }

    // Try OpenAI API, but provide fallback if it fails
    let insights;
    try {
      logStep("Calling OpenAI API");

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5-mini-2025-08-07',
          messages: [
            { 
              role: 'system', 
              content: 'You are an expert business analyst specializing in customer feedback analysis. Always respond with valid JSON only.' 
            },
            { role: 'user', content: prompt }
          ],
          max_completion_tokens: 1000
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${await response.text()}`);
      }

      const data = await response.json();
      const analysis = data.choices[0].message.content;

      logStep("OpenAI analysis received", { length: analysis.length });

      // Parse the JSON response
      try {
        insights = JSON.parse(analysis);
      } catch (e) {
        throw new Error("Failed to parse OpenAI response as JSON");
      }
    } catch (aiError: any) {
      logStep("OpenAI API failed, using fallback analytics", { error: aiError.message });
      
      // Provide basic analytics when AI is unavailable
      const avgRating = stats.averageRating;
      const positiveCount = feedback.filter(f => f.rating >= 4).length;
      const negativeCount = feedback.filter(f => f.rating <= 2).length;
      const neutralCount = feedback.length - positiveCount - negativeCount;
      
      insights = {
        summary: `Analysis of ${feedback.length} feedback responses. Average rating: ${avgRating.toFixed(1)}/5. ${stats.pendingCount} pending responses need attention.`,
        sentiment: {
          positive: Math.round((positiveCount / feedback.length) * 100),
          neutral: Math.round((neutralCount / feedback.length) * 100),
          negative: Math.round((negativeCount / feedback.length) * 100)
        },
        trends: [
          `${positiveCount} customers gave positive ratings (4-5 stars)`,
          `${negativeCount} customers expressed dissatisfaction (1-2 stars)`,
          `${stats.pendingCount} feedback items are still pending review`,
          `Most common rating: ${Object.entries(stats.ratingDistribution).reduce((a, b) => stats.ratingDistribution[a[0]] > stats.ratingDistribution[b[0]] ? a : b)[0]} stars`
        ],
        recommendations: [
          stats.pendingCount > 0 ? `Address ${stats.pendingCount} pending feedback items` : "Great job keeping up with feedback!",
          avgRating < 3 ? "Focus on improving customer satisfaction - average rating is below 3" : "Maintain current service quality",
          negativeCount > 0 ? `Investigate and resolve issues mentioned in ${negativeCount} negative reviews` : "Keep up the excellent work!",
          "Regularly monitor feedback trends to identify improvement opportunities",
          "Respond promptly to customer feedback to show you value their input"
        ],
        keyTopics: [
          "customer satisfaction",
          "service quality", 
          "feedback management"
        ]
      };
    }

    logStep("Analysis completed successfully");

    return new Response(JSON.stringify({
      success: true,
      insights: {
        ...insights,
        stats
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    logStep("ERROR in analyze-feedback", { message: error.message });
    
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json', 
        ...corsHeaders 
      },
    });
  }
});