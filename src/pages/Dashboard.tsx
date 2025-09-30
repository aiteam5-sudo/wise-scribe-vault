import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NoteEditor } from "@/components/NoteEditor";
import { NotesList } from "@/components/NotesList";
import { SearchView } from "@/components/SearchView";
import { useToast } from "@/components/ui/use-toast";
import type { User } from "@supabase/supabase-js";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'notes' | 'search'>('notes');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
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
        />
        <main className="flex-1 flex">
          {currentView === 'search' ? (
            <SearchView
              userId={user.id}
              onNoteSelect={(noteId) => {
                setSelectedNoteId(noteId);
                setCurrentView('notes');
              }}
            />
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
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;