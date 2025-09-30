import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all notes for the user
    const { data: notes, error } = await supabase
      .from("notes")
      .select("id, title, content, created_at")
      .eq("user_id", userId);

    if (error) throw error;

    if (!notes || notes.length === 0) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use AI to find semantically similar notes
    const prompt = `Given the search query: "${query}"
    
Find the most relevant notes from this list and rank them by relevance. Return only the IDs of the top 5 most relevant notes in order, as a JSON array.

Notes:
${notes.map((n) => `ID: ${n.id}\nTitle: ${n.title}\nContent: ${n.content?.slice(0, 200)}...`).join("\n\n")}

Return format: {"noteIds": ["id1", "id2", "id3"]}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to get AI response");
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || "{}";
    
    // Parse AI response to get note IDs
    let relevantIds: string[] = [];
    try {
      const parsed = JSON.parse(content);
      relevantIds = parsed.noteIds || [];
    } catch {
      // Fallback: return all notes
      relevantIds = notes.map((n) => n.id);
    }

    // Get full note details for relevant IDs
    const results = relevantIds
      .map((id) => notes.find((n) => n.id === id))
      .filter(Boolean)
      .slice(0, 5);

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
