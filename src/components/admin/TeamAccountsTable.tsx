import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, KeyRound, UserPlus, Trash2, Pencil } from "lucide-react";

interface Profile {
  id: string;
  name: string;
  email: string;
  mode: string | null;
  role: string;
}

interface TeamAccountsTableProps {
  profiles: Profile[];
  onRefresh: () => void;
}

const TeamAccountsTable = ({ profiles, onRefresh }: TeamAccountsTableProps) => {
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserMode, setNewUserMode] = useState<"AI" | "DM">("AI");
  const [newUserRole, setNewUserRole] = useState<"employee" | "admin">("employee");
  const [isCreating, setIsCreating] = useState(false);
  
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editMode, setEditMode] = useState<"AI" | "DM">("AI");
  const [editRole, setEditRole] = useState<"employee" | "admin">("employee");
  const [isUpdating, setIsUpdating] = useState(false);

  const employees = profiles.filter(p => p.role === "employee");

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast.success("Email copied to clipboard");
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    setIsResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: {
          email: selectedUser.email,
          newPassword: newPassword,
        },
      });

      if (error) throw error;

      toast.success(`Password reset for ${selectedUser.name}`);
      setSelectedUser(null);
      setNewPassword("");
    } catch (error) {
      console.error('Error resetting password:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Failed to reset password: ${errorMessage}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserName || !newUserEmail || !newUserPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newUserPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          mode: newUserMode,
          role: newUserRole,
        },
      });

      if (error) throw error;

      toast.success(`User ${newUserName} created successfully`);
      setShowAddDialog(false);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserMode("AI");
      setNewUserRole("employee");
      onRefresh();
    } catch (error) {
      console.error('Error creating user:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Failed to create user: ${errorMessage}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: {
          userId: userToDelete.id,
        },
      });

      if (error) throw error;

      toast.success(`User ${userToDelete.name} deleted successfully`);
      setUserToDelete(null);
      onRefresh();
    } catch (error) {
      console.error('Error deleting user:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Failed to delete user: ${errorMessage}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditDialog = (profile: Profile) => {
    setEditUser(profile);
    setEditName(profile.name);
    setEditEmail(profile.email);
    setEditMode((profile.mode as "AI" | "DM") || "AI");
    setEditRole(profile.role as "employee" | "admin");
  };

  const handleUpdateUser = async () => {
    if (!editUser || !editName || !editEmail) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase.functions.invoke('update-user', {
        body: {
          userId: editUser.id,
          name: editName,
          email: editEmail,
          mode: editMode,
          role: editRole,
        },
      });

      if (error) throw error;

      toast.success(`User ${editName} updated successfully`);
      setEditUser(null);
      onRefresh();
    } catch (error) {
      console.error('Error updating user:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Failed to update user: ${errorMessage}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Accounts</CardTitle>
              <CardDescription>
                Manage employee login credentials. Passwords are managed by the admin.
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add New User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No team members found
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">{profile.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{profile.email}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyEmail(profile.email)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={profile.mode === "AI" ? "default" : "secondary"}>
                          {profile.mode || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {profile.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(profile)}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedUser(profile)}
                          >
                            <KeyRound className="h-4 w-4 mr-2" />
                            Reset Password
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setUserToDelete(profile)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedUser} onOpenChange={() => { setSelectedUser(null); setNewPassword(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedUser?.name} ({selectedUser?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password (min 8 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isResetting}
              />
              <p className="text-xs text-muted-foreground">
                Password must be at least 8 characters long
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setSelectedUser(null); setNewPassword(""); }}
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={isResetting || !newPassword || newPassword.length < 8}
            >
              {isResetting ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new team member account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Name</Label>
              <Input
                id="new-name"
                placeholder="Enter name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                disabled={isCreating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                placeholder="Enter email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                disabled={isCreating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-password">Password</Label>
              <Input
                id="new-user-password"
                type="password"
                placeholder="Enter password (min 8 characters)"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                disabled={isCreating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-mode">Team</Label>
              <Select value={newUserMode} onValueChange={(value: "AI" | "DM") => setNewUserMode(value)} disabled={isCreating}>
                <SelectTrigger id="new-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AI">AI</SelectItem>
                  <SelectItem value="DM">DM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-role">Role</Label>
              <Select value={newUserRole} onValueChange={(value: "employee" | "admin") => setNewUserRole(value)} disabled={isCreating}>
                <SelectTrigger id="new-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={isCreating || !newUserName || !newUserEmail || !newUserPassword || newUserPassword.length < 8}
            >
              {isCreating ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information for {editUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                placeholder="Enter name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={isUpdating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="Enter email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                disabled={isUpdating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-mode">Team</Label>
              <Select value={editMode} onValueChange={(value: "AI" | "DM") => setEditMode(value)} disabled={isUpdating}>
                <SelectTrigger id="edit-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AI">AI</SelectItem>
                  <SelectItem value="DM">DM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={editRole} onValueChange={(value: "employee" | "admin") => setEditRole(value)} disabled={isUpdating}>
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditUser(null)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateUser}
              disabled={isUpdating || !editName || !editEmail}
            >
              {isUpdating ? "Updating..." : "Update User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{userToDelete?.name}</strong> ({userToDelete?.email})? 
              This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TeamAccountsTable;