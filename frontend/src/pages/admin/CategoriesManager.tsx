import React, { useState } from 'react';
import { useToastStore } from '../../store/useToastStore';
import { Plus, Edit3, Trash2, X, Search, Tags, Image as ImageIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../../components/ui/sheet';

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  sort_order: number;
  active: boolean;
}

interface CategoriesManagerProps {
  categories: Category[];
  token: string;
  onRefresh: () => void;
}

export default function CategoriesManager({ categories, token, onRefresh }: CategoriesManagerProps) {
  const showToast = useToastStore((state) => state.showToast);
  const [searchQuery, setSearchQuery] = useState('');

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form states
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catImageUrl, setCatImageUrl] = useState('');
  const [catSortOrder, setCatSortOrder] = useState('0');
  const [catActive, setCatActive] = useState(true);

  // Filter categories
  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Open add
  const handleOpenAdd = () => {
    setEditingCategory(null);
    setCatName('');
    setCatSlug('');
    setCatDescription('');
    setCatImageUrl('');
    setCatSortOrder('0');
    setCatActive(true);
    setDrawerOpen(true);
  };

  // Open edit
  const handleOpenEdit = (c: Category) => {
    setEditingCategory(c);
    setCatName(c.name);
    setCatSlug(c.slug);
    setCatDescription(c.description || '');
    setCatImageUrl(c.image_url || '');
    setCatSortOrder(c.sort_order.toString());
    setCatActive(c.active);
    setDrawerOpen(true);
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName || !catSlug) {
      showToast('error', 'Missing Fields', 'Category Name and Slug are required.');
      return;
    }

    const payload = {
      name: catName.trim(),
      slug: catSlug.trim().toLowerCase(),
      description: catDescription.trim(),
      image_url: catImageUrl.trim(),
      sort_order: parseInt(catSortOrder) || 0,
      active: catActive,
    };

    try {
      const url = editingCategory ? `/api/admin/categories/${editingCategory.id}` : '/api/admin/categories';
      const method = editingCategory ? 'PUT' : 'POST';

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
        showToast('success', 'Category Saved', `Category '${catName}' recorded.`);
        setDrawerOpen(false);
        onRefresh();
      } else {
        showToast('error', 'Sync Failed', data.error || 'Server rejected changes.');
      }
    } catch {
      showToast('error', 'Network Error', 'Failed to connect to category database.');
    }
  };

  // Delete category
  const handleDelete = async (id: number) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this category? Products linked to it will not be deleted, but category links will break.'
      )
    )
      return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Category Purged', 'Category removed successfully.');
        onRefresh();
      } else {
        showToast('error', 'Delete Denied', data.error || 'Access denied.');
      }
    } catch {
      showToast('error', 'Sync Failure', 'Failed to submit delete query.');
    }
  };

  return (
    <div className="space-y-5 antialiased">
      {/* Top Header Card */}
      <Card className="p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Tags className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Categories & Collections
          </CardTitle>
          <CardDescription>
            Organize catalog groupings, navigation taxonomy, and banner links
          </CardDescription>
        </div>

        <Button onClick={handleOpenAdd} className="text-xs font-bold">
          <Plus className="w-4 h-4 mr-1" /> Add Category
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
            placeholder="Search categories by name or slug..."
            className="pl-9 text-xs"
          />
        </div>

        <span className="text-xs text-slate-500 font-medium">
          {filtered.length} categories configured
        </span>
      </Card>

      {/* Category List Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 text-center">Order</TableHead>
              <TableHead>Category Name</TableHead>
              <TableHead>Slug Identifier</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((cat) => (
              <TableRow key={cat.id}>
                <TableCell className="text-center font-mono font-bold text-xs text-slate-400">
                  {cat.sort_order}
                </TableCell>

                <TableCell className="font-semibold text-slate-900 dark:text-white text-xs">
                  {cat.name}
                </TableCell>

                <TableCell>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    /{cat.slug}
                  </Badge>
                </TableCell>

                <TableCell className="text-slate-500 max-w-xs truncate text-xs">
                  {cat.description || '—'}
                </TableCell>

                <TableCell>
                  <Badge variant={cat.active ? 'success' : 'outline'}>
                    {cat.active ? 'Active' : 'Disabled'}
                  </Badge>
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(cat)}
                      title="Edit Category"
                      className="text-slate-500 hover:text-indigo-600"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(cat.id)}
                      title="Delete Category"
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
                  No categories found matching criteria.
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
            <SheetTitle>{editingCategory ? 'Modify Category' : 'Create Category'}</SheetTitle>
            <SheetDescription>Configure taxonomy and navigation parameters</SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-4 my-4 text-xs">
            <div>
              <Label className="mb-1">Category Title *</Label>
              <Input
                type="text"
                required
                value={catName}
                onChange={(e) => {
                  setCatName(e.target.value);
                  if (!editingCategory) {
                    setCatSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)/g, '')
                    );
                  }
                }}
                placeholder="e.g. Leather Boots"
              />
            </div>

            <div>
              <Label className="mb-1">Slug URL *</Label>
              <Input
                type="text"
                required
                value={catSlug}
                onChange={(e) => setCatSlug(e.target.value)}
                placeholder="e.g. leather-boots"
                className="font-mono"
              />
            </div>

            <div>
              <Label className="mb-1">Description</Label>
              <Textarea
                rows={3}
                value={catDescription}
                onChange={(e) => setCatDescription(e.target.value)}
                placeholder="Brief category overview for SEO..."
              />
            </div>

            <div>
              <Label className="mb-1">Category Cover Image URL</Label>
              <Input
                type="url"
                value={catImageUrl}
                onChange={(e) => setCatImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1">Display Sort Order</Label>
                <Input
                  type="number"
                  value={catSortOrder}
                  onChange={(e) => setCatSortOrder(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div>
                <Label className="mb-1">Visibility State</Label>
                <select
                  value={catActive ? 'true' : 'false'}
                  onChange={(e) => setCatActive(e.target.value === 'true')}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="true">Active (Visible in Store)</option>
                  <option value="false">Disabled (Hidden)</option>
                </select>
              </div>
            </div>

            <Button type="submit" className="w-full py-2.5 font-bold text-xs">
              Save Category Information
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
