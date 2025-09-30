import React from "react";
import { Button } from "@/components/ui/button";
import { 
  Bold, 
  Italic, 
  Underline, 
  Type,
  Palette,
  List,
  ListOrdered,
  CheckSquare,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Indent,
  Outdent,
  Strikethrough
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface RichTextToolbarProps {
  onFormat: (command: string, value?: string) => void;
}

const FONTS = [
  { name: "Inter", value: "font-inter" },
  { name: "Roboto", value: "font-roboto" },
  { name: "Open Sans", value: "font-opensans" },
  { name: "Lato", value: "font-lato" },
  { name: "Montserrat", value: "font-montserrat" },
  { name: "Playfair Display", value: "font-playfair" },
  { name: "Merriweather", value: "font-merriweather" },
  { name: "Crimson Text", value: "font-crimson" },
  { name: "Raleway", value: "font-raleway" },
  { name: "Poppins", value: "font-poppins" },
];

const COLORS = [
  { name: "Black", value: "#000000" },
  { name: "Red", value: "#EF4444" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Green", value: "#22C55E" },
  { name: "Yellow", value: "#EAB308" },
  { name: "Purple", value: "#A855F7" },
  { name: "Pink", value: "#EC4899" },
  { name: "Orange", value: "#F97316" },
];

const SIZES = [
  { name: "Heading", value: "text-3xl" },
  { name: "Subheading", value: "text-xl" },
  { name: "Normal", value: "text-base" },
];

export const RichTextToolbar = ({ onFormat }: RichTextToolbarProps) => {
  return (
    <div className="border-b p-2 flex flex-wrap items-center gap-2 bg-muted/30">
      {/* Font Selector */}
      <Select onValueChange={(value) => onFormat("fontFamily", value)}>
        <SelectTrigger className="w-[140px] h-8">
          <SelectValue placeholder="Font" />
        </SelectTrigger>
        <SelectContent>
          {FONTS.map((font) => (
            <SelectItem key={font.value} value={font.value}>
              <span className={font.value}>{font.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Size Selector */}
      <Select onValueChange={(value) => onFormat("fontSize", value)}>
        <SelectTrigger className="w-[120px] h-8">
          <SelectValue placeholder="Size" />
        </SelectTrigger>
        <SelectContent>
          {SIZES.map((size) => (
            <SelectItem key={size.value} value={size.value}>
              {size.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="h-6 w-px bg-border mx-1" />

      {/* Text Formatting */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onFormat("bold")}
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onFormat("italic")}
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onFormat("underline")}
        title="Underline"
      >
        <Underline className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onFormat("strikeThrough")}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>

      <div className="h-6 w-px bg-border mx-1" />

      {/* Lists */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onFormat("insertUnorderedList")}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onFormat("insertOrderedList")}
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onFormat("insertUnorderedList")}
        title="Checklist"
      >
        <CheckSquare className="h-4 w-4" />
      </Button>

      <div className="h-6 w-px bg-border mx-1" />

      {/* Alignment */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onFormat("justifyLeft")}
        title="Align Left"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onFormat("justifyCenter")}
        title="Align Center"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onFormat("justifyRight")}
        title="Align Right"
      >
        <AlignRight className="h-4 w-4" />
      </Button>

      <div className="h-6 w-px bg-border mx-1" />

      {/* Indent */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onFormat("indent")}
        title="Indent"
      >
        <Indent className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onFormat("outdent")}
        title="Outdent"
      >
        <Outdent className="h-4 w-4" />
      </Button>

      <div className="h-6 w-px bg-border mx-1" />

      {/* Color Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Text Color"
          >
            <Palette className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2">
          <div className="grid grid-cols-4 gap-2">
            {COLORS.map((color) => (
              <button
                key={color.value}
                className="h-8 w-8 rounded border hover:scale-110 transition-transform"
                style={{ backgroundColor: color.value }}
                onClick={() => onFormat("foreColor", color.value)}
                title={color.name}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
