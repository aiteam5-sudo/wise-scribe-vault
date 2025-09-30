import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface SearchViewProps {
  userId: string;
  onNoteSelect: (noteId: string) => void;
}

export function SearchView({ userId, onNoteSelect }: SearchViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Note[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, userId]);

  const performSearch = async () => {
    setIsSearching(true);
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setSearchResults(data);
    }
    setIsSearching(false);
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.split(regex).map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-accent text-accent-foreground rounded px-1">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="flex-1 flex flex-col p-6">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your notes..."
            className="pl-10 h-12 text-lg"
          />
        </div>

        {isSearching && (
          <p className="text-center text-muted-foreground">Searching...</p>
        )}

        {!isSearching && searchQuery && searchResults.length === 0 && (
          <p className="text-center text-muted-foreground">No results found</p>
        )}

        <div className="space-y-4">
          {searchResults.map((note) => (
            <Card
              key={note.id}
              className="p-4 cursor-pointer hover:bg-accent transition-colors"
              onClick={() => onNoteSelect(note.id)}
            >
              <h3 className="font-semibold text-lg mb-2">
                {highlightText(note.title, searchQuery)}
              </h3>
              <p className="text-muted-foreground mb-2 line-clamp-2">
                {highlightText(note.content.substring(0, 200), searchQuery)}
              </p>
              <p className="text-sm text-muted-foreground">
                Updated {formatDate(note.updated_at)}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}