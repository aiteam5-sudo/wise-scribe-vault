import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Sparkles, Mic, FolderOpen } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-4xl text-center space-y-8">
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="p-4 rounded-2xl bg-primary/10">
              <BookOpen className="h-16 w-16 text-primary" />
            </div>
          </div>
          <h1 className="text-5xl font-bold tracking-tight">
            NoteWise AI
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your intelligent note-taking companion. Capture thoughts with voice, organize with folders, and let AI help you summarize and extract action items.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
          <div className="p-6 rounded-xl bg-card border space-y-2">
            <Mic className="h-8 w-8 text-primary mx-auto" />
            <h3 className="font-semibold">Voice Recording</h3>
            <p className="text-sm text-muted-foreground">
              Record your thoughts and get instant transcription
            </p>
          </div>
          <div className="p-6 rounded-xl bg-card border space-y-2">
            <Sparkles className="h-8 w-8 text-accent mx-auto" />
            <h3 className="font-semibold">AI Summaries</h3>
            <p className="text-sm text-muted-foreground">
              Get summaries and action items automatically
            </p>
          </div>
          <div className="p-6 rounded-xl bg-card border space-y-2">
            <FolderOpen className="h-8 w-8 text-primary mx-auto" />
            <h3 className="font-semibold">Smart Organization</h3>
            <p className="text-sm text-muted-foreground">
              Organize notes in folders with powerful search
            </p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="text-lg px-8"
          >
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
