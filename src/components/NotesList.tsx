import { useState, useEffect } from "react";
import { Plus, FileText, Trash2, MoreVertical, Share2, Palette, FolderInput, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  position: number;
}

interface NotesListProps {
  userId: string;
  selectedNoteId: string | null;
  onNoteSelect: (noteId: string) => void;
  folderId: string | null;
}

interface SortableNoteItemProps {
  note: Note;
  selectedNoteId: string | null;
  onNoteSelect: (noteId: string) => void;
  onDeleteNote: (note: Note) => void;
  formatDate: (dateString: string) => string;
  getPreview: (content: string) => string;
}

function SortableNoteItem({ 
  note, 
  selectedNoteId, 
  onNoteSelect, 
  onDeleteNote,
  formatDate,
  getPreview 
}: SortableNoteItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const { toast } = useToast();

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "relative group",
        isDragging && "z-50"
      )}
    >
      <button
        onClick={() => onNoteSelect(note.id)}
        className={cn(
          "w-full text-left p-4 border-b hover:bg-primary/10 transition-smooth hover:shadow-md backdrop-blur-sm flex items-center gap-2",
          selectedNoteId === note.id && "bg-gradient-to-r from-primary/20 to-accent/20 border-l-4 border-l-primary shadow-glow tech-border"
        )}
      >
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <GripVertical className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-base truncate flex-1">
              {note.title}
            </h3>
            <div className="flex items-center gap-1 shrink-0">
              <p className="text-xs text-muted-foreground">
                {formatDate(note.updated_at)}
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={() => {
                    toast({
                      title: "Share feature",
                      description: "Share functionality coming soon!",
                    });
                  }}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDeleteNote(note)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {
                    toast({
                      title: "Color code",
                      description: "Color coding coming soon!",
                    });
                  }}>
                    <Palette className="mr-2 h-4 w-4" />
                    Color Code
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    toast({
                      title: "Move note",
                      description: "Move to folder coming soon!",
                    });
                  }}>
                    <FolderInput className="mr-2 h-4 w-4" />
                    Move
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {getPreview(note.content)}
          </p>
        </div>
      </button>
    </div>
  );
}

export function NotesList({ userId, selectedNoteId, onNoteSelect, folderId }: NotesListProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingNote, setDeletingNote] = useState<Note | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchNotes();

    // Realtime updates: refresh list on any notes change
    const channel = supabase
      .channel('notes-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes' },
        () => fetchNotes()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, folderId]);

  const fetchNotes = async () => {
    setLoading(true);
    let query = supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true });

    if (folderId) {
      query = query.eq('folder_id', folderId);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: "Error fetching notes",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setNotes(data || []);
    }
    setLoading(false);
  };

  const createNewNote = async () => {
    // Find the highest position
    const maxPosition = notes.length > 0 ? Math.max(...notes.map(n => n.position)) : 0;
    
    const { data, error } = await supabase
      .from('notes')
      .insert([{
        user_id: userId,
        title: 'Untitled Note',
        content: '',
        folder_id: folderId,
        position: maxPosition + 1,
      }])
      .select()
      .single();

    if (error) {
      toast({
        title: "Error creating note",
        description: error.message,
        variant: "destructive",
      });
    } else if (data) {
      fetchNotes();
      onNoteSelect(data.id);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = notes.findIndex((note) => note.id === active.id);
    const newIndex = notes.findIndex((note) => note.id === over.id);

    const reorderedNotes = arrayMove(notes, oldIndex, newIndex);
    
    // Update local state immediately for smooth UX
    setNotes(reorderedNotes);

    // Update positions in database
    try {
      const updates = reorderedNotes.map((note, index) => ({
        id: note.id,
        position: index,
      }));

      for (const update of updates) {
        await supabase
          .from('notes')
          .update({ position: update.position })
          .eq('id', update.id);
      }

      // Update positions silently without toast
    } catch (error: any) {
      toast({
        title: "Error reordering notes",
        description: error.message,
        variant: "destructive",
      });
      // Revert on error
      fetchNotes();
    }
  };

  const handleDeleteNote = async () => {
    if (!deletingNote) return;

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', deletingNote.id);

    if (error) {
      toast({
        title: "Error deleting note",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Note deleted",
        description: `"${deletingNote.title}" has been deleted.`,
      });
      if (selectedNoteId === deletingNote.id) {
        onNoteSelect(notes[0]?.id || '');
      }
      setDeleteDialogOpen(false);
      setDeletingNote(null);
      fetchNotes();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getPreview = (content: string) => {
    // Strip HTML tags for preview
    const strippedContent = content.replace(/<[^>]*>/g, '');
    return strippedContent.substring(0, 100) || 'No content';
  };

  return (
    <div className="w-80 border-r glass-effect flex flex-col shadow-premium">
      <div className="p-4 border-b bg-gradient-to-b from-card/50 to-muted/20">
        <Button onClick={createNewNote} className="w-full gradient-primary shadow-glow hover:shadow-primary transition-smooth font-semibold">
          <Plus className="mr-2 h-4 w-4" />
          New Note
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">Loading notes...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center p-4">
            <FileText className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No notes yet</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={notes.map(note => note.id)}
              strategy={verticalListSortingStrategy}
            >
              {notes.map((note) => (
                <SortableNoteItem
                  key={note.id}
                  note={note}
                  selectedNoteId={selectedNoteId}
                  onNoteSelect={onNoteSelect}
                  onDeleteNote={(note) => {
                    setDeletingNote(note);
                    setDeleteDialogOpen(true);
                  }}
                  formatDate={formatDate}
                  getPreview={getPreview}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Delete Note Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingNote?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}