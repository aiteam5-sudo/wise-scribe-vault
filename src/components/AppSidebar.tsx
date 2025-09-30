import { useState, useEffect } from "react";
import { Folder, Search, LogOut, Plus, FolderPlus, MoreVertical, Pencil, Trash2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingFolder, setDeletingFolder] = useState<Folder | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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

  const handleRenameFolder = async () => {
    if (!editingFolder || !editFolderName.trim()) return;

    const { error } = await supabase
      .from('folders')
      .update({ name: editFolderName.trim() })
      .eq('id', editingFolder.id);

    if (error) {
      toast({
        title: "Error renaming folder",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Folder renamed",
        description: `Folder renamed to "${editFolderName}".`,
      });
      setEditDialogOpen(false);
      setEditingFolder(null);
      setEditFolderName("");
      fetchFolders();
    }
  };

  const handleDeleteFolder = async () => {
    if (!deletingFolder) return;

    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', deletingFolder.id);

    if (error) {
      toast({
        title: "Error deleting folder",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Folder deleted",
        description: `"${deletingFolder.name}" has been deleted.`,
      });
      if (selectedFolderId === deletingFolder.id) {
        onFolderSelect(null);
      }
      setDeleteDialogOpen(false);
      setDeletingFolder(null);
      fetchFolders();
    }
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
                  <div className="flex items-center w-full group">
                    <SidebarMenuButton
                      onClick={() => {
                        onFolderSelect(folder.id);
                        onViewChange('notes');
                      }}
                      isActive={selectedFolderId === folder.id}
                      className="flex-1"
                    >
                      <Folder className="h-4 w-4" style={{ color: folder.color }} />
                      <span>{folder.name}</span>
                    </SidebarMenuButton>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingFolder(folder);
                            setEditFolderName(folder.name);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setDeletingFolder(folder);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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

      {/* Edit Folder Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-folder-name">Folder Name</Label>
              <Input
                id="edit-folder-name"
                placeholder="Enter folder name"
                value={editFolderName}
                onChange={(e) => setEditFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameFolder();
                  }
                }}
              />
            </div>
            <Button
              onClick={handleRenameFolder}
              disabled={!editFolderName.trim()}
              className="w-full"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Rename Folder
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingFolder?.name}"? This will also remove all notes in this folder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFolder}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}