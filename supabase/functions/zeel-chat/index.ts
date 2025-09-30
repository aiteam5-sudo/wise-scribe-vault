import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, history } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

const systemPrompt = `You are Zeel, an AI assistant for NoteWise. You help users:
- Create quizzes and flashcards from notes
- Generate comprehensive notes on any topic when asked (e.g., "Generate notes on World War 2")
- Organize and manage notes effectively
- Answer questions about app features
- Provide productivity tips and note-taking strategies
- Help users find information in their notes

When users ask you to:
- Create a quiz: Generate 5-10 questions based on their note content
- Generate notes: Create detailed, well-structured notes on the requested topic with headings, bullet points, and key information
- Organize files: Suggest folder structures and organization strategies

Be friendly, concise, and helpful. Focus on practical advice.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10), // Keep last 10 messages for context
      { role: "user", content: message },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("AI API error:", error);
      throw new Error("Failed to get AI response");
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || "I'm having trouble responding right now.";

    return new Response(
      JSON.stringify({ response: aiResponse }),
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
