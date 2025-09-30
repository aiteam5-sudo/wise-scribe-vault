import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface EnhancedSearchViewProps {
  userId: string;
  onNoteSelect: (noteId: string) => void;
}

export const EnhancedSearchView = ({ userId, onNoteSelect }: EnhancedSearchViewProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [textResults, setTextResults] = useState<Note[]>([]);
  const [semanticResults, setSemanticResults] = useState<Note[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSemanticSearching, setIsSemanticSearching] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (searchQuery.trim()) {
      const timer = setTimeout(() => {
        performTextSearch();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setTextResults([]);
      setSemanticResults([]);
    }
  }, [searchQuery, userId]);

  const performTextSearch = async () => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", userId)
        .or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setTextResults(data || []);
    } catch (error: any) {
      toast({
        title: "Search failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const performSemanticSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSemanticSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("semantic-search", {
        body: { query: searchQuery, userId },
      });

      if (error) throw error;
      setSemanticResults(data.results || []);
    } catch (error: any) {
      toast({
        title: "Semantic search failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSemanticSearching(false);
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-accent text-accent-foreground">
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
    <div className="flex-1 p-8 overflow-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Search Notes</h1>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your notes..."
              className="pl-10 text-lg h-12"
            />
          </div>
        </div>

        <Tabs defaultValue="text" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text">
              <Search className="h-4 w-4 mr-2" />
              Text Search
            </TabsTrigger>
            <TabsTrigger value="semantic" onClick={() => performSemanticSearch()}>
              <Sparkles className="h-4 w-4 mr-2" />
              Semantic Search
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4">
            {isSearching ? (
              <p className="text-center text-muted-foreground py-8">Searching...</p>
            ) : textResults.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {searchQuery ? "No results found" : "Start typing to search"}
              </p>
            ) : (
              textResults.map((note) => (
                <Card
                  key={note.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => onNoteSelect(note.id)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {highlightText(note.title, searchQuery)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {highlightText(note.content?.slice(0, 200) || "", searchQuery)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDate(note.updated_at)}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="semantic" className="space-y-4">
            {isSemanticSearching ? (
              <p className="text-center text-muted-foreground py-8">
                AI is finding relevant notes...
              </p>
            ) : semanticResults.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {searchQuery ? "No results found" : "Enter a search query to find semantically similar notes"}
              </p>
            ) : (
              semanticResults.map((note) => (
                <Card
                  key={note.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => onNoteSelect(note.id)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{note.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {note.content?.slice(0, 200) || ""}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDate(note.updated_at)}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
