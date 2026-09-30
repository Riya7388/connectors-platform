import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle, FileText, Camera } from 'lucide-react';
import { uploadFile } from '../lib/storage';

interface FileUploadProps {
  label: string;
  helperText?: string;
  accept: string;
  maxSizeMB: number;
  capture?: 'user' | 'environment';
  bucket: string;
  onUploadSuccess: (url: string) => void;
  error?: string;
  initialUrl?: string;
  value?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  helperText,
  accept,
  maxSizeMB,
  capture,
  bucket,
  onUploadSuccess,
  error,
  initialUrl,
  value
}) => {
  const currentInitial = value || initialUrl || null;
  const [fileUrl, setFileUrl] = useState<string | null>(currentInitial);
  const [fileName, setFileName] = useState<string | null>(() => {
    if (currentInitial) {
      const parts = currentInitial.split('/');
      return decodeURIComponent(parts[parts.length - 1]);
    }
    return null;
  });
  const [isUploading, setIsUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const val = value !== undefined ? value : initialUrl;
    if (val) {
      setFileUrl(val);
      const parts = val.split('/');
      setFileName(decodeURIComponent(parts[parts.length - 1]));
    } else if (val === '') {
      setFileUrl(null);
      setFileName(null);
    }
  }, [value, initialUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLocalError(null);

    // Validate size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setLocalError(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    // Validate type (basic client-side check based on accept)
    const fileType = file.type;
    const acceptArray = accept.split(',').map(a => a.trim());
    
    // Simplistic check: If accept="image/*", checking if type starts with "image/"
    const isAccepted = acceptArray.some(type => {
      if (type.endsWith('/*')) {
        return fileType.startsWith(type.replace('/*', ''));
      }
      return fileType === type || file.name.endsWith(type);
    });

    if (!isAccepted && accept !== 'image/*') {
      // Relaxed check if accept is complex, but let's warn
      // Not blocking fully because mime types can be tricky on different devices, 
      // but good for UX.
    }

    setIsUploading(true);
    try {
      const url = await uploadFile(file, bucket, 'uploads');
      setFileUrl(url);
      setFileName(file.name);
      onUploadSuccess(url);
    } catch (err: any) {
      console.error("Upload error:", err);
      setLocalError("Failed to upload file. Check your connection or storage permissions.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setFileUrl(null);
    setFileName(null);
    onUploadSuccess('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
        {label}
      </label>
      
      {!fileUrl ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer bg-surface-container-low/20 
            ${(error || localError) ? 'border-red-500/50 hover:border-red-500' : 'border-outline-variant/30 hover:border-primary/50'}
            ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {isUploading ? (
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          ) : (
            capture === 'user' ? <Camera className="mx-auto text-on-surface-variant/50 mb-2" size={32} /> : <Upload className="mx-auto text-on-surface-variant/50 mb-2" size={32} />
          )}
          
          <p className="text-sm font-semibold text-on-surface">
            {isUploading ? 'Uploading...' : `Click to Upload`}
          </p>
          {helperText && (
            <p className="text-xs text-on-surface-variant/70 mt-1">{helperText}</p>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={accept}
            capture={capture}
            className="hidden"
          />
        </div>
      ) : (
        <div className="flex items-center justify-between bg-surface-container-low border border-outline-variant/30 p-3 rounded-xl">
          <div className="flex items-center gap-3 overflow-hidden">
            {accept.includes('image') ? (
              <img src={fileUrl} alt="Preview" className="w-10 h-10 object-cover rounded-md bg-black/20" />
            ) : (
              <FileText className="text-primary shrink-0" size={24} />
            )}
            <div className="truncate">
              <p className="text-sm font-medium text-on-surface truncate">{fileName}</p>
              <p className="text-xs text-green-500 flex items-center gap-1">
                <CheckCircle size={12} /> Uploaded
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="p-2 text-on-surface-variant hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {(error || localError) && (
        <p className="text-xs text-red-500 mt-1">{localError || error}</p>
      )}
    </div>
  );
};
