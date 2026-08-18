import React, { useState } from 'react';
import { useToastStore } from '../../store/useToastStore';
import { Plus, Edit3, Trash2, X, Search, FileText, Globe, ExternalLink } from 'lucide-react';

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
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Static Pages & Legal CMS
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Publish storefront policy documents, terms of service, sizing guidelines, and about pages
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Static Page
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
            placeholder="Search pages by title or slug..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {filtered.length} published pages
        </span>
      </div>

      {/* Grid List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800 font-semibold uppercase text-[10px] tracking-wider">
                <th className="p-3.5">Page Title</th>
                <th className="p-3.5">Slug URL</th>
                <th className="p-3.5">Content Preview</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="p-3.5 font-semibold text-slate-900 dark:text-white text-xs">
                    {p.title}
                  </td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-mono text-[11px] font-bold border border-slate-200 dark:border-slate-700">
                      /{p.slug}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-500 dark:text-slate-400 max-w-sm truncate text-xs font-mono">
                    {p.content ? p.content.substring(0, 80) + '...' : '—'}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        p.active
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {p.active ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit Page"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete Page"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-slate-400 italic">
                    No CMS pages found matching criteria.
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
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl relative z-10 p-6 flex flex-col justify-between h-full overflow-y-auto">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingPage ? 'Modify Static Page' : 'Create Static Page'}
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
                    Page Headline
                  </label>
                  <input
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
                    placeholder="e.g. Return & Exchange Policy"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    required
                    value={pageSlug}
                    onChange={(e) => setPageSlug(e.target.value)}
                    placeholder="e.g. return-exchange-policy"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                    Page Body Content (Markdown / HTML Supported)
                  </label>
                  <textarea
                    rows={12}
                    required
                    value={pageContent}
                    onChange={(e) => setPageContent(e.target.value)}
                    placeholder="## Policy Overview&#10;&#10;Explain terms, customer guidelines, contact info..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none font-mono text-xs leading-relaxed"
                  />
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pageActive}
                      onChange={(e) => setPageActive(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Page Published & Live on Storefront
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
                >
                  Save Page Content
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
