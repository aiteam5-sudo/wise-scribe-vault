import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NoteEditor } from "@/components/NoteEditor";
import { NotesList } from "@/components/NotesList";
import { EnhancedSearchView } from "@/components/EnhancedSearchView";
import { TasksList } from "@/components/TasksList";
import { TrashView } from "@/components/TrashView";
import { StickyNotesBoard } from "@/components/StickyNotesBoard";
import { EnhancedAIChat } from "@/components/EnhancedAIChat";
import { OnboardingTour } from "@/components/OnboardingTour";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'notes' | 'search' | 'tasks' | 'trash' | 'sticky'>('notes');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [currentNote, setCurrentNote] = useState<{id: string; title: string; content: string; summary?: string} | null>(null);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem("darkMode");
      // Default to light mode if not set
      if (stored === null) return false;
      return stored === "true";
    }
    return false;
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch current note data when selectedNoteId changes
  useEffect(() => {
    const fetchCurrentNote = async () => {
      if (!selectedNoteId) {
        setCurrentNote(null);
        return;
      }

      const { data, error } = await supabase
        .from('notes')
        .select('id, title, content, summary')
        .eq('id', selectedNoteId)
        .single();

      if (!error && data) {
        setCurrentNote(data);
      }
    };

    fetchCurrentNote();
  }, [selectedNoteId]);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    // Initialize dark mode on mount
    const storedDarkMode = localStorage.getItem("darkMode");
    const darkMode = storedDarkMode === "true";
    setIsDark(darkMode);
    
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDark;
    setIsDark(newDarkMode);
    localStorage.setItem("darkMode", String(newDarkMode));
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar
          user={user}
          onSignOut={handleSignOut}
          onViewChange={setCurrentView}
          selectedFolderId={selectedFolderId}
          onFolderSelect={setSelectedFolderId}
          currentView={currentView}
        />
        <main className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border/50 bg-card/30 backdrop-blur-xl flex items-center px-4 gap-3">
            <SidebarTrigger className="hover:bg-primary/10 transition-smooth" />
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="hover:bg-primary/10 hover:text-primary transition-smooth"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </header>
          <div className="flex-1 flex">
          {currentView === 'search' ? (
            <EnhancedSearchView
              userId={user.id}
              onNoteSelect={(noteId) => {
                setSelectedNoteId(noteId);
                setCurrentView('notes');
              }}
            />
          ) : currentView === 'tasks' ? (
            <TasksList userId={user.id} />
          ) : currentView === 'trash' ? (
            <TrashView userId={user.id} />
          ) : currentView === 'sticky' ? (
            <StickyNotesBoard userId={user.id} />
          ) : (
            <>
              <NotesList
                userId={user.id}
                selectedNoteId={selectedNoteId}
                onNoteSelect={setSelectedNoteId}
                folderId={selectedFolderId}
              />
              <NoteEditor
                userId={user.id}
                noteId={selectedNoteId}
                onNoteCreated={setSelectedNoteId}
              />
            </>
          )}
          </div>
        </main>
        <EnhancedAIChat userId={user.id} currentNote={currentNote} />
        <OnboardingTour userId={user.id} />
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;