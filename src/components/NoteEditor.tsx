import { useState, useEffect, useCallback, useRef } from "react";
import { Mic, MicOff, Sparkles, Loader2, Trash2, Replace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { RealtimeTranscription } from "@/utils/RealtimeTranscription";

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
  const realtimeRef = useRef<RealtimeTranscription | null>(null);
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
      const transcription = new RealtimeTranscription(
        (text: string) => {
          // Append transcribed text in real-time
          setContent(prev => {
            const newContent = prev + (prev && !prev.endsWith(' ') ? ' ' : '') + text;
            return newContent;
          });
        },
        (error: string) => {
          toast({
            title: "Transcription error",
            description: error,
            variant: "destructive",
          });
          stopRecording();
        }
      );

      realtimeRef.current = transcription;
      await transcription.connect();
      setIsRecording(true);

      toast({
        title: "Live transcription started",
        description: "Speak now - your words will appear in real-time",
      });
    } catch (error: any) {
      toast({
        title: "Failed to start transcription",
        description: error.message || "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (realtimeRef.current) {
      realtimeRef.current.disconnect();
      realtimeRef.current = null;
    }
    setIsRecording(false);
    
    toast({
      title: "Transcription stopped",
      description: "Your transcription has been saved to the note",
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (realtimeRef.current) {
        realtimeRef.current.disconnect();
      }
    };
  }, []);

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

  const handleReplaceWithSummary = async () => {
    if (!summary) return;

    const newContent = summary + (actionItems.length > 0 ? '\n\n' + actionItems.map((item, i) => `${i + 1}. ${item}`).join('\n') : '');
    setContent(newContent);
    
    // Save the updated content
    if (noteId) {
      await supabase
        .from('notes')
        .update({ content: newContent })
        .eq('id', noteId);
    }

    toast({
      title: "Note replaced",
      description: "Your note has been replaced with the AI summary.",
    });
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
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Summary
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReplaceWithSummary}
              >
                <Replace className="mr-2 h-4 w-4" />
                Replace Note
              </Button>
            </div>
            
            {summary && (
              <div>
                <p className="text-sm whitespace-pre-line">{summary}</p>
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