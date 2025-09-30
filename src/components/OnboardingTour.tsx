import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingTourProps {
  userId: string;
}

const tourSteps = [
  {
    title: "Welcome to NoteWise! 👋",
    description: "Let's take a quick tour of all the amazing features. You can skip anytime.",
    target: null,
  },
  {
    title: "Sidebar Navigation",
    description: "Access all your folders, notes, tasks, and settings from the sidebar.",
    target: "sidebar",
  },
  {
    title: "Create & Edit Notes",
    description: "Click the + button to create new notes. Your notes auto-save as you type.",
    target: "notes-list",
  },
  {
    title: "AI-Powered Features",
    description: "Use the AI Summarize button to get instant summaries and extract action items from your notes.",
    target: "editor",
  },
  {
    title: "Voice Transcription",
    description: "Click the microphone icon to record audio and transcribe it into text automatically.",
    target: "editor",
  },
  {
    title: "Sticky Notes Board",
    description: "Create colorful sticky notes for quick thoughts and reminders. Access it from the sidebar.",
    target: "sidebar",
  },
  {
    title: "Meet Zeel - Your AI Assistant",
    description: "Click the chat button to talk with Zeel. Ask questions, create quizzes, or generate notes on any topic!",
    target: "ai-chat",
  },
  {
    title: "Search Everything",
    description: "Use the powerful search to find any note, task, or content across your workspace.",
    target: "search",
  },
  {
    title: "Tasks & Reminders",
    description: "Create tasks with due dates and get email reminders. View them in the Tasks section.",
    target: "tasks",
  },
  {
    title: "Auto-Organize",
    description: "Use the Auto-Organize feature to automatically sort your notes into smart folders.",
    target: "organize",
  },
  {
    title: "You're All Set! 🎉",
    description: "Start creating amazing notes. Enjoy all the features and feel free to explore!",
    target: null,
  },
];

export function OnboardingTour({ userId }: OnboardingTourProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if user has seen the tour
    const tourCompleted = localStorage.getItem(`tour_completed_${userId}`);
    if (!tourCompleted) {
      // Delay to let the page load
      setTimeout(() => setIsActive(true), 1000);
    }
  }, [userId]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem(`tour_completed_${userId}`, "true");
    setIsActive(false);
  };

  if (!isActive) return null;

  const step = tourSteps[currentStep];
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm" />
      
      {/* Tour Card */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
        <Card className={cn(
          "w-full max-w-md p-6 shadow-2xl border-2 border-primary/20",
          "animate-in fade-in zoom-in duration-300"
        )}>
          {/* Progress Bar */}
          <div className="w-full h-2 bg-muted rounded-full mb-6">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Content */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <h3 className="text-2xl font-bold pr-8">{step.title}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSkip}
                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <p className="text-muted-foreground text-base leading-relaxed">
              {step.description}
            </p>

            {/* Step Counter */}
            <p className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {tourSteps.length}
            </p>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>

            <Button
              onClick={currentStep === tourSteps.length - 1 ? handleComplete : handleNext}
              className="gap-2 gradient-primary"
            >
              {currentStep === tourSteps.length - 1 ? "Get Started" : "Next"}
              {currentStep !== tourSteps.length - 1 && <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
