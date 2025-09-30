import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SendNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteTitle: string;
  noteContent: string;
}

export function SendNoteDialog({ open, onOpenChange, noteTitle, noteContent }: SendNoteDialogProps) {
  const [recipients, setRecipients] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!recipients.trim()) {
      toast({
        title: "No recipients",
        description: "Please enter at least one email address.",
        variant: "destructive",
      });
      return;
    }

    const emailList = recipients.split(/[,;\s]+/).filter(email => email.trim());
    
    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-note-email", {
        body: {
          recipients: emailList,
          noteTitle,
          noteContent,
          message: message.trim(),
        },
      });

      if (error) throw error;

      toast({
        title: "Email sent",
        description: `Note sent to ${emailList.length} recipient${emailList.length > 1 ? 's' : ''}`,
      });
      
      setRecipients("");
      setMessage("");
      onOpenChange(false);
    } catch (error: any) {
      const errorMessage = error.message || "An unexpected error occurred";
      const isDomainVerificationError = errorMessage.includes("verify your domain") || errorMessage.includes("verify a domain");
      
      toast({
        title: "Failed to send email",
        description: isDomainVerificationError 
          ? "Please verify your domain at resend.com/domains to send emails to any recipient."
          : errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Note via Email</DialogTitle>
          <DialogDescription>
            Send "{noteTitle}" to one or more email addresses
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Recipients</label>
            <Input
              placeholder="email@example.com, another@example.com"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              disabled={isSending}
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple emails with commas or spaces
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Message (optional)</label>
            <Textarea
              placeholder="Add a personal message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              disabled={isSending}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
