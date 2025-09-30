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
            content: 'You are an expert note designer and summarizer. Create beautifully formatted, decorative HTML summaries that are visually appealing and easy to read. Use rich formatting with colors, different sizes, bold, italics, and underlines to make the content engaging and organized.' 
          },
          { 
            role: 'user', 
            content: `Please analyze this note and create a BEAUTIFULLY FORMATTED HTML summary with:

1. Use HTML tags with inline styles for rich formatting:
   - <h1 style="color: #2563eb; font-size: 24px; font-weight: bold;">Main Heading</h1>
   - <h2 style="color: #7c3aed; font-size: 20px; font-weight: bold;">Sub Heading</h2>
   - <p style="font-size: 16px;">Regular text</p>
   - <strong>Bold text</strong> for important points
   - <em>Italic text</em> for emphasis
   - <u>Underlined text</u> for key terms
   - Use colors: #2563eb (blue), #7c3aed (purple), #dc2626 (red), #059669 (green), #ea580c (orange)
   - <ul> and <li> for bullet points

2. Make it DECORATIVE and VISUALLY APPEALING:
   - Use different colors for different sections
   - Mix bold, italic, and underline for emphasis
   - Use larger headings for main topics
   - Use colored text to highlight important information
   - Create a clear visual hierarchy

3. Extract action items as a separate array

Note content:
${content}

Format your response as JSON with:
- "formattedSummary": A string containing beautifully formatted HTML with colors, sizes, bold, italic, underline
- "actionItems": An array of action item strings (plain text)

Make it visually stunning and easy to understand!` 
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
        formattedSummary: `<p style="font-size: 16px;">${aiResponse.split('\n')[0] || aiResponse.substring(0, 200)}</p>`,
        actionItems: []
      };
    }

    console.log('Summarization successful');

    return new Response(
      JSON.stringify({ 
        summary: parsedResponse.formattedSummary || parsedResponse.summary || '',
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