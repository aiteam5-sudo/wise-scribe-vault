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
import { AIChat } from "@/components/AIChat";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'notes' | 'search' | 'tasks' | 'trash'>('notes');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("darkMode") === "true" || document.documentElement.classList.contains("dark");
    }
    return false;
  });
  const navigate = useNavigate();
  const { toast } = useToast();

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
    const darkMode = localStorage.getItem("darkMode") === "true";
    if (darkMode && !document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.add("dark");
    } else if (!darkMode && document.documentElement.classList.contains("dark")) {
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
        <AIChat />
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;