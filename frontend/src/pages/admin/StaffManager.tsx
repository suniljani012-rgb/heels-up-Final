import React, { useState } from 'react';
import { useToastStore } from '../../store/useToastStore';
import { Plus, Edit3, Trash2, X, Search, ShieldCheck, UserCheck, Key, Shield } from 'lucide-react';

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

  const getRoleBadge = (roleStr: string) => {
    switch (roleStr) {
      case 'admin':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 border-purple-200/60 dark:border-purple-800/60';
      case 'manager':
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800/60';
      case 'pos':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200/60 dark:border-blue-800/60';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-5 antialiased">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Staff Accounts & Role Governance
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage administrative team members, grant role scopes, and configure two-factor enforcement
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" /> Register Staff
        </button>
      </div>

      {/* Filter Row */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff by email, name..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {filtered.length} active staff
        </span>
      </div>

      {/* Grid List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800 font-semibold uppercase text-[10px] tracking-wider">
                <th className="p-3.5">Staff Name / ID</th>
                <th className="p-3.5">Email Address</th>
                <th className="p-3.5">Role Profile</th>
                <th className="p-3.5">2FA State</th>
                <th className="p-3.5">Access Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="p-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs shrink-0">
                        {s.name ? s.name[0].toUpperCase() : s.email[0].toUpperCase()}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {s.name || 'Anonymous User'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">UID: #{s.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">{s.email}</td>
                  <td className="p-3.5">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getRoleBadge(
                        s.role
                      )}`}
                    >
                      {s.role}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        s.two_factor_enabled
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {s.two_factor_enabled ? '2FA Active' : 'Unset'}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        s.active
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/60'
                      }`}
                    >
                      {s.active ? 'Granted' : 'Suspended'}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(s)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit Staff"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Revoke Access"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-slate-400 italic">
                    No staff credentials match criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          />
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl relative z-10 p-6 flex flex-col justify-between h-full overflow-y-auto">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  {editingStaff ? 'Modify Staff Credentials' : 'Register Staff Account'}
                </h3>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. staff@heelsup.in"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                      Role Scope
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="admin">Administrator (Full Access)</option>
                      <option value="manager">Manager (No Purges)</option>
                      <option value="pos">POS Cashier (Billing Only)</option>
                      <option value="support">Customer Support (Returns/Reviews)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                      Access Status
                    </label>
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="staffActiveCheckbox"
                        checked={active}
                        onChange={(e) => setActive(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <label
                        htmlFor="staffActiveCheckbox"
                        className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                      >
                        Access Granted
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                    {editingStaff ? 'New Password (Leave blank to keep unchanged)' : 'Account Password'}
                  </label>
                  <input
                    type="password"
                    required={!editingStaff}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
                >
                  Save Credentials
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
