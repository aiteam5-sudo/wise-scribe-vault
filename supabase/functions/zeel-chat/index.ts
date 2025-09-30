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
    const { message, history, currentNote } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    let noteContext = "";
    if (currentNote && currentNote.content) {
      noteContext = `\n\nCurrent note context:
Title: ${currentNote.title}
Content: ${currentNote.content}
${currentNote.summary ? `Summary: ${currentNote.summary}` : ''}

Use this note content to answer questions, create quizzes, generate flashcards, or provide insights about the user's work.`;
    }

const systemPrompt = `You are Zeel, an AI assistant for NoteWise. You help users:
- Create quizzes and flashcards from their current note
- Generate comprehensive notes on any topic when asked (e.g., "Generate notes on World War 2")
- Answer questions about the current note's content (like NotebookLM)
- Generate summaries and insights from the current note
- Organize and manage notes effectively
- Answer questions about app features
- Provide productivity tips and note-taking strategies

When users ask you to:
- Create a quiz: Generate 5-10 questions based on their note content
- Generate notes: Create detailed, well-structured notes on the requested topic with headings, bullet points, and key information
- Answer questions: Use the current note content as reference to provide accurate answers
- Generate flashcards: Create question-answer pairs from the note content

Be friendly, concise, and helpful. Focus on practical advice.${noteContext}`;

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
