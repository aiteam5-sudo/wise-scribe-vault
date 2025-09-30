import { useState, useEffect } from "react";
import { Folder, Search, LogOut, Plus, FolderPlus, MoreVertical, Pencil, Trash2, User as UserIcon, Settings, CheckSquare, FileText, Trash, Mail, Brain, ChevronRight } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
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
  parent_id: string | null;
}

interface AppSidebarProps {
  user: User;
  onSignOut: () => void;
  onViewChange: (view: 'notes' | 'search' | 'tasks' | 'trash') => void;
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  currentView: 'notes' | 'search' | 'tasks' | 'trash';
}

export function AppSidebar({ user, onSignOut, onViewChange, selectedFolderId, onFolderSelect, currentView }: AppSidebarProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingFolder, setDeletingFolder] = useState<Folder | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [parentFolderForNew, setParentFolderForNew] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

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
        parent_id: parentFolderForNew,
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
      setParentFolderForNew(null);
      fetchFolders();
      if (parentFolderForNew) {
        setExpandedFolders(prev => new Set(prev).add(parentFolderForNew));
      }
    }
    setIsCreating(false);
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const getChildFolders = (parentId: string | null) => {
    return folders.filter(f => f.parent_id === parentId);
  };

  const renderFolder = (folder: Folder, level: number = 0) => {
    const childFolders = getChildFolders(folder.id);
    const hasChildren = childFolders.length > 0;
    const isExpanded = expandedFolders.has(folder.id);

    return (
      <div key={folder.id}>
        <SidebarMenuItem>
          <div className="flex items-center w-full group">
            {hasChildren && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 p-0 shrink-0"
                onClick={() => toggleFolder(folder.id)}
              >
                <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </Button>
            )}
            <SidebarMenuButton
              onClick={() => {
                onFolderSelect(folder.id);
                onViewChange('notes');
              }}
              isActive={selectedFolderId === folder.id}
              className="flex-1"
              style={{ paddingLeft: hasChildren ? '0.5rem' : `${level * 1 + 0.5}rem` }}
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
                    setParentFolderForNew(folder.id);
                    setDialogOpen(true);
                  }}
                >
                  <FolderPlus className="mr-2 h-4 w-4" />
                  New Subfolder
                </DropdownMenuItem>
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
        {hasChildren && isExpanded && (
          <div style={{ paddingLeft: '1rem' }}>
            {childFolders.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
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
    <Sidebar className="border-r glass-effect">
      <SidebarContent>
        {/* Logo and Gmail Section */}
        <div className="p-4 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center shadow-lg ring-2 ring-primary/20">
              <Brain className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground">
                NoteWise AI
              </h2>
              <p className="text-xs text-muted-foreground font-medium">Smart Notes</p>
            </div>
            <a 
              href={`mailto:${user.email}`}
              className="p-2 rounded-lg hover:bg-accent/20 transition-smooth shrink-0 border border-border/50"
              title="Contact via Gmail"
            >
              <Mail className="h-5 w-5 text-foreground" />
            </a>
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => {
                    onFolderSelect(null);
                    onViewChange('notes');
                  }}
                  isActive={currentView === 'notes' && selectedFolderId === null}
                  className="transition-smooth hover:bg-primary/10 hover:text-primary"
                >
                  <FileText className="h-4 w-4" />
                  <span>All Notes</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => onViewChange('tasks')}
                  isActive={currentView === 'tasks'}
                  className="transition-smooth hover:bg-primary/10 hover:text-primary"
                >
                  <CheckSquare className="h-4 w-4" />
                  <span>Tasks</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => onViewChange('trash')}
                  isActive={currentView === 'trash'}
                  className="transition-smooth hover:bg-primary/10 hover:text-primary"
                >
                  <Trash className="h-4 w-4" />
                  <span>Trash</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => onViewChange('search')}
                  className="transition-smooth hover:bg-primary/10 hover:text-primary"
                >
                  <Search className="h-4 w-4" />
                  <span>Search</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => navigate('/account')}
                  isActive={location.pathname === "/account"}
                  className="transition-smooth hover:bg-primary/10 hover:text-primary"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <div className="flex items-center justify-between px-4 py-2">
            <SidebarGroupLabel>Folders</SidebarGroupLabel>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) setParentFolderForNew(null);
            }}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {parentFolderForNew ? 'Create New Subfolder' : 'Create New Folder'}
                  </DialogTitle>
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
              {getChildFolders(null).map((folder) => renderFolder(folder))}
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