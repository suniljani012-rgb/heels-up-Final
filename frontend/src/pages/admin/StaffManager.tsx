import React, { useState } from 'react';
import { useToastStore } from '../../store/useToastStore';
import { Plus, Edit3, Trash2, X, Search, ShieldCheck, UserCheck, Key, Shield } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../../components/ui/sheet';

interface StaffUser {
  id: number;
  email: string;
  role: string;
  name?: string;
  active: boolean;
  two_factor_enabled: boolean;
  created_at: string;
}

interface StaffManagerProps {
  staff: StaffUser[];
  token: string;
  onRefresh: () => void;
}

export default function StaffManager({ staff, token, onRefresh }: StaffManagerProps) {
  const showToast = useToastStore((state) => state.showToast);
  const [searchQuery, setSearchQuery] = useState('');

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('manager');
  const [active, setActive] = useState(true);
  const [password, setPassword] = useState('');

  // Filter staff
  const filtered = staff.filter(
    (s) =>
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Open add
  const handleOpenAdd = () => {
    setEditingStaff(null);
    setEmail('');
    setName('');
    setRole('manager');
    setActive(true);
    setPassword('');
    setDrawerOpen(true);
  };

  // Open edit
  const handleOpenEdit = (s: StaffUser) => {
    setEditingStaff(s);
    setEmail(s.email);
    setName(s.name || '');
    setRole(s.role);
    setActive(s.active);
    setPassword('');
    setDrawerOpen(true);
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showToast('error', 'Missing Fields', 'Email address is required.');
      return;
    }

    const payload: any = {
      email: email.trim().toLowerCase(),
      name: name.trim(),
      role,
      active,
    };

    if (password) {
      payload.password = password;
    }

    try {
      const url = editingStaff ? `/api/admin/staff/${editingStaff.id}` : '/api/admin/staff';
      const method = editingStaff ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Staff Member Saved', `Credentials synchronized for '${email}'.`);
        setDrawerOpen(false);
        onRefresh();
      } else {
        showToast('error', 'Sync Failed', data.error || 'Server rejected changes.');
      }
    } catch {
      showToast('error', 'Network Error', 'Failed to connect to identity provider.');
    }
  };

  // Delete staff member
  const handleDelete = async (id: number) => {
    if (
      !window.confirm(
        "Are you sure you want to revoke this staff member's access permanently? They will be logged out instantly."
      )
    )
      return;
    try {
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Access Revoked', 'Staff member deleted from database.');
        onRefresh();
      } else {
        showToast('error', 'Delete Denied', data.error || 'Access denied.');
      }
    } catch {
      showToast('error', 'Sync Failure', 'Failed to submit delete query.');
    }
  };

  const getRoleVariant = (roleStr: string) => {
    switch (roleStr) {
      case 'admin':
        return 'destructive';
      case 'manager':
        return 'default';
      case 'pos':
        return 'info';
      case 'support':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-5 antialiased">
      {/* Top Header Card */}
      <Card className="p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Staff Team & Role-Based Access Control (RBAC)
          </CardTitle>
          <CardDescription>
            Manage employee administrator credentials, cash desk operators, and permission privileges
          </CardDescription>
        </div>

        <Button onClick={handleOpenAdd} className="text-xs font-bold">
          <Plus className="w-4 h-4 mr-1" /> Add Staff Member
        </Button>
      </Card>

      {/* Filter Row */}
      <Card className="p-4 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff by email or name..."
            className="pl-9 text-xs"
          />
        </div>

        <span className="text-xs text-slate-500 font-medium">
          {filtered.length} team members registered
        </span>
      </Card>

      {/* Staff Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff Member</TableHead>
              <TableHead>Email Login</TableHead>
              <TableHead>Access Role</TableHead>
              <TableHead>Two-Factor Auth</TableHead>
              <TableHead>Account Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-xs shrink-0">
                      {s.name ? s.name[0].toUpperCase() : s.email[0].toUpperCase()}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white block text-xs">
                        {s.name || 'Staff User'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">ID: #{s.id}</span>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="font-mono text-slate-600 dark:text-slate-400 text-xs">
                  {s.email}
                </TableCell>

                <TableCell>
                  <Badge variant={getRoleVariant(s.role) as any} className="uppercase font-mono text-[10px]">
                    {s.role}
                  </Badge>
                </TableCell>

                <TableCell>
                  <Badge variant={s.two_factor_enabled ? 'success' : 'outline'}>
                    {s.two_factor_enabled ? '2FA Active' : 'Unprotected'}
                  </Badge>
                </TableCell>

                <TableCell>
                  <Badge variant={s.active ? 'success' : 'outline'}>
                    {s.active ? 'Active' : 'Suspended'}
                  </Badge>
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(s)}
                      title="Edit Staff Member"
                      className="text-slate-500 hover:text-indigo-600"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(s.id)}
                      title="Revoke Access"
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-20 text-center text-slate-400 italic">
                  No staff members found matching query.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Slide-over Drawer using Sheet */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editingStaff ? 'Modify Staff Member' : 'Invite Staff Member'}</SheetTitle>
            <SheetDescription>Assign role permissions and credentials</SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-4 my-4 text-xs">
            <div>
              <Label className="mb-1">Full Name</Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Vikram Sharma"
              />
            </div>

            <div>
              <Label className="mb-1">Email Address *</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@heelsup.in"
                className="font-mono text-xs"
              />
            </div>

            <div>
              <Label className="mb-1">
                {editingStaff ? 'Change Password (leave blank to keep)' : 'Initial Password *'}
              </Label>
              <Input
                type="password"
                required={!editingStaff}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1">RBAC Role</Label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none text-xs"
                >
                  <option value="admin">Super Admin (Full Root Access)</option>
                  <option value="manager">Store Manager (Products & Orders)</option>
                  <option value="pos">POS Operator (Counter Billing Only)</option>
                  <option value="support">Customer Support (Returns & Reviews)</option>
                </select>
              </div>

              <div>
                <Label className="mb-1">Account Status</Label>
                <select
                  value={active ? 'true' : 'false'}
                  onChange={(e) => setActive(e.target.value === 'true')}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none text-xs"
                >
                  <option value="true">Active (Access Granted)</option>
                  <option value="false">Suspended (Blocked)</option>
                </select>
              </div>
            </div>

            <Button type="submit" className="w-full py-2.5 font-bold text-xs">
              Save Staff Credentials
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
