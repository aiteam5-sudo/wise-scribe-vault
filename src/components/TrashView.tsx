import { useState, useEffect } from "react";
import { Trash2, RotateCcw, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
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
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) {
      toast({
        title: "Error fetching deleted notes",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setDeletedNotes(data || []);
    }
    setLoading(false);
  };

  const restoreNote = async (noteId: string) => {
    const { error } = await supabase
      .from('notes')
      .update({ deleted_at: null })
      .eq('id', noteId);

    if (error) {
      toast({
        title: "Error restoring note",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Note restored",
        description: "The note has been restored successfully.",
      });
      fetchDeletedNotes();
    }
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

  const getDaysUntilDeletion = (deletedAt: string) => {
    const deletedDate = new Date(deletedAt);
    const expiryDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    return daysLeft;
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
            {deletedNotes.map((note) => {
              const daysLeft = getDaysUntilDeletion(note.deleted_at);
              return (
                <div
                  key={note.id}
                  className="group p-6 rounded-xl glass-effect border border-border/50 hover:border-destructive/30 transition-smooth"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1 truncate text-foreground">
                        {note.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {note.content?.replace(/<[^>]*>/g, '').substring(0, 150) || 'Empty note'}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            Deleted {formatDistanceToNow(new Date(note.deleted_at), { addSuffix: true })}
                          </span>
                        </div>
                        <span>•</span>
                        <span className={cn(
                          "font-medium",
                          daysLeft <= 7 && "text-destructive"
                        )}>
                          {daysLeft} {daysLeft === 1 ? 'day' : 'days'} until permanent deletion
                        </span>
                      </div>
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
                </div>
              );
            })}
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