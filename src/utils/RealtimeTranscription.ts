export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      this.audioContext = new AudioContext({
        sampleRate: 24000,
      });
      
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        this.onAudioData(new Float32Array(inputData));
      };
      
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      
      console.log('Audio recorder started');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  stop() {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    console.log('Audio recorder stopped');
  }
}

export const encodeAudioForAPI = (float32Array: Float32Array): string => {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
};

export class RealtimeTranscription {
  private ws: WebSocket | null = null;
  private recorder: AudioRecorder | null = null;
  private isConnected = false;

  constructor(
    private onTranscript: (text: string) => void,
    private onError: (error: string) => void
  ) {}

  async connect() {
    try {
      // Connect to our edge function WebSocket
      const wsUrl = 'wss://fontsvmexlkwqgbfrwtl.supabase.co/functions/v1/realtime-transcribe';
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('Connected to transcription service');
        this.isConnected = true;
        this.startRecording();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received message:', data.type);

          // Completed full utterance transcript
          if (data.type === 'conversation.item.input_audio_transcription.completed') {
            console.log('Transcription completed:', data.transcript);
            if (data.transcript) {
              this.onTranscript(data.transcript + ' ');
            }
          }
          // Partial (word/token) deltas direct from input stream
          else if (data.type === 'conversation.item.input_audio_transcription.delta') {
            console.log('Transcription delta:', data.delta);
            if (data.delta) {
              this.onTranscript(data.delta);
            }
          }
          // Streamed transcript tokens from the response after VAD commit
          else if (data.type === 'response.audio_transcript.delta') {
            console.log('Transcript delta (response):', data.delta);
            if (data.delta) {
              this.onTranscript(data.delta);
            }
          }
          // Conversation item with transcript attached
          else if (data.type === 'conversation.item.created') {
            if (data.item?.content) {
              const transcriptContent = data.item.content.find((c: any) => c.type === 'input_audio' && c.transcript);
              if (transcriptContent?.transcript) {
                this.onTranscript(transcriptContent.transcript + ' ');
              }
            }
          }
          // Errors
          else if (data.type === 'error') {
            console.error('Transcription error:', data.error);
            this.onError(data.error?.message || 'Unknown error');
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.onError('Connection error');
      };

      this.ws.onclose = () => {
        console.log('WebSocket closed');
        this.isConnected = false;
        this.stopRecording();
      };

    } catch (error) {
      console.error('Connection error:', error);
      this.onError('Failed to connect');
    }
  }

  private startRecording() {
    this.recorder = new AudioRecorder((audioData) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const encoded = encodeAudioForAPI(audioData);
        const message = {
          type: 'input_audio_buffer.append',
          audio: encoded
        };
        this.ws.send(JSON.stringify(message));
      }
    });

    this.recorder.start().catch((error) => {
      console.error('Failed to start recording:', error);
      this.onError('Failed to access microphone');
    });
  }

  private stopRecording() {
    if (this.recorder) {
      this.recorder.stop();
      this.recorder = null;
    }
  }

  disconnect() {
    this.stopRecording();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  getConnectionState(): boolean {
    return this.isConnected;
  }
}
