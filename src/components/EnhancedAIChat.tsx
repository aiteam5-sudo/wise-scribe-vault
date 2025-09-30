import { useState } from "react";
import { MessageSquare, X, Send, Sparkles, FileText, FolderTree, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface EnhancedAIChatProps {
  userId: string;
  onOrganizeFiles?: () => void;
}

export function EnhancedAIChat({ userId, onOrganizeFiles }: EnhancedAIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm Zeel, your AI assistant. I can help you create quizzes, generate notes on any topic, organize your files, and answer questions about NoteWise. What would you like to do?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const quickActions = [
    { label: "Create Quiz", icon: BookOpen, prompt: "Create a quiz from my latest note" },
    { label: "Generate Notes", icon: FileText, prompt: "Generate notes on World War 2" },
    { label: "Organize Files", icon: FolderTree, prompt: "Help me organize my notes and files" },
  ];

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // Check if this is an organize request
      if (userMessage.toLowerCase().includes("organize") && onOrganizeFiles) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "I'll help you organize your files! Let me analyze your notes and create appropriate folders...",
          },
        ]);
        
        setTimeout(() => {
          onOrganizeFiles();
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "I've organized your notes into folders based on their content. Check your sidebar to see the new organization!",
            },
          ]);
          setIsLoading(false);
        }, 1000);
        return;
      }

      const { data, error } = await supabase.functions.invoke("zeel-chat", {
        body: {
          message: userMessage,
          history: messages,
          userId: userId,
        },
      });

      if (error) throw error;

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to get response from Zeel",
        variant: "destructive",
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
    handleSend();
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg gradient-primary z-50 hover:scale-110 transition-smooth"
        size="icon"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-primary rounded-t-lg">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
          <h3 className="font-semibold text-primary-foreground">Zeel AI Assistant</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          className="h-8 w-8 text-primary-foreground hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-b bg-muted/30">
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Badge
              key={action.label}
              variant="outline"
              className="cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => handleQuickAction(action.prompt)}
            >
              <action.icon className="h-3 w-3 mr-1" />
              {action.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask Zeel anything..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            size="icon"
            className="gradient-primary"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
