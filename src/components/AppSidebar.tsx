import { useState, useEffect } from "react";
import { Folder, Search, LogOut, Plus, FolderPlus } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import type { User } from "@supabase/supabase-js";

interface Folder {
  id: string;
  name: string;
  color: string;
}

interface AppSidebarProps {
  user: User;
  onSignOut: () => void;
  onViewChange: (view: 'notes' | 'search') => void;
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
}

export function AppSidebar({ user, onSignOut, onViewChange, selectedFolderId, onFolderSelect }: AppSidebarProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchFolders();
  }, [user.id]);

  const fetchFolders = async () => {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching folders:', error);
    } else {
      setFolders(data || []);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setIsCreating(true);
    const { error } = await supabase
      .from('folders')
      .insert([{
        user_id: user.id,
        name: newFolderName.trim(),
      }]);

    if (error) {
      toast({
        title: "Error creating folder",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Folder created",
        description: `"${newFolderName}" has been created successfully.`,
      });
      setNewFolderName("");
      setDialogOpen(false);
      fetchFolders();
    }
    setIsCreating(false);
  };

  return (
    <Sidebar className="border-r">
      <SidebarTrigger className="m-4" />
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-semibold">
            NoteWise AI
          </SidebarGroupLabel>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => {
                    onFolderSelect(null);
                    onViewChange('notes');
                  }}
                  isActive={selectedFolderId === null}
                >
                  <Folder className="h-4 w-4" />
                  <span>All Notes</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => onViewChange('search')}>
                  <Search className="h-4 w-4" />
                  <span>Search</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <div className="flex items-center justify-between px-4 py-2">
            <SidebarGroupLabel>Folders</SidebarGroupLabel>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Folder</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="folder-name">Folder Name</Label>
                    <Input
                      id="folder-name"
                      placeholder="Enter folder name"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateFolder();
                        }
                      }}
                    />
                  </div>
                  <Button
                    onClick={handleCreateFolder}
                    disabled={isCreating || !newFolderName.trim()}
                    className="w-full"
                  >
                    <FolderPlus className="mr-2 h-4 w-4" />
                    Create Folder
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {folders.map((folder) => (
                <SidebarMenuItem key={folder.id}>
                  <SidebarMenuButton
                    onClick={() => {
                      onFolderSelect(folder.id);
                      onViewChange('notes');
                    }}
                    isActive={selectedFolderId === folder.id}
                  >
                    <Folder className="h-4 w-4" style={{ color: folder.color }} />
                    <span>{folder.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span className="truncate">{user.email}</span>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={onSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}