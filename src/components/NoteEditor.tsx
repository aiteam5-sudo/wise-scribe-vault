import { useState, useEffect, useCallback } from "react";
import { Mic, MicOff, Sparkles, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

interface NoteEditorProps {
  userId: string;
  noteId: string | null;
  onNoteCreated: (id: string) => void;
}

export function NoteEditor({ userId, noteId, onNoteCreated }: NoteEditorProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [summary, setSummary] = useState("");
  const [actionItems, setActionItems] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (noteId) {
      fetchNote();
    } else {
      resetEditor();
    }
  }, [noteId]);

  // Auto-save functionality
  useEffect(() => {
    if (!noteId) return;

    const timer = setTimeout(() => {
      saveNote();
    }, 1000);

    return () => clearTimeout(timer);
  }, [title, content, noteId]);

  const resetEditor = () => {
    setTitle("");
    setContent("");
    setSummary("");
    setActionItems([]);
  };

  const fetchNote = async () => {
    if (!noteId) return;

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .single();

    if (error) {
      toast({
        title: "Error fetching note",
        description: error.message,
        variant: "destructive",
      });
    } else if (data) {
      setTitle(data.title);
      setContent(data.content);
      setSummary(data.summary || "");
      setActionItems(data.action_items || []);
    }
  };

  const saveNote = async () => {
    if (!noteId) return;

    await supabase
      .from('notes')
      .update({
        title: title || 'Untitled Note',
        content,
      })
      .eq('id', noteId);
  };

  const handleDelete = async () => {
    if (!noteId) return;

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      toast({
        title: "Error deleting note",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Note deleted",
        description: "The note has been deleted successfully.",
      });
      onNoteCreated('');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        await transcribeAudio(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to record audio.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        const { data, error } = await supabase.functions.invoke('transcribe-audio', {
          body: { audio: base64Audio }
        });

        if (error) throw error;

        if (data?.text) {
          setContent(prev => prev + (prev ? '\n\n' : '') + data.text);
          toast({
            title: "Transcription complete",
            description: "Audio has been transcribed and added to your note.",
          });
        }
      };
    } catch (error: any) {
      toast({
        title: "Transcription failed",
        description: error.message || "Failed to transcribe audio. Make sure you have configured the OpenAI API key.",
        variant: "destructive",
      });
    }
  };

  const handleSummarize = async () => {
    if (!content.trim()) {
      toast({
        title: "No content to summarize",
        description: "Please add some content to your note first.",
        variant: "destructive",
      });
      return;
    }

    setIsSummarizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('summarize-note', {
        body: { content }
      });

      if (error) throw error;

      if (data) {
        setSummary(data.summary);
        setActionItems(data.actionItems || []);
        
        // Save summary and action items to database
        if (noteId) {
          await supabase
            .from('notes')
            .update({
              summary: data.summary,
              action_items: data.actionItems || [],
            })
            .eq('id', noteId);
        }

        toast({
          title: "Summary generated",
          description: "AI has analyzed your note and extracted key information.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Summarization failed",
        description: error.message || "Failed to generate summary.",
        variant: "destructive",
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  if (!noteId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>Select a note or create a new one to get started</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b p-4 flex items-center justify-between">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="text-2xl font-bold border-none focus-visible:ring-0 px-0"
        />
        <div className="flex items-center gap-2">
          <Button
            variant={isRecording ? "destructive" : "outline"}
            size="icon"
            onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            onClick={handleSummarize}
            disabled={isSummarizing || !content.trim()}
          >
            {isSummarizing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Summarize
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start typing or record your thoughts..."
          className="min-h-[400px] border-none focus-visible:ring-0 resize-none text-base"
        />

        {(summary || actionItems.length > 0) && (
          <Card className="mt-6 p-4 space-y-4 bg-accent/50">
            {summary && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Summary
                </h3>
                <p className="text-sm text-muted-foreground">{summary}</p>
              </div>
            )}
            
            {actionItems.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Action Items</h3>
                <div className="space-y-2">
                  {actionItems.map((item, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5">
                        {index + 1}
                      </Badge>
                      <p className="text-sm flex-1">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}