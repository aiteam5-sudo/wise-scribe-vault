import { useState, useEffect } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface StickyNote {
  id: string;
  content: string;
  color: string;
  position_x: number;
  position_y: number;
  user_id: string;
  created_at: string;
}

interface StickyNotesBoardProps {
  userId: string;
}

const COLORS = [
  { name: "Yellow", value: "#fef3c7", textColor: "#92400e" },
  { name: "Pink", value: "#fce7f3", textColor: "#831843" },
  { name: "Blue", value: "#dbeafe", textColor: "#1e3a8a" },
  { name: "Green", value: "#d1fae5", textColor: "#065f46" },
  { name: "Purple", value: "#e9d5ff", textColor: "#581c87" },
  { name: "Orange", value: "#fed7aa", textColor: "#7c2d12" },
];

export function StickyNotesBoard({ userId }: StickyNotesBoardProps) {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const { toast } = useToast();

  useEffect(() => {
    fetchNotes();
  }, [userId]);

  const fetchNotes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sticky_notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error loading sticky notes",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setNotes(data || []);
    }
    setLoading(false);
  };

  const createNote = async () => {
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    const { error } = await supabase
      .from('sticky_notes')
      .insert([{
        user_id: userId,
        content: '',
        color: randomColor.value,
        position_x: Math.random() * (window.innerWidth - 300),
        position_y: Math.random() * (window.innerHeight - 300),
      }]);

    if (error) {
      toast({
        title: "Error creating note",
        description: error.message,
        variant: "destructive",
      });
    } else {
      fetchNotes();
    }
  };

  const updateNote = async (id: string, updates: Partial<StickyNote>) => {
    const { error } = await supabase
      .from('sticky_notes')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({
        title: "Error updating note",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase
      .from('sticky_notes')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error deleting note",
        description: error.message,
        variant: "destructive",
      });
    } else {
      fetchNotes();
    }
  };

  const handleMouseDown = (e: React.MouseEvent, noteId: string, noteX: number, noteY: number) => {
    if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
    
    setDraggingId(noteId);
    setDragOffset({
      x: e.clientX - noteX,
      y: e.clientY - noteY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingId) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    setNotes(prev => prev.map(note => 
      note.id === draggingId 
        ? { ...note, position_x: newX, position_y: newY }
        : note
    ));
  };

  const handleMouseUp = () => {
    if (draggingId) {
      const note = notes.find(n => n.id === draggingId);
      if (note) {
        updateNote(draggingId, {
          position_x: note.position_x,
          position_y: note.position_y,
        });
      }
      setDraggingId(null);
    }
  };

  const getTextColor = (bgColor: string) => {
    const color = COLORS.find(c => c.value === bgColor);
    return color?.textColor || "#000000";
  };

  return (
    <div 
      className="relative w-full h-screen overflow-hidden bg-background"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header */}
      <div className="absolute top-4 left-4 z-10 space-y-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">Sticky Notes</h1>
          <Button
            onClick={createNote}
            className="gradient-primary shadow-primary"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Note
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map((color) => (
            <button
              key={color.value}
              onClick={async () => {
                await createNote();
                const newNotes = await supabase
                  .from('sticky_notes')
                  .select('*')
                  .eq('user_id', userId)
                  .order('created_at', { ascending: false })
                  .limit(1);
                
                if (newNotes.data?.[0]) {
                  updateNote(newNotes.data[0].id, { color: color.value });
                  fetchNotes();
                }
              }}
              className="w-8 h-8 rounded-full border-2 border-border hover:scale-110 transition-transform"
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>
      </div>

      {/* Sticky Notes */}
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Loading sticky notes...</p>
        </div>
      ) : notes.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">No sticky notes yet</p>
            <p className="text-sm text-muted-foreground">Click "New Note" to create your first sticky note</p>
          </div>
        </div>
      ) : (
        notes.map((note) => (
          <div
            key={note.id}
            className={cn(
              "absolute w-64 p-4 rounded-lg shadow-lg cursor-move",
              draggingId === note.id && "shadow-2xl scale-105 z-50"
            )}
            style={{
              left: note.position_x,
              top: note.position_y,
              backgroundColor: note.color,
            }}
            onMouseDown={(e) => handleMouseDown(e, note.id, note.position_x, note.position_y)}
          >
            <div className="flex items-start justify-between mb-2">
              <GripVertical 
                className="h-5 w-5 cursor-grab active:cursor-grabbing" 
                style={{ color: getTextColor(note.color) }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteNote(note.id)}
                className="h-6 w-6 hover:bg-black/10"
                style={{ color: getTextColor(note.color) }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              value={note.content}
              onChange={(e) => {
                setNotes(prev => prev.map(n => 
                  n.id === note.id ? { ...n, content: e.target.value } : n
                ));
              }}
              onBlur={(e) => updateNote(note.id, { content: e.target.value })}
              placeholder="Type your note..."
              className="border-0 bg-transparent resize-none focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[150px]"
              style={{ color: getTextColor(note.color) }}
            />
          </div>
        ))
      )}
    </div>
  );
}
