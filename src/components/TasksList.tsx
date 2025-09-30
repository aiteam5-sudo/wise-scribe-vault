import { useState, useEffect } from "react";
import { Plus, Trash2, CheckSquare, Square, Bell, Calendar, Clock, Repeat } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  content: string;
  is_completed: boolean;
  created_at: string;
}

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  remind_at: string;
  is_completed: boolean;
  note_id: string | null;
  created_at: string;
  frequency?: string;
}

interface TasksListProps {
  userId: string;
}

export function TasksList({ userId }: TasksListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newTaskContent, setNewTaskContent] = useState("");
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [newReminderDescription, setNewReminderDescription] = useState("");
  const [newReminderDate, setNewReminderDate] = useState<Date>();
  const [newReminderTime, setNewReminderTime] = useState("09:00");
  const [newReminderFrequency, setNewReminderFrequency] = useState("once");
  const [loading, setLoading] = useState(true);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
    fetchReminders();
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

  const fetchReminders = async () => {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .order('remind_at', { ascending: true });

    if (error) {
      toast({
        title: "Error fetching reminders",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setReminders(data || []);
    }
  };

  const createReminder = async () => {
    if (!newReminderTitle.trim() || !newReminderDate) {
      toast({
        title: "Missing information",
        description: "Please provide a title and date/time for the reminder.",
        variant: "destructive",
      });
      return;
    }

    // Combine date and time
    const [hours, minutes] = newReminderTime.split(':');
    const reminderDateTime = new Date(newReminderDate);
    reminderDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const { error } = await supabase
      .from('reminders')
      .insert([{
        user_id: userId,
        title: newReminderTitle.trim(),
        description: newReminderDescription.trim() || null,
        remind_at: reminderDateTime.toISOString(),
        is_completed: false,
      }]);

    if (error) {
      toast({
        title: "Error creating reminder",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const frequencyText = newReminderFrequency === 'once' ? '' : ` (${newReminderFrequency})`;
      toast({
        title: "Reminder created",
        description: `You'll receive an email at ${format(reminderDateTime, "PPP 'at' p")}${frequencyText}`,
      });
      setNewReminderTitle("");
      setNewReminderDescription("");
      setNewReminderDate(undefined);
      setNewReminderTime("09:00");
      setNewReminderFrequency("once");
      setReminderDialogOpen(false);
      fetchReminders();
    }
  };

  const toggleReminder = async (reminderId: string, isCompleted: boolean) => {
    const { error } = await supabase
      .from('reminders')
      .update({ is_completed: !isCompleted })
      .eq('id', reminderId);

    if (error) {
      toast({
        title: "Error updating reminder",
        description: error.message,
        variant: "destructive",
      });
    } else {
      fetchReminders();
    }
  };

  const deleteReminder = async (reminderId: string) => {
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', reminderId);

    if (error) {
      toast({
        title: "Error deleting reminder",
        description: error.message,
        variant: "destructive",
      });
    } else {
      fetchReminders();
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Tasks & Reminders
          </h1>
          <p className="text-muted-foreground">
            Manage your action items and email reminders
          </p>
        </div>

        {/* Reminders Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Email Reminders
            </h2>
            <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline"
                  className="border-primary/30 hover:border-primary hover:bg-primary/5"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Reminder
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Email Reminder</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="reminder-title">Title *</Label>
                    <Input
                      id="reminder-title"
                      placeholder="Reminder title..."
                      value={newReminderTitle}
                      onChange={(e) => setNewReminderTitle(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reminder-description">Description</Label>
                    <Textarea
                      id="reminder-description"
                      placeholder="Additional details..."
                      value={newReminderDescription}
                      onChange={(e) => setNewReminderDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !newReminderDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {newReminderDate ? format(newReminderDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={newReminderDate}
                          onSelect={setNewReminderDate}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reminder-time">Time *</Label>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reminder-time"
                        type="time"
                        value={newReminderTime}
                        onChange={(e) => setNewReminderTime(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reminder-frequency">Frequency</Label>
                    <Select value={newReminderFrequency} onValueChange={setNewReminderFrequency}>
                      <SelectTrigger id="reminder-frequency">
                        <div className="flex items-center gap-2">
                          <Repeat className="h-4 w-4" />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="once">One time only</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {newReminderFrequency === "once" 
                        ? "Reminder will be sent once at the specified time"
                        : `Reminder will repeat ${newReminderFrequency} (Note: You'll need to create new reminders for recurring notifications)`
                      }
                    </p>
                  </div>

                  <Button
                    onClick={createReminder}
                    className="w-full gradient-primary shadow-primary"
                    disabled={!newReminderTitle.trim() || !newReminderDate}
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    Create Reminder
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {reminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center glass-effect rounded-xl border border-border/50">
              <Bell className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No reminders set. Create one to get email notifications!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reminders.map((reminder) => {
                const isPast = new Date(reminder.remind_at) < new Date();
                return (
                  <div
                    key={reminder.id}
                    className={cn(
                      "group p-4 rounded-xl glass-effect border border-border/50 hover:border-primary/30 transition-smooth",
                      reminder.is_completed && "opacity-60",
                      !reminder.is_completed && isPast && "border-amber-500/30"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleReminder(reminder.id, reminder.is_completed)}
                        className="shrink-0 mt-1 hover:scale-110 transition-transform"
                      >
                        {reminder.is_completed ? (
                          <CheckSquare className="h-5 w-5 text-primary" />
                        ) : (
                          <Square className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                        )}
                      </button>
                      <div className="flex-1 space-y-1">
                        <div className={cn(
                          "font-medium text-foreground",
                          reminder.is_completed && "line-through text-muted-foreground"
                        )}>
                          {reminder.title}
                        </div>
                        {reminder.description && (
                          <p className="text-sm text-muted-foreground">
                            {reminder.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDateTime(reminder.remind_at)}</span>
                          {!reminder.is_completed && isPast && (
                            <span className="text-amber-500 font-medium">(Email sent)</span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteReminder(reminder.id)}
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tasks Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            Quick Tasks
          </h2>

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
    </div>
  );
}