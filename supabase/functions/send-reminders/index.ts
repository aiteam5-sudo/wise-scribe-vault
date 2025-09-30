import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Reminder {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  remind_at: string;
  note_id: string | null;
}

interface Profile {
  email: string;
  full_name: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting reminder check...");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all due reminders that haven't been completed
    const { data: reminders, error: remindersError } = await supabase
      .from("reminders")
      .select("*")
      .eq("is_completed", false)
      .lte("remind_at", new Date().toISOString());

    if (remindersError) {
      console.error("Error fetching reminders:", remindersError);
      throw remindersError;
    }

    console.log(`Found ${reminders?.length || 0} due reminders`);

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({ message: "No due reminders found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process each reminder
    const results = [];
    for (const reminder of reminders as Reminder[]) {
      try {
        // Get user profile for email
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", reminder.user_id)
          .single();

        if (profileError || !profile) {
          console.error(`Error fetching profile for user ${reminder.user_id}:`, profileError);
          continue;
        }

        const userProfile = profile as Profile;

        // Get note details if reminder is linked to a note
        let noteTitle = "";
        if (reminder.note_id) {
          const { data: note } = await supabase
            .from("notes")
            .select("title")
            .eq("id", reminder.note_id)
            .single();
          
          if (note) {
            noteTitle = note.title;
          }
        }

        // Send email
        const emailResponse = await resend.emails.send({
          from: "NoteWise AI <onboarding@resend.dev>",
          to: [userProfile.email],
          subject: `Reminder: ${reminder.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #6366f1;">🔔 Reminder from NoteWise AI</h1>
              <h2 style="color: #333;">${reminder.title}</h2>
              ${reminder.description ? `<p style="color: #666; font-size: 16px;">${reminder.description}</p>` : ''}
              ${noteTitle ? `<p style="color: #999; font-size: 14px;">Related note: <strong>${noteTitle}</strong></p>` : ''}
              <hr style="border: 1px solid #eee; margin: 20px 0;">
              <p style="color: #999; font-size: 12px;">
                This reminder was scheduled for ${new Date(reminder.remind_at).toLocaleString()}
              </p>
              <p style="color: #999; font-size: 12px;">
                <a href="https://fontsvmexlkwqgbfrwtl.supabase.co" style="color: #6366f1;">Open NoteWise AI</a>
              </p>
            </div>
          `,
        });

        console.log(`Email sent for reminder ${reminder.id}:`, emailResponse);

        // Mark reminder as completed
        await supabase
          .from("reminders")
          .update({ is_completed: true })
          .eq("id", reminder.id);

        results.push({
          reminderId: reminder.id,
          email: userProfile.email,
          status: "sent",
        });

      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error);
        results.push({
          reminderId: reminder.id,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log("Reminder processing complete:", results);

    return new Response(
      JSON.stringify({
        message: "Reminders processed",
        processed: results.length,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in send-reminders function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
