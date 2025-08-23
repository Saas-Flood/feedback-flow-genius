import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TeamInvitationRequest {
  email: string;
  teamName: string;
  taskTitle: string;
  taskDescription: string;
  inviterName: string;
  dueDate?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, teamName, taskTitle, taskDescription, inviterName, dueDate }: TeamInvitationRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "Task Assignment <onboarding@resend.dev>",
      to: [email],
      subject: `New Task Assigned: ${taskTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
            🎯 New Task Assignment
          </h1>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #1e40af; margin-top: 0;">Task Details</h2>
            <p><strong>Title:</strong> ${taskTitle}</p>
            <p><strong>Description:</strong> ${taskDescription}</p>
            <p><strong>Team:</strong> ${teamName}</p>
            <p><strong>Assigned by:</strong> ${inviterName}</p>
            ${dueDate ? `<p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>` : ''}
          </div>
          
          <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; color: #1e40af;">
              <strong>📧 You've been invited to join the ${teamName} team!</strong>
            </p>
            <p style="margin: 10px 0 0 0; color: #64748b;">
              Please log in to the system to view and manage your tasks.
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">
            <p>This is an automated message from the Task Management System.</p>
            <p>If you have any questions, please contact your team manager.</p>
          </div>
        </div>
      `,
    });

    console.log("Team invitation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-team-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);