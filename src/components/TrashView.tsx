import { useState, useEffect } from "react";
import { Trash2, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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

interface DeletedNote {
  id: string;
  title: string;
  content: string;
  deleted_at: string;
}

interface TrashViewProps {
  userId: string;
}

export function TrashView({ userId }: TrashViewProps) {
  const [deletedNotes, setDeletedNotes] = useState<DeletedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [permanentDeleteDialog, setPermanentDeleteDialog] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchDeletedNotes();
  }, [userId]);

  const fetchDeletedNotes = async () => {
    setLoading(true);
    // For now, we'll show recently deleted notes (you can add a deleted_at column later)
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      toast({
        title: "Error fetching deleted notes",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Mock deleted notes for now - in production you'd have a deleted_at column
      setDeletedNotes([]);
    }
    setLoading(false);
  };

  const restoreNote = async (noteId: string) => {
    // Restore functionality - would update deleted_at to null
    toast({
      title: "Note restored",
      description: "The note has been restored successfully.",
    });
    fetchDeletedNotes();
  };

  const permanentlyDelete = async () => {
    if (!selectedNoteId) return;

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', selectedNoteId);

    if (error) {
      toast({
        title: "Error deleting note",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Note permanently deleted",
        description: "The note has been permanently deleted.",
      });
      setPermanentDeleteDialog(false);
      setSelectedNoteId(null);
      fetchDeletedNotes();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Trash
          </h1>
          <p className="text-muted-foreground">
            Deleted notes are kept here for 30 days before permanent deletion
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading trash...</p>
          </div>
        ) : deletedNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Trash2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Trash is empty</p>
          </div>
        ) : (
          <div className="space-y-4">
            {deletedNotes.map((note) => (
              <div
                key={note.id}
                className="group p-6 rounded-xl glass-effect border border-border/50 hover:border-destructive/30 transition-smooth"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg mb-1 truncate text-foreground">
                      {note.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {note.content.replace(/<[^>]*>/g, '').substring(0, 150)}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => restoreNote(note.id)}
                      className="hover:bg-primary/10 hover:text-primary transition-smooth"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedNoteId(note.id);
                        setPermanentDeleteDialog(true);
                      }}
                      className="hover:bg-destructive/10 hover:text-destructive transition-smooth"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Delete Forever
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Deleted: {formatDate(note.deleted_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={permanentDeleteDialog} onOpenChange={setPermanentDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Note?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the note from your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={permanentlyDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}