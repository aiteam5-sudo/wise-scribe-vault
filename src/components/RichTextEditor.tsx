import React, { useRef, useEffect } from "react";
import { RichTextToolbar } from "./RichTextToolbar";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const RichTextEditor = ({ 
  value, 
  onChange, 
  placeholder = "Start typing...",
  className = ""
}: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleFormat = (command: string, value?: string) => {
    if (!editorRef.current) return;

    editorRef.current.focus();

    if (command === "fontFamily") {
      // Apply Tailwind font class
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const span = document.createElement("span");
        span.className = value || "";
        try {
          range.surroundContents(span);
          handleInput();
        } catch (e) {
          console.error("Could not apply font:", e);
        }
      }
    } else if (command === "fontSize") {
      // Apply Tailwind size class
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const span = document.createElement("span");
        span.className = value || "";
        try {
          range.surroundContents(span);
          handleInput();
        } catch (e) {
          console.error("Could not apply size:", e);
        }
      }
    } else {
      // Standard formatting commands
      document.execCommand(command, false, value);
      handleInput();
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  return (
    <div className={`border rounded-md overflow-hidden ${className}`}>
      <RichTextToolbar onFormat={handleFormat} />
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        className="min-h-[400px] p-4 focus:outline-none prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground"
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
        }
        [contenteditable]:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
};
