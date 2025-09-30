import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipients, noteTitle, noteContent, message } = await req.json();

    if (!recipients || recipients.length === 0) {
      throw new Error("No recipients provided");
    }

    const htmlContent = noteContent.replace(/\n/g, '<br>');

    const { error } = await resend.emails.send({
      from: "NoteWise <onboarding@resend.dev>",
      to: recipients,
      subject: `Note: ${noteTitle}`,
      html: `
        ${message ? `<p style="margin-bottom: 20px; padding: 12px; background: #f3f4f6; border-radius: 6px;">${message}</p>` : ''}
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-top: 20px;">
          <h2 style="margin-top: 0; color: #111827;">${noteTitle}</h2>
          <div style="color: #374151; line-height: 1.6;">${htmlContent}</div>
        </div>
        <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">Sent from NoteWise</p>
      `,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
