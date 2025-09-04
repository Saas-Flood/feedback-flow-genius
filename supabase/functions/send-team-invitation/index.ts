import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TeamInvitationRequest {
  email: string;
  teamName: string;
  taskTitle?: string;
  taskDescription?: string;
  inviterName: string;
  dueDate?: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-TEAM-INVITATION] ${step}${detailsStr}`);
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(resendApiKey);
    
    const requestBody: TeamInvitationRequest = await req.json();
    const { email, teamName, taskTitle, taskDescription, inviterName, dueDate } = requestBody;

    logStep("Processing invitation request", { email, teamName, inviterName });

    // Create email content
    const subject = taskTitle 
      ? `New Task Assignment: ${taskTitle}`
      : `Team Invitation: Join ${teamName}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .task-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 Smart Feedback</h1>
              <h2>${subject}</h2>
            </div>
            <div class="content">
              <p>Hello!</p>
              
              <p><strong>${inviterName}</strong> has ${taskTitle ? 'assigned you a task' : 'invited you to join'} <strong>${teamName}</strong>.</p>
              
              ${taskTitle ? `
                <div class="task-details">
                  <h3>📋 Task Details</h3>
                  <p><strong>Task:</strong> ${taskTitle}</p>
                  ${taskDescription ? `<p><strong>Description:</strong> ${taskDescription}</p>` : ''}
                  ${dueDate ? `<p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>` : ''}
                </div>
              ` : ''}
              
              <p>To get started:</p>
              <ol>
                <li>Log in to Smart Feedback using this email address</li>
                <li>Navigate to the dashboard</li>
                <li>Check your ${taskTitle ? 'tasks' : 'teams'} section</li>
              </ol>
              
              <p>If you don't have an account yet, you can sign up using the same email address.</p>
              
              <div class="footer">
                <p>Best regards,<br>The Smart Feedback Team</p>
                <p><em>This is an automated message from Smart Feedback.</em></p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email using Resend with verified domain
    const emailResponse = await resend.emails.send({
      from: "Smart Feedback <onboarding@resend.dev>", // Using verified Resend domain
      to: [email],
      subject: subject,
      html: htmlContent,
    });

    logStep("Team invitation email sent successfully", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Team invitation sent successfully",
      data: emailResponse 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    logStep("ERROR in send-team-invitation", { message: error.message });
    
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json", 
        ...corsHeaders 
      },
    });
  }
};

serve(handler);