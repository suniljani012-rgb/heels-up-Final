import React, { useState } from 'react';
import { useToastStore } from '../../store/useToastStore';
import { Plus, Edit3, Trash2, X, Search, FileText, Globe, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../../components/ui/sheet';

interface PageConfig {
  id: number;
  title: string;
  slug: string;
  content: string;
  active: boolean;
}

interface PagesManagerProps {
  pages: PageConfig[];
  token: string;
  onRefresh: () => void;
}

export default function PagesManager({ pages, token, onRefresh }: PagesManagerProps) {
  const showToast = useToastStore((state) => state.showToast);
  const [searchQuery, setSearchQuery] = useState('');

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<PageConfig | null>(null);

  // Form states
  const [pageTitle, setPageTitle] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [pageContent, setPageContent] = useState('');
  const [pageActive, setPageActive] = useState(true);

  // Filter pages
  const filtered = pages.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Open add
  const handleOpenAdd = () => {
    setEditingPage(null);
    setPageTitle('');
    setPageSlug('');
    setPageContent('');
    setPageActive(true);
    setDrawerOpen(true);
  };

  // Open edit
  const handleOpenEdit = (p: PageConfig) => {
    setEditingPage(p);
    setPageTitle(p.title);
    setPageSlug(p.slug);
    setPageContent(p.content || '');
    setPageActive(p.active);
    setDrawerOpen(true);
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageTitle || !pageSlug) {
      showToast('error', 'Missing Fields', 'Page Title and Slug are required.');
      return;
    }

    const payload = {
      title: pageTitle.trim(),
      slug: pageSlug.trim().toLowerCase(),
      content: pageContent.trim(),
      active: pageActive,
    };

    try {
      const url = editingPage ? `/api/admin/pages/${editingPage.id}` : '/api/admin/pages';
      const method = editingPage ? 'PUT' : 'POST';

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
        showToast('success', 'Page Saved', `Page '${pageTitle}' recorded.`);
        setDrawerOpen(false);
        onRefresh();
      } else {
        showToast('error', 'Sync Failed', data.error || 'Server rejected changes.');
      }
    } catch {
      showToast('error', 'Network Error', 'Failed to connect to static page database.');
    }
  };

  // Delete page
  const handleDelete = async (id: number) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this static page? Storefront links to this slug will return 404.'
      )
    )
      return;
    try {
      const res = await fetch(`/api/admin/pages/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Page Purged', 'Static page removed successfully.');
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
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Static Pages & Legal CMS
          </CardTitle>
          <CardDescription>
            Publish storefront policy documents, terms of service, sizing guidelines, and about pages
          </CardDescription>
        </div>

        <Button onClick={handleOpenAdd} className="text-xs font-bold">
          <Plus className="w-4 h-4 mr-1" /> Add Static Page
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
            placeholder="Search pages by title or slug..."
            className="pl-9 text-xs"
          />
        </div>

        <span className="text-xs text-slate-500 font-medium">
          {filtered.length} pages published
        </span>
      </Card>

      {/* Pages Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Page Title</TableHead>
              <TableHead>Slug Endpoint</TableHead>
              <TableHead>Content Preview</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-semibold text-slate-900 dark:text-white text-xs">
                  {p.title}
                </TableCell>

                <TableCell>
                  <a
                    href={`/pages/${p.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    /{p.slug} <ExternalLink className="w-3 h-3" />
                  </a>
                </TableCell>

                <TableCell className="text-slate-500 max-w-xs truncate text-xs font-mono">
                  {p.content ? p.content.slice(0, 80) + '...' : '—'}
                </TableCell>

                <TableCell>
                  <Badge variant={p.active ? 'success' : 'outline'}>
                    {p.active ? 'Published' : 'Draft'}
                  </Badge>
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(p)}
                      title="Edit Page"
                      className="text-slate-500 hover:text-indigo-600"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(p.id)}
                      title="Delete Page"
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
                <TableCell colSpan={5} className="py-20 text-center text-slate-400 italic">
                  No static pages found matching criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Slide-over Drawer using Sheet */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{editingPage ? 'Modify Static Page' : 'Create Static Page'}</SheetTitle>
            <SheetDescription>Publish markdown-formatted content to storefront</SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-4 my-4 text-xs">
            <div>
              <Label className="mb-1">Page Title *</Label>
              <Input
                type="text"
                required
                value={pageTitle}
                onChange={(e) => {
                  setPageTitle(e.target.value);
                  if (!editingPage) {
                    setPageSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)/g, '')
                    );
                  }
                }}
                placeholder="e.g. Terms & Conditions"
              />
            </div>

            <div>
              <Label className="mb-1">Slug URL Identifier *</Label>
              <Input
                type="text"
                required
                value={pageSlug}
                onChange={(e) => setPageSlug(e.target.value)}
                placeholder="e.g. terms-and-conditions"
                className="font-mono text-xs"
              />
            </div>

            <div>
              <Label className="mb-1">Page Markdown / HTML Content</Label>
              <Textarea
                rows={12}
                value={pageContent}
                onChange={(e) => setPageContent(e.target.value)}
                placeholder="# Sizing Guide..."
                className="font-mono text-xs"
              />
            </div>

            <div>
              <Label className="mb-1">Publication Status</Label>
              <select
                value={pageActive ? 'true' : 'false'}
                onChange={(e) => setPageActive(e.target.value === 'true')}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none text-xs"
              >
                <option value="true">Published (Public)</option>
                <option value="false">Draft (Hidden)</option>
              </select>
            </div>

            <Button type="submit" className="w-full py-2.5 font-bold text-xs">
              Save Static Page
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
