import React, { useState } from 'react';
import { prepareAndUpload } from '../../utils/imageUpload';
import { useToastStore } from '../../store/useToastStore';
import { Plus, Edit3, Trash2, X, Image as ImageIcon, ExternalLink, Sparkles, RefreshCw } from 'lucide-react';
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

interface BannersManagerProps {
  banners: Banner[];
  token: string;
  onRefresh: () => void;
}

export default function BannersManager({ banners, token, onRefresh }: BannersManagerProps) {
  const showToast = useToastStore((state) => state.showToast);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [link, setLink] = useState('');
  const [active, setActive] = useState(true);
  const [sortOrder, setSortOrder] = useState('0');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  // Open add
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

  // Open edit
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

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !imageUrl) {
      showToast('error', 'Missing Fields', 'Banner Title and Image URL are required.');
      return;
    }

    const payload = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      image_url: imageUrl.trim(),
      link: link.trim(),
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
        showToast('success', 'Banner Saved', `Banner '${title}' recorded.`);
        setDrawerOpen(false);
        onRefresh();
      } else {
        showToast('error', 'Sync Failed', data.error || 'Server rejected changes.');
      }
    } catch {
      showToast('error', 'Network Error', 'Failed to connect to banner service.');
    }
  };

  // Delete banner
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this homepage banner?')) return;
    try {
      const res = await fetch(`/api/admin/banners/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Banner Purged', 'Banner removed successfully.');
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
            <ImageIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Homepage Hero Banners & Creatives
          </CardTitle>
          <CardDescription>
            Publish 21:9 responsive storefront promotional hero carousels and collection redirect CTA cards
          </CardDescription>
        </div>

        <Button onClick={handleOpenAdd} className="text-xs font-bold">
          <Plus className="w-4 h-4 mr-1" /> Add Banner
        </Button>
      </Card>

      {/* Banners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {banners.map((banner) => (
          <Card key={banner.id} className="overflow-hidden group">
            {/* Banner Image Container */}
            <div className="aspect-[21/9] bg-slate-100 dark:bg-slate-800 relative overflow-hidden border-b border-slate-100 dark:border-slate-800">
              <HeicImage
                src={banner.image_url}
                alt={banner.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <Badge variant={banner.active ? 'success' : 'outline'}>
                  {banner.active ? 'Active' : 'Disabled'}
                </Badge>
                <Badge variant="secondary" className="font-mono">
                  Order #{banner.sort_order}
                </Badge>
              </div>
            </div>

            {/* Banner Meta & Actions */}
            <div className="p-5 flex items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                  {banner.title}
                </h3>
                {banner.subtitle && (
                  <p className="text-xs text-slate-500 truncate">{banner.subtitle}</p>
                )}
                {banner.link && (
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> {banner.link}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenEdit(banner)}
                  title="Edit Banner"
                  className="text-slate-500 hover:text-indigo-600"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(banner.id)}
                  title="Delete Banner"
                  className="text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {banners.length === 0 && (
          <Card className="md:col-span-2 p-16 text-center text-slate-400 italic">
            No homepage promotional banners configured.
          </Card>
        )}
      </div>

      {/* Slide-over Drawer using Sheet */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editingBanner ? 'Modify Hero Banner' : 'Create Hero Banner'}</SheetTitle>
            <SheetDescription>Configure visual assets and target URL redirects</SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-4 my-4 text-xs">
            <div>
              <Label className="mb-1">Banner Headline Title *</Label>
              <Input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Artisanal Autumn Collection"
              />
            </div>

            <div>
              <Label className="mb-1">Subtitle / Callout Text</Label>
              <Input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Handcrafted boots with memory foam soles"
              />
            </div>

            <div>
              <Label className="mb-1">Destination URL / Route</Label>
              <Input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="/category/boots or /product/oxford-black"
                className="font-mono text-xs"
              />
            </div>

            {/* Banner Image Asset Upload & Preview */}
            <div className="space-y-2">
              <Label className="mb-1">Banner Image Asset *</Label>
              <div className="flex gap-2">
                <Input
                  type="url"
                  required
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="font-mono text-xs"
                />
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,.heic,.heif"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                  <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap">
                    {uploadingImage ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ImageIcon className="w-3.5 h-3.5" />
                    )}
                    {uploadingImage ? uploadStatus || 'Uploading...' : 'Upload'}
                  </div>
                </label>
              </div>

              {imageUrl && (
                <div className="aspect-[21/9] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 mt-2 bg-slate-50 dark:bg-slate-800">
                  <HeicImage src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1">Display Sort Order</Label>
                <Input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <Label className="mb-1">Visibility State</Label>
                <select
                  value={active ? 'true' : 'false'}
                  onChange={(e) => setActive(e.target.value === 'true')}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none text-xs"
                >
                  <option value="true">Active (Live in Carousel)</option>
                  <option value="false">Disabled (Draft / Hidden)</option>
                </select>
              </div>
            </div>

            <Button type="submit" className="w-full py-2.5 font-bold text-xs">
              Save Banner Settings
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
