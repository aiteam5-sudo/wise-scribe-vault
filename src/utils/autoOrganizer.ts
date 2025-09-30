import { supabase } from "@/integrations/supabase/client";

export interface OrganizeResult {
  success: boolean;
  foldersCreated: number;
  notesOrganized: number;
  message: string;
}

const DEFAULT_FOLDERS = [
  { name: "Work", color: "#3b82f6", keywords: ["work", "project", "meeting", "task", "deadline", "client"] },
  { name: "Personal", color: "#10b981", keywords: ["personal", "home", "family", "health", "finance"] },
  { name: "Study", color: "#8b5cf6", keywords: ["study", "learn", "course", "education", "tutorial", "research"] },
  { name: "Ideas", color: "#f59e0b", keywords: ["idea", "brainstorm", "concept", "inspiration", "plan"] },
  { name: "Reference", color: "#06b6d4", keywords: ["reference", "documentation", "guide", "howto", "resource"] },
];

export async function autoOrganizeNotes(userId: string): Promise<OrganizeResult> {
  try {
    // Get all notes without a folder
    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .is('folder_id', null)
      .is('deleted_at', null);

    if (notesError) throw notesError;
    if (!notes || notes.length === 0) {
      return {
        success: true,
        foldersCreated: 0,
        notesOrganized: 0,
        message: "No unorganized notes found",
      };
    }

    // Create default folders if they don't exist
    const { data: existingFolders } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', userId);

    const existingFolderNames = new Set(existingFolders?.map(f => f.name.toLowerCase()) || []);
    const foldersToCreate = DEFAULT_FOLDERS.filter(
      f => !existingFolderNames.has(f.name.toLowerCase())
    );

    let foldersCreated = 0;
    const folderMap = new Map<string, string>();

    // Create missing folders
    for (const folder of foldersToCreate) {
      const { data, error } = await supabase
        .from('folders')
        .insert([{
          user_id: userId,
          name: folder.name,
          color: folder.color,
          parent_id: null,
        }])
        .select()
        .single();

      if (!error && data) {
        folderMap.set(folder.name, data.id);
        foldersCreated++;
      }
    }

    // Add existing folders to map
    existingFolders?.forEach(folder => {
      folderMap.set(folder.name, folder.id);
    });

    // Organize notes based on keywords
    let notesOrganized = 0;
    for (const note of notes) {
      const noteText = `${note.title} ${note.content || ''}`.toLowerCase();
      let bestMatch: { folder: string; score: number } | null = null;

      for (const folder of DEFAULT_FOLDERS) {
        const score = folder.keywords.filter(keyword => 
          noteText.includes(keyword.toLowerCase())
        ).length;

        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { folder: folder.name, score };
        }
      }

      if (bestMatch && folderMap.has(bestMatch.folder)) {
        await supabase
          .from('notes')
          .update({ folder_id: folderMap.get(bestMatch.folder) })
          .eq('id', note.id);
        notesOrganized++;
      }
    }

    return {
      success: true,
      foldersCreated,
      notesOrganized,
      message: `Created ${foldersCreated} folders and organized ${notesOrganized} notes`,
    };
  } catch (error: any) {
    return {
      success: false,
      foldersCreated: 0,
      notesOrganized: 0,
      message: error.message || "Failed to organize notes",
    };
  }
}
