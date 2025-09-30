import { useState, useEffect, useCallback, useRef } from "react";
import { Mic, MicOff, Sparkles, Loader2, Trash2, Replace, Wand2, MoreVertical, Share2, Copy, Tag, Image, AudioLines, ScanLine, StickyNote, Calendar, Minimize2, Maximize2, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { RealtimeTranscription } from "@/utils/RealtimeTranscription";
import { RichTextEditor } from "./RichTextEditor";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [showTitlePopover, setShowTitlePopover] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const realtimeRef = useRef<RealtimeTranscription | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

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

    // Build formatted content with action items
    let formattedContent = summary;
    
    if (actionItems.length > 0) {
      formattedContent += '<br><br><h2 style="color: #dc2626; font-size: 20px; font-weight: bold;">Action Items</h2><ul>';
      actionItems.forEach((item, i) => {
        formattedContent += `<li style="font-size: 16px;"><strong style="color: #7c3aed;">${i + 1}.</strong> ${item}</li>`;
      });
      formattedContent += '</ul>';
    }
    
    setContent(formattedContent);
    
    // Save the updated content
    if (noteId) {
      await supabase
        .from('notes')
        .update({ content: formattedContent })
        .eq('id', noteId);
    }

    toast({
      title: "Note replaced",
      description: "Your note has been replaced with the beautifully formatted AI summary.",
    });
  };

  const handleGenerateTitle = async () => {
    if (!content.trim()) {
      toast({
        title: "No content available",
        description: "Please add some content to generate title suggestions.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingTitle(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-title', {
        body: { content }
      });

      if (error) throw error;

      if (data?.titles && data.titles.length > 0) {
        setTitleSuggestions(data.titles);
        setShowTitlePopover(true);
        toast({
          title: "Titles generated",
          description: "Choose from 3 AI-generated title options.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Title generation failed",
        description: error.message || "Failed to generate title suggestions.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleSelectTitle = async (selectedTitle: string) => {
    setTitle(selectedTitle);
    setShowTitlePopover(false);
    
    // Save the title immediately
    if (noteId) {
      await supabase
        .from('notes')
        .update({ title: selectedTitle })
        .eq('id', noteId);
    }

    toast({
      title: "Title updated",
      description: "Your note title has been updated.",
    });
  };

  const handleDuplicate = async () => {
    if (!noteId) return;

    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: userId,
        title: `${title} (Copy)`,
        content,
        summary,
        action_items: actionItems,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error duplicating note",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Note duplicated",
        description: "A copy of your note has been created.",
      });
      onNoteCreated(data.id);
    }
  };

  const handleShare = () => {
    toast({
      title: "Share feature",
      description: "Share functionality coming soon!",
    });
  };

  const handleAddTag = () => {
    toast({
      title: "Add tag",
      description: "Tag functionality coming soon!",
    });
  };

  const handleAddImage = () => {
    toast({
      title: "Add image",
      description: "Image upload coming soon!",
    });
  };

  const handleAddAudio = () => {
    toast({
      title: "Add audio",
      description: "Audio upload coming soon!",
    });
  };

  const handleScan = () => {
    toast({
      title: "Scan",
      description: "Scan functionality coming soon!",
    });
  };

  const handleStickyNote = () => {
    toast({
      title: "Sticky note",
      description: "Sticky note feature coming soon!",
    });
  };

  const handleAddToCalendar = () => {
    toast({
      title: "Add to calendar",
      description: "Calendar integration coming soon!",
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
    <div className={`flex-1 flex flex-col ${isMaximized ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      <div className="border-b p-4 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
            title="Back to Home"
          >
            <Home className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Minimize" : "Maximize"}
            >
              {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title..."
            className="text-2xl font-bold border-none focus-visible:ring-0 px-0 flex-1"
          />
          <Popover open={showTitlePopover} onOpenChange={setShowTitlePopover}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleGenerateTitle}
                disabled={isGeneratingTitle || !content.trim()}
                title="Generate title with AI"
              >
                {isGeneratingTitle ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="end">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Choose a title
                </h4>
                <div className="space-y-2">
                  {titleSuggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-2 px-3 hover:bg-accent"
                      onClick={() => handleSelectTitle(suggestion)}
                    >
                      <span className="text-sm">{suggestion}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="flex items-center justify-end gap-2">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleAddTag}>
                <Tag className="mr-2 h-4 w-4" />
                Add Tag
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddImage}>
                <Image className="mr-2 h-4 w-4" />
                Add Image
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddAudio}>
                <AudioLines className="mr-2 h-4 w-4" />
                Add Audio
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleScan}>
                <ScanLine className="mr-2 h-4 w-4" />
                Scan
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleStickyNote}>
                <StickyNote className="mr-2 h-4 w-4" />
                Sticky Note
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleAddToCalendar}>
                <Calendar className="mr-2 h-4 w-4" />
                Add to Calendar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder="Start typing or record your thoughts..."
          className="min-h-[400px]"
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
              <div 
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: summary }} 
              />
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