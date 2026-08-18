import React, { useState, useEffect } from 'react';
import { prepareAndUpload } from '../../utils/imageUpload';
import { useToastStore } from '../../store/useToastStore';
import {
  Plus,
  Edit3,
  Trash2,
  X,
  Image as ImageIcon,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Megaphone,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sliders
} from 'lucide-react';
import HeicImage from '../../components/HeicImage';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../../components/ui/sheet';

interface Banner {
  id: number;
  title: string;
  subtitle?: string;
  image_url: string;
  link?: string;
  active: boolean;
  sort_order: number;
}

interface Announcement {
  id: number;
  text: string;
  active: boolean;
  sort_order: number;
}

interface BannersManagerProps {
  banners: Banner[];
  token: string;
  onRefresh: () => void;
}

export default function BannersManager({ banners, token, onRefresh }: BannersManagerProps) {
  const showToast = useToastStore((state) => state.showToast);

  // Active section tab: 'banners' vs 'announcements'
  const [activeTab, setActiveTab] = useState<'announcements' | 'banners'>('announcements');

  // Announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementActive, setAnnouncementActive] = useState(true);
  const [announcementSort, setAnnouncementSort] = useState(0);
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);

  // Banner Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  // Banner Form states
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [link, setLink] = useState('');
  const [active, setActive] = useState(true);
  const [sortOrder, setSortOrder] = useState('0');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  // Fetch Announcements
  const loadAnnouncements = async () => {
    setAnnouncementsLoading(true);
    try {
      const res = await fetch('/api/admin/announcements', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAnnouncements(data.data);
      } else if (Array.isArray(data.results)) {
        setAnnouncements(data.results);
      }
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, [token]);

  // Open add announcement
  const handleOpenAddAnnouncement = () => {
    setEditingAnnouncement(null);
    setAnnouncementText('');
    setAnnouncementActive(true);
    setAnnouncementSort(announcements.length + 1);
    setAnnouncementModalOpen(true);
  };

  // Open edit announcement
  const handleOpenEditAnnouncement = (item: Announcement) => {
    setEditingAnnouncement(item);
    setAnnouncementText(item.text);
    setAnnouncementActive(item.active);
    setAnnouncementSort(item.sort_order || 0);
    setAnnouncementModalOpen(true);
  };

  // Save announcement (create or update)
  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) {
      showToast('error', 'Missing Text', 'Announcement message is required.');
      return;
    }

    try {
      const url = editingAnnouncement
        ? `/api/admin/announcements/${editingAnnouncement.id}`
        : '/api/admin/announcements';
      const method = editingAnnouncement ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          text: announcementText.trim(),
          active: announcementActive ? 1 : 0,
          sort_order: Number(announcementSort) || 0
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(
          'success',
          editingAnnouncement ? 'Announcement Updated' : 'Announcement Added',
          'Top store ticker will reflect the new message instantly.'
        );
        setAnnouncementModalOpen(false);
        loadAnnouncements();
      } else {
        throw new Error(data.error || 'Failed to save announcement');
      }
    } catch (err: any) {
      showToast('error', 'Save Failed', err.message || 'Could not save announcement.');
    }
  };

  // Delete announcement
  const handleDeleteAnnouncement = async (id: number) => {
    if (!window.confirm('Delete this top announcement message?')) return;
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Deleted', 'Announcement message removed.');
        loadAnnouncements();
      }
    } catch {
      showToast('error', 'Failed', 'Failed to delete announcement.');
    }
  };

  // Toggle active announcement
  const handleToggleAnnouncementActive = async (item: Announcement) => {
    try {
      const res = await fetch(`/api/admin/announcements/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          active: !item.active ? 1 : 0
        })
      });
      const data = await res.json();
      if (data.success) {
        loadAnnouncements();
        showToast('success', 'Status Updated', !item.active ? 'Announcement is now visible live.' : 'Announcement hidden.');
      }
    } catch {
      showToast('error', 'Failed', 'Could not toggle status.');
    }
  };

  // Open add Banner
  const handleOpenAdd = () => {
    setEditingBanner(null);
    setTitle('');
    setSubtitle('');
    setImageUrl('');
    setLink('');
    setActive(true);
    setSortOrder('0');
    setDrawerOpen(true);
  };

  // Open edit Banner
  const handleOpenEdit = (b: Banner) => {
    setEditingBanner(b);
    setTitle(b.title);
    setSubtitle(b.subtitle || '');
    setImageUrl(b.image_url);
    setLink(b.link || '');
    setActive(b.active);
    setSortOrder(b.sort_order.toString());
    setDrawerOpen(true);
  };

  // File Upload Helper
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingImage(true);
    setUploadStatus('Preparing...');
    try {
      const result = await prepareAndUpload(e.target.files, token, (step, current, total) => {
        if (step === 'converting') {
          const pct = total > 0 ? Math.round((current / total) * 100) : 0;
          setUploadStatus(`Converting... ${pct}%`);
        } else if (step === 'uploading') {
          const pct = total > 0 ? Math.round((current / total) * 100) : 0;
          setUploadStatus(`Uploading... ${pct}%`);
        }
      });
      setImageUrl(result.urls[0]);
      showToast('success', 'Banner Uploaded', 'Image uploaded successfully.');
    } catch (err: any) {
      showToast('error', 'Upload Failed', err?.message || 'Failure occurred during image upload.');
    } finally {
      setUploadingImage(false);
      setUploadStatus('');
      if (e.target) e.target.value = '';
    }
  };

  // Submit Banner Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !imageUrl) {
      showToast('error', 'Missing Fields', 'Banner Title and Image URL are required.');
      return;
    }

    const payload = {
      title,
      subtitle: subtitle || null,
      image_url: imageUrl,
      link: link || null,
      active,
      sort_order: parseInt(sortOrder) || 0,
    };

    try {
      const url = editingBanner ? `/api/admin/banners/${editingBanner.id}` : '/api/admin/banners';
      const method = editingBanner ? 'PUT' : 'POST';

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
        showToast(
          'success',
          editingBanner ? 'Banner Updated' : 'Banner Created',
          `"${title}" is updated in database.`
        );
        setDrawerOpen(false);
        onRefresh();
      } else {
        throw new Error(data.error || 'Server rejected request');
      }
    } catch (err: any) {
      showToast('error', 'Submission Failed', err.message || 'Failed to save banner.');
    }
  };

  // Delete Banner
  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this banner from homepage?')) return;
    try {
      const res = await fetch(`/api/admin/banners/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Banner Deleted', 'Banner removed from database.');
        onRefresh();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      showToast('error', 'Deletion Error', err.message || 'Failed to delete banner.');
    }
  };

  return (
    <div className="space-y-3 antialiased font-sans">
      {/* Top Header Card with Segmented Switcher */}
      <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              onClick={() => setActiveTab('announcements')}
              className={`h-8 px-3.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'announcements'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Top Announcement Bar Ticker</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 font-mono">
                {announcements.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('banners')}
              className={`h-8 px-3.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'banners'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Hero Slider Banners</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 font-mono">
                {banners.length}
              </span>
            </button>
          </div>

          {/* Action Button */}
          {activeTab === 'announcements' ? (
            <Button
              onClick={handleOpenAddAnnouncement}
              size="sm"
              className="h-8 px-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Announcement Text
            </Button>
          ) : (
            <Button
              onClick={handleOpenAdd}
              size="sm"
              className="h-8 px-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Hero Banner
            </Button>
          )}
        </div>
      </Card>

      {/* ── SECTION 1: TOP ANNOUNCEMENT BAR TICKER ──────────────────── */}
      {activeTab === 'announcements' && (
        <div className="space-y-3">
          {/* Live Storefront Preview */}
          <Card className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200/80 dark:border-amber-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Live Storefront Header Preview
              </span>
              <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400">
                Auto-rotates at top of all pages
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-amber-100/70 dark:bg-amber-900/40 text-center font-medium text-xs text-amber-950 dark:text-amber-100 shadow-inner">
              {announcements.filter((a) => a.active).length > 0 ? (
                <span>
                  {announcements.filter((a) => a.active).map((a) => a.text).join('   •   ')}
                </span>
              ) : (
                <span className="italic text-amber-700">No active announcements visible right now.</span>
              )}
            </div>
          </Card>

          {/* Announcements List */}
          <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div>
                <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                  Active Store Announcements ({announcements.length})
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Top bar text offers, sale announcements, and coupon codes shown above website header.
                </p>
              </div>
              <button
                onClick={loadAnnouncements}
                className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${announcementsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              {announcements.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="min-w-0 flex-1 flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                      {item.sort_order || 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-slate-900 dark:text-white">
                        {item.text}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.2 rounded font-bold ${
                            item.active
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {item.active ? '● Live on Store' : '○ Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleAnnouncementActive(item)}
                      className="h-7 px-2.5 text-[11px] font-semibold border-slate-200 dark:border-slate-700"
                    >
                      {item.active ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEditAnnouncement(item)}
                      className="h-7 px-2 text-indigo-600 dark:text-indigo-400 border-slate-200 dark:border-slate-700"
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteAnnouncement(item.id)}
                      className="h-7 px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}

              {announcements.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs italic">
                  No announcement text created yet. Click "+ Add Announcement Text" above to create one.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── SECTION 2: HERO SLIDER BANNERS ──────────────────────────── */}
      {activeTab === 'banners' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {banners.map((b) => (
            <Card
              key={b.id}
              className="overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex flex-col justify-between group hover:shadow-md transition-all"
            >
              <div>
                <div className="relative aspect-[16/9] bg-slate-100 dark:bg-slate-800 overflow-hidden border-b border-slate-100 dark:border-slate-800">
                  <HeicImage
                    src={b.image_url}
                    alt={b.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Badge variant={b.active ? 'success' : 'secondary'} className="text-[10px]">
                      {b.active ? 'Live' : 'Hidden'}
                    </Badge>
                  </div>
                </div>

                <div className="p-3 space-y-1">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">{b.title}</h4>
                  {b.subtitle && <p className="text-[11px] text-slate-500 line-clamp-1">{b.subtitle}</p>}
                </div>
              </div>

              <div className="p-3 pt-0 border-t border-slate-100 dark:border-slate-800/60 mt-2 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400">Order #{b.sort_order}</span>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" onClick={() => handleOpenEdit(b)} className="h-7 px-2">
                    <Edit3 className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(b.id)}
                    className="h-7 px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── MODAL: EDIT / ADD ANNOUNCEMENT ──────────────────────────── */}
      {announcementModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {editingAnnouncement ? 'Edit Store Announcement' : 'Add New Store Announcement'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Change the text shown on top header bar of the storefront.
                </p>
              </div>
              <button
                onClick={() => setAnnouncementModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAnnouncement} className="p-4 space-y-3.5 text-xs">
              <div>
                <Label className="font-bold text-slate-700 dark:text-slate-300">
                  Announcement Message / Text *
                </Label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. 🎉 NEW ARRIVALS — Summer Collection is Live!"
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  className="mt-1 text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  You can include emojis (e.g. 🎉, 🚚, 🏷️, ✨) to make it attractive.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-bold text-slate-700 dark:text-slate-300">Sort Priority (Order)</Label>
                  <Input
                    type="number"
                    value={announcementSort}
                    onChange={(e) => setAnnouncementSort(Number(e.target.value))}
                    className="mt-1 text-xs"
                  />
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="announcementActiveCheck"
                    checked={announcementActive}
                    onChange={(e) => setAnnouncementActive(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                  />
                  <Label htmlFor="announcementActiveCheck" className="font-semibold text-xs cursor-pointer">
                    Show Live on Website
                  </Label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAnnouncementModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                  Save Announcement
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ── DRAWER: EDIT / ADD HERO BANNER ──────────────────────────── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-sm font-bold">
              {editingBanner ? 'Edit Hero Banner' : 'Create New Hero Banner'}
            </SheetTitle>
            <SheetDescription className="text-xs">
              Upload promotional banners shown on the main homepage slider.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-3.5 mt-4 text-xs">
            <div>
              <Label className="font-bold">Banner Headline / Title *</Label>
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Elevate Every Step"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="font-bold">Subtitle / Tagline</Label>
              <Input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Handcrafted Luxury Collection"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="font-bold">Banner Image *</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="mt-1"
              />
              {uploadingImage && <p className="text-[10px] text-indigo-600 mt-1">{uploadStatus}</p>}
              {imageUrl && (
                <div className="mt-2 aspect-[16/9] rounded-lg overflow-hidden border border-slate-200">
                  <HeicImage src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div>
              <Label className="font-bold">Redirect URL / Link</Label>
              <Input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="/shop?cat=heels"
                className="mt-1"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="bannerActiveCheck"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600"
              />
              <Label htmlFor="bannerActiveCheck" className="font-semibold cursor-pointer">
                Banner is Active on Homepage
              </Label>
            </div>

            <Button type="submit" className="w-full mt-4 text-xs font-bold">
              Save Banner
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
