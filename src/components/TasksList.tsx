import { useState, useEffect } from "react";
import { Plus, Trash2, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  content: string;
  is_completed: boolean;
  created_at: string;
}

interface TasksListProps {
  userId: string;
}

export function TasksList({ userId }: TasksListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskContent, setNewTaskContent] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
  }, [userId]);

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('action_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error fetching tasks",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  };

  const createTask = async () => {
    if (!newTaskContent.trim()) return;

    const { error } = await supabase
      .from('action_items')
      .insert([{
        user_id: userId,
        content: newTaskContent.trim(),
        is_completed: false,
        note_id: null,
      }]);

    if (error) {
      toast({
        title: "Error creating task",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setNewTaskContent("");
      fetchTasks();
    }
  };

  const toggleTask = async (taskId: string, isCompleted: boolean) => {
    const { error } = await supabase
      .from('action_items')
      .update({ is_completed: !isCompleted })
      .eq('id', taskId);

    if (error) {
      toast({
        title: "Error updating task",
        description: error.message,
        variant: "destructive",
      });
    } else {
      fetchTasks();
    }
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from('action_items')
      .delete()
      .eq('id', taskId);

    if (error) {
      toast({
        title: "Error deleting task",
        description: error.message,
        variant: "destructive",
      });
    } else {
      fetchTasks();
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Tasks
          </h1>
          <p className="text-muted-foreground">
            Manage your action items and to-dos
          </p>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Add a new task..."
            value={newTaskContent}
            onChange={(e) => setNewTaskContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                createTask();
              }
            }}
            className="flex-1"
          />
          <Button 
            onClick={createTask}
            className="gradient-primary shadow-primary hover:shadow-glow transition-smooth"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No tasks yet. Add your first task above!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "group flex items-center gap-3 p-4 rounded-xl glass-effect border border-border/50 hover:border-primary/30 transition-smooth",
                  task.is_completed && "opacity-60"
                )}
              >
                <button
                  onClick={() => toggleTask(task.id, task.is_completed)}
                  className="shrink-0 hover:scale-110 transition-transform"
                >
                  {task.is_completed ? (
                    <CheckSquare className="h-5 w-5 text-primary" />
                  ) : (
                    <Square className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                  )}
                </button>
                <span
                  className={cn(
                    "flex-1 text-sm text-foreground",
                    task.is_completed && "line-through text-muted-foreground"
                  )}
                >
                  • {task.content}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteTask(task.id)}
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}