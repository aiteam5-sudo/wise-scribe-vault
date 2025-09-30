import { useState, useEffect, useCallback, useRef } from "react";
import { Mic, MicOff, Sparkles, Loader2, Trash2, Replace, Wand2, MoreVertical, Share2, Copy, Image, AudioLines, StickyNote, Calendar, Minimize2, Maximize2, FileDown, Mail, MessageCircle, Video, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { RealtimeTranscription } from "@/utils/RealtimeTranscription";
import { RichTextEditor } from "./RichTextEditor";
import { SendNoteDialog } from "./SendNoteDialog";
import { cn } from "@/lib/utils";
import { exportNoteToPDF, shareViaEmail, shareViaWhatsApp, shareViaWhatsAppPDF } from "@/utils/pdfExport";
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
  const [audioFiles, setAudioFiles] = useState<string[]>([]);
  const [videoFiles, setVideoFiles] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
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
    setAudioFiles([]);
    setVideoFiles([]);
    setImageFiles([]);
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
      setAudioFiles(data.audio_files || []);
      setVideoFiles(data.video_files || []);
      setImageFiles(data.image_files || []);
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

      // Start transcription silently
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
    
    // Stop transcription silently
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

    // Replace note silently
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

    // Update title silently
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
      // Duplicate note silently
      onNoteCreated(data.id);
    }
  };

  const handleExportPDF = () => {
    if (!content.trim()) {
      toast({
        title: "No content to export",
        description: "Please add some content to your note first.",
        variant: "destructive",
      });
      return;
    }

    try {
      exportNoteToPDF(title || 'Untitled Note', content);
      toast({
        title: "Opening print dialog",
        description: "Use 'Save as PDF' in the print dialog.",
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message || "Failed to open print dialog.",
        variant: "destructive",
      });
    }
  };

  const handleShareEmail = () => {
    if (!content.trim()) {
      toast({
        title: "No content to share",
        description: "Please add some content to your note first.",
        variant: "destructive",
      });
      return;
    }

    setShowEmailDialog(true);
  };

  const handleShareWhatsApp = () => {
    if (!content.trim()) {
      toast({
        title: "No content to share",
        description: "Please add some content to your note first.",
        variant: "destructive",
      });
      return;
    }

    try {
      shareViaWhatsApp(title || 'Untitled Note', content);
      toast({
        title: "Opening WhatsApp",
        description: "Share your complete note via WhatsApp.",
      });
    } catch (error: any) {
      toast({
        title: "Share failed",
        description: error.message || "Failed to open WhatsApp.",
        variant: "destructive",
      });
    }
  };

  const handleShareWhatsAppPDF = () => {
    if (!content.trim()) {
      toast({
        title: "No content to share",
        description: "Please add some content to your note first.",
        variant: "destructive",
      });
      return;
    }

    try {
      shareViaWhatsAppPDF(title || 'Untitled Note', content);
    } catch (error: any) {
      toast({
        title: "Share failed",
        description: error.message || "Failed to prepare PDF.",
        variant: "destructive",
      });
    }
  };

  const handleAddImage = () => {
    imageInputRef.current?.click();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !noteId) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('note-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('note-images')
        .getPublicUrl(filePath);

      const newImageFiles = [...imageFiles, publicUrl];
      setImageFiles(newImageFiles);
      
      await supabase
        .from('notes')
        .update({ image_files: newImageFiles })
        .eq('id', noteId);

      fetchNote();
      toast({
        title: "Image uploaded",
        description: "Image has been added to your note.",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleRemoveImage = async (imageUrl: string) => {
    if (!noteId) return;
    
    const newImageFiles = imageFiles.filter(url => url !== imageUrl);
    setImageFiles(newImageFiles);

    await supabase
      .from('notes')
      .update({ image_files: newImageFiles })
      .eq('id', noteId);
  };

  const handleAddAudio = () => {
    audioInputRef.current?.click();
  };

  const handleAddVideo = () => {
    videoInputRef.current?.click();
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !noteId) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${noteId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('note-audio')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('note-audio')
        .getPublicUrl(fileName);

      const newAudioFiles = [...audioFiles, publicUrl];
      setAudioFiles(newAudioFiles);

      await supabase
        .from('notes')
        .update({ audio_files: newAudioFiles })
        .eq('id', noteId);

      toast({
        title: "Audio uploaded",
        description: "Audio file has been added to your note.",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (audioInputRef.current) audioInputRef.current.value = '';
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !noteId) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${noteId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('note-video')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('note-video')
        .getPublicUrl(fileName);

      const newVideoFiles = [...videoFiles, publicUrl];
      setVideoFiles(newVideoFiles);

      await supabase
        .from('notes')
        .update({ video_files: newVideoFiles })
        .eq('id', noteId);

      toast({
        title: "Video uploaded",
        description: "Video file has been added to your note.",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleRemoveAudio = async (index: number) => {
    const newAudioFiles = audioFiles.filter((_, i) => i !== index);
    setAudioFiles(newAudioFiles);

    if (noteId) {
      await supabase
        .from('notes')
        .update({ audio_files: newAudioFiles })
        .eq('id', noteId);
    }
  };

  const handleRemoveVideo = async (index: number) => {
    const newVideoFiles = videoFiles.filter((_, i) => i !== index);
    setVideoFiles(newVideoFiles);

    if (noteId) {
      await supabase
        .from('notes')
        .update({ video_files: newVideoFiles })
        .eq('id', noteId);
    }
  };

  const handleStickyNote = () => {
    navigate('/dashboard');
    // The sticky notes view will be accessible from the sidebar
  };

  const handleAddToCalendar = () => {
    navigate('/dashboard');
    // Calendar view is in the tasks section
  };

  if (!noteId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>Select a note or create a new one to get started</p>
        <SendNoteDialog
          open={showEmailDialog}
          onOpenChange={setShowEmailDialog}
          noteTitle={title || 'Untitled Note'}
          noteContent={content}
        />
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col ${isMaximized ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      <div className="border-b p-4 space-y-3 glass-effect shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Minimize" : "Maximize"}
              className="hover:bg-primary/20 hover:text-primary transition-smooth hover:shadow-glow"
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
            className="text-2xl font-bold border-none focus-visible:ring-2 focus-visible:ring-primary/50 px-0 flex-1 bg-transparent text-foreground placeholder:text-muted-foreground"
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
            className={cn(
              "transition-smooth hover:shadow-glow",
              isRecording && "animate-glow shadow-destructive shadow-accent"
            )}
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            onClick={handleSummarize}
            disabled={isSummarizing || !content.trim()}
            className="gradient-primary text-primary-foreground border-0 shadow-glow hover:shadow-primary transition-smooth font-semibold relative overflow-hidden group"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
            {isSummarizing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4 animate-glow" />
            )}
            AI Summarize
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileDown className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShareEmail}>
                <Mail className="mr-2 h-4 w-4" />
                Share via Email
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShareWhatsApp}>
                <MessageCircle className="mr-2 h-4 w-4" />
                Share via WhatsApp
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleAddImage} disabled={isUploading}>
                <Image className="mr-2 h-4 w-4" />
                {isUploading ? "Uploading..." : "Add Image"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddAudio} disabled={isUploading}>
                <AudioLines className="mr-2 h-4 w-4" />
                {isUploading ? "Uploading..." : "Add Audio"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddVideo} disabled={isUploading}>
                <Video className="mr-2 h-4 w-4" />
                {isUploading ? "Uploading..." : "Add Video"}
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
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          onChange={handleAudioUpload}
          className="hidden"
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          onChange={handleVideoUpload}
          className="hidden"
        />

        {(audioFiles.length > 0 || videoFiles.length > 0) && (
          <Card className="mb-4 p-4 space-y-3 glass-effect border-border/50">
            {audioFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <AudioLines className="h-4 w-4 text-primary" />
                  Audio Files
                </h4>
                {audioFiles.map((url, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <audio controls src={url} className="flex-1 h-10" />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveAudio(index)}
                      className="h-8 w-8 hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {videoFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Video className="h-4 w-4 text-primary" />
                  Video Files
                </h4>
                {videoFiles.map((url, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <video controls src={url} className="flex-1 max-h-[300px] rounded" />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveVideo(index)}
                      className="h-8 w-8 hover:text-destructive self-start"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder="Start typing or record your thoughts..."
          className="min-h-[400px]"
        />

        {(summary || actionItems.length > 0) && (
          <Card className="mt-6 p-6 space-y-4 glass-effect tech-border shadow-glow animate-fade-in relative overflow-hidden">
            <div className="absolute inset-0 gradient-glow opacity-50 pointer-events-none" />
            <div className="flex items-center justify-between relative z-10">
              <h3 className="font-bold flex items-center gap-2 text-lg text-foreground">
                <Sparkles className="h-5 w-5 text-primary ai-pulse" />
                <span className="text-primary">AI Summary</span>
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReplaceWithSummary}
                className="hover:bg-primary hover:text-primary-foreground transition-smooth shadow-md hover:shadow-glow border-primary/30"
              >
                <Replace className="mr-2 h-4 w-4" />
                Replace Note
              </Button>
            </div>
            
            {summary && (
              <div 
                className="prose prose-sm max-w-none dark:prose-invert relative z-10"
                dangerouslySetInnerHTML={{ __html: summary }} 
              />
            )}
            
            {actionItems.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-foreground">Action Items</h3>
                <div className="space-y-2">
                  {actionItems.map((item, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5">
                        {index + 1}
                      </Badge>
                      <p className="text-sm flex-1 text-foreground">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
      
      <SendNoteDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        noteTitle={title || 'Untitled Note'}
        noteContent={content}
      />
    </div>
  );
}