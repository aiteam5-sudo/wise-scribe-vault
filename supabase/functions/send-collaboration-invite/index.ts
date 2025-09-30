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
    const { noteId, inviteEmail, invitedBy } = await req.json();

    const appUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app") || "http://localhost:5173";
    const inviteLink = `${appUrl}/dashboard?note=${noteId}`;

    const { error } = await resend.emails.send({
      from: "NoteWise <onboarding@resend.dev>",
      to: [inviteEmail],
      subject: "You've been invited to collaborate on a note",
      html: `
        <h2>Collaboration Invitation</h2>
        <p>You've been invited to collaborate on a note in NoteWise.</p>
        <p><a href="${inviteLink}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Open Note</a></p>
        <p>If you don't have an account, you'll be prompted to sign up.</p>
      `,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending invite:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
