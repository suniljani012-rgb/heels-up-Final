import React, { useState } from 'react';
import { prepareAndUpload } from '../../utils/imageUpload';
import { useToastStore } from '../../store/useToastStore';
import { Plus, Edit3, Trash2, X, Image as ImageIcon, ExternalLink, Sparkles } from 'lucide-react';
import HeicImage from '../../components/HeicImage';

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
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Homepage Hero Banners & Showcase
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure storefront carousel slides, promotional banners, and campaign CTA links
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Banner
        </button>
      </div>

      {/* Grid of Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {banners.map((b) => (
          <div
            key={b.id}
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs flex flex-col group"
          >
            <div className="aspect-[21/9] bg-slate-100 dark:bg-slate-800 relative border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-center overflow-hidden">
              {b.image_url ? (
                <HeicImage
                  src={b.image_url}
                  alt={b.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <span className="text-xs font-mono text-slate-400">No image loaded</span>
              )}
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    b.active
                      ? 'bg-emerald-500/90 backdrop-blur-xs text-white border-emerald-400/40 shadow-xs'
                      : 'bg-slate-900/80 backdrop-blur-xs text-slate-300 border-slate-700'
                  }`}
                >
                  {b.active ? 'Active' : 'Draft'}
                </span>
                <span className="bg-slate-900/80 backdrop-blur-xs text-white px-2 py-0.5 rounded-full font-mono text-[10px] font-bold">
                  #{b.sort_order}
                </span>
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs line-clamp-1">
                  {b.title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                  {b.subtitle || 'No subtitle specified.'}
                </p>
                {b.link && (
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono flex items-center gap-1 truncate mt-1">
                    <ExternalLink className="w-3 h-3 shrink-0" /> {b.link}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleOpenEdit(b)}
                  className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-[10px] uppercase tracking-wider text-center transition-colors"
                >
                  Edit Banner
                </button>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="px-3 py-1.5 border border-rose-200/60 dark:border-rose-800/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold rounded-xl text-[10px] uppercase transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}

        {banners.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-400 italic bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            No homepage promotional banners configured.
          </div>
        )}
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
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingBanner ? 'Modify Banner' : 'Create Banner'}
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
                    Banner Headline
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. The Royal Jodhpur Boots Edition"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                    Subtitle / Tagline (Optional)
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="e.g. Crafted in Hand-Finished Full Grain Leather"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                    CTA Action Redirect Link (Optional)
                  </label>
                  <input
                    type="text"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="e.g. /shop?category=boots"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                      Sort Position
                    </label>
                    <input
                      type="number"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                      Visibility
                    </label>
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="bannerActiveCheckbox"
                        checked={active}
                        onChange={(e) => setActive(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <label
                        htmlFor="bannerActiveCheckbox"
                        className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                      >
                        Banner Active
                      </label>
                    </div>
                  </div>
                </div>

                {/* Banner Image Upload & URL */}
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                    Banner Image (21:9 Aspect Ratio recommended)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://media.heelsup.in/banners/..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none font-mono text-xs"
                    />
                    <label className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold uppercase rounded-xl cursor-pointer shrink-0 transition-colors">
                      {uploadingImage ? 'Uploading...' : 'Upload'}
                      <input
                        type="file"
                        accept="image/*,.heic,.heif"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                    </label>
                  </div>
                  {uploadingImage && (
                    <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 italic">
                      {uploadStatus || 'Processing...'}
                    </span>
                  )}
                  {imageUrl && (
                    <div className="aspect-[21/9] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 mt-2">
                      <HeicImage src={imageUrl} className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
                >
                  Save Banner Record
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
