import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content } = await req.json();
    
    if (!content || content.trim().length === 0) {
      throw new Error('No content provided');
    }

    console.log('Summarizing note with Lovable AI...');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('Lovable API key not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert note summarizer. Create detailed, easy-to-understand point-wise summaries that capture all key information. Use simple language and clear bullet points. Be thorough and comprehensive.' 
          },
          { 
            role: 'user', 
            content: `Please analyze this note and provide:

1. A detailed point-wise summary covering ALL key information:
   - Break down the content into clear, specific bullet points
   - Use simple, easy-to-understand language
   - Include important details, facts, and insights
   - Make each point comprehensive but concise
   - Use the • symbol for bullet points

2. Extract any action items (if present)

Note content:
${content}

Format your response as JSON with:
- "summary": A string containing detailed bullet points (use • for bullets, \\n for line breaks)
- "actionItems": An array of action item strings

Make the summary detailed enough that someone can understand the full content just by reading the points.` 
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const error = await response.text();
      console.error('Lovable AI error:', error);
      throw new Error('AI summarization failed');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('AI Response:', aiResponse);
    
    // Parse the JSON response from AI, handling markdown code blocks
    let parsedResponse;
    try {
      // Remove markdown code block if present
      let jsonString = aiResponse.trim();
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/^```json\s*\n/, '').replace(/\n```$/, '');
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```\s*\n/, '').replace(/\n```$/, '');
      }
      
      parsedResponse = JSON.parse(jsonString);
    } catch (e) {
      // If parsing fails, try to extract summary and action items manually
      console.error('Failed to parse JSON:', e);
      parsedResponse = {
        summary: aiResponse.split('\n')[0] || aiResponse.substring(0, 200),
        actionItems: []
      };
    }

    console.log('Summarization successful');

    return new Response(
      JSON.stringify({ 
        summary: parsedResponse.summary || '',
        actionItems: parsedResponse.actionItems || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Summarization error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});