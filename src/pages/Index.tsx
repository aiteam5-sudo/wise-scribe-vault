import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Sparkles, Mic, FolderOpen, Zap, Brain, Shield } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="max-w-6xl w-full text-center space-y-12 animate-fade-in">
        {/* Hero Section */}
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="relative p-6 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 shadow-glow tech-border">
              <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-100 transition-smooth rounded-3xl blur-xl" />
              <Brain className="h-20 w-20 text-primary relative z-10" />
            </div>
          </div>
          <h1 className="text-7xl font-bold tracking-tight text-foreground">
            NoteWise AI
          </h1>
          <p className="text-2xl text-foreground/80 max-w-3xl mx-auto leading-relaxed">
            Your <span className="text-primary font-semibold">intelligent</span> note-taking companion powered by cutting-edge AI. 
            Capture, organize, and amplify your thoughts.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-16">
          <div className="group p-8 rounded-2xl glass-effect hover:shadow-primary transition-smooth hover:-translate-y-1 tech-border">
            <div className="mb-4 p-3 rounded-xl bg-primary/10 w-fit mx-auto group-hover:scale-110 transition-smooth">
              <Mic className="h-10 w-10 text-primary" />
            </div>
            <h3 className="font-bold text-xl mb-2 text-foreground">Voice Recording</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Instant transcription powered by advanced speech recognition. Your voice becomes text in real-time.
            </p>
          </div>
          
          <div className="group p-8 rounded-2xl glass-effect hover:shadow-accent transition-smooth hover:-translate-y-1 tech-border">
            <div className="mb-4 p-3 rounded-xl bg-accent/10 w-fit mx-auto group-hover:scale-110 transition-smooth">
              <Sparkles className="h-10 w-10 text-accent" />
            </div>
            <h3 className="font-bold text-xl mb-2 text-foreground">AI Intelligence</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Automatic summaries, action items extraction, and semantic search. AI that understands context.
            </p>
          </div>
          
          <div className="group p-8 rounded-2xl glass-effect hover:shadow-primary transition-smooth hover:-translate-y-1 tech-border">
            <div className="mb-4 p-3 rounded-xl bg-primary/10 w-fit mx-auto group-hover:scale-110 transition-smooth">
              <FolderOpen className="h-10 w-10 text-primary" />
            </div>
            <h3 className="font-bold text-xl mb-2 text-foreground">Smart Organization</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Intelligent folder structure with powerful semantic search. Find anything, instantly.
            </p>
          </div>
        </div>

        {/* Secondary Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 p-4 rounded-xl glass-effect">
            <Zap className="h-6 w-6 text-primary flex-shrink-0" />
            <span className="text-sm text-foreground">Lightning Fast Performance</span>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl glass-effect">
            <Shield className="h-6 w-6 text-accent flex-shrink-0" />
            <span className="text-sm text-foreground">Secure & Private</span>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl glass-effect">
            <Brain className="h-6 w-6 text-primary flex-shrink-0" />
            <span className="text-sm text-foreground">AI-Powered Insights</span>
          </div>
        </div>

        {/* CTA */}
        <div className="flex gap-4 justify-center pt-8">
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="gradient-primary text-primary-foreground border-0 shadow-primary hover:shadow-glow transition-smooth text-lg px-10 py-6 group"
          >
            Get Started
            <Zap className="ml-2 h-5 w-5 group-hover:rotate-12 transition-smooth" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
