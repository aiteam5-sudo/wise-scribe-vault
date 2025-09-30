import "https://deno.land/x/xhr@0.1.0/mod.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

Deno.serve(async (req) => {
  if (req.headers.get("upgrade") !== "websocket") {
    return new Response("Expected WebSocket", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  let openAISocket: WebSocket | null = null;

  socket.onopen = () => {
    console.log("Client connected");
    
    // Connect to OpenAI Realtime API
    const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17";
    openAISocket = new WebSocket(url, [
      "realtime",
      `openai-insecure-api-key.${OPENAI_API_KEY}`,
      "openai-beta.realtime-v1"
    ]);

    openAISocket.onopen = () => {
      console.log("Connected to OpenAI");
    };

    openAISocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("OpenAI message type:", data.type);

      // Send session.update after session.created
      if (data.type === 'session.created') {
        const sessionConfig = {
          type: "session.update",
          session: {
            modalities: ["text"],
            instructions: "You are a transcription assistant. Transcribe the user's speech accurately. Only transcribe, do not respond.",
            input_audio_format: "pcm16",
            input_audio_transcription: {
              model: "whisper-1"
            },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 700
            }
          }
        };
        openAISocket?.send(JSON.stringify(sessionConfig));
        console.log("Session configured for transcription");
      }

      // Log and forward all transcription-related events
      if (data.type === 'conversation.item.input_audio_transcription.completed') {
        console.log("Transcription completed:", data.transcript);
        socket.send(JSON.stringify(data));
      } else if (data.type === 'conversation.item.input_audio_transcription.delta') {
        console.log("Transcription delta:", data.delta);
        socket.send(JSON.stringify(data));
      } else if (data.type === 'conversation.item.created') {
        console.log("Conversation item created");
        socket.send(JSON.stringify(data));
      } else if (data.type === 'error') {
        console.error("OpenAI error:", data.error);
        socket.send(JSON.stringify(data));
      }
    };

    openAISocket.onerror = (error) => {
      console.error("OpenAI WebSocket error:", error);
      socket.send(JSON.stringify({ type: 'error', message: 'OpenAI connection error' }));
    };

    openAISocket.onclose = () => {
      console.log("OpenAI connection closed");
      socket.close();
    };
  };

  socket.onmessage = (event) => {
    // Forward client audio to OpenAI
    if (openAISocket?.readyState === WebSocket.OPEN) {
      openAISocket.send(event.data);
    }
  };

  socket.onclose = () => {
    console.log("Client disconnected");
    openAISocket?.close();
  };

  socket.onerror = (error) => {
    console.error("Client WebSocket error:", error);
    openAISocket?.close();
  };

  return response;
});
