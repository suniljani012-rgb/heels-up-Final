// frontend/src/pages/admin/products/ProductImages.tsx
import React, { useState } from 'react';
import { UploadCloud, Trash2, RefreshCw } from 'lucide-react';
import { prepareAndUpload } from '../../../utils/imageUpload';
import { useToastStore } from '../../../store/useToastStore';
import HeicImage from '../../../components/HeicImage';

export interface ManagedImage {
  url: string;
  alt: string;
}

interface ProductImagesProps {
  images: ManagedImage[];
  onChange: (images: ManagedImage[]) => void;
  token: string;
}

export default function ProductImages({ images, onChange, token }: ProductImagesProps) {
  const showToast = useToastStore((state) => state.showToast);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setStatus('Preparing...');
    try {
      const result = await prepareAndUpload(files, token, (step, current, total) => {
        if (step.startsWith('converting') || step.startsWith('preparing')) {
          const pct = total > 0 ? Math.round((current / total) * 100) : 0;
          setStatus(`Converting image to WebP... ${pct}%`);
        } else if (step === 'uploading') {
          const pct = total > 0 ? Math.round((current / total) * 100) : 0;
          setStatus(`Uploading to R2... ${pct}%`);
        } else {
          setStatus(step);
        }
      });
      const added: ManagedImage[] = result.urls.map(url => ({ url, alt: '' }));
      onChange([...images, ...added]);
      showToast('success', 'Images Uploaded', `${added.length} image(s) uploaded.`);
    } catch (err: any) {
      showToast('error', 'Upload Failed', err?.message || 'Image upload pipeline error.');
    } finally {
      setUploading(false);
      setStatus('');
      if (e.target) e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const updateAlt = (index: number, alt: string) => {
    onChange(images.map((img, i) => (i === index ? { ...img, alt } : img)));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {images.map((img, idx) => (
          <div key={`${img.url}-${idx}`} className="space-y-1">
            <div className="aspect-square bg-neutral-50 border border-neutral-200 rounded-xl relative flex items-center justify-center group overflow-hidden">
              <HeicImage src={img.url} alt={img.alt || ''} className="w-full h-full object-contain" />
              <button type="button" onClick={() => removeImage(idx)}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white rounded-xl transition-opacity">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              value={img.alt}
              onChange={e => updateAlt(idx, e.target.value)}
              placeholder="Alt text"
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-[9px] text-neutral-700 placeholder-neutral-400 focus:outline-none"
            />
          </div>
        ))}

        <label className="aspect-square bg-neutral-50 hover:bg-neutral-100 border border-dashed border-neutral-300 rounded-xl flex flex-col items-center justify-center cursor-pointer text-neutral-400 hover:text-neutral-700 transition-colors">
          <input type="file" multiple accept="image/*,.heic,.heif" onChange={handleUpload} className="hidden" disabled={uploading} />
          {uploading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin mb-1" />
              <span className="text-[8px] font-bold font-mono text-center px-1 leading-tight">{status || 'Working...'}</span>
            </>
          ) : (
            <>
              <UploadCloud className="w-5 h-5 mb-1" />
              <span className="text-[9px] font-bold font-mono">Upload</span>
            </>
          )}
        </label>
      </div>
      <p className="text-[9px] text-neutral-400">Supports JPG, PNG, WEBP, AVIF, HEIC + more. First image is the cover photo. Images are compressed automatically.</p>
    </div>
  );
}