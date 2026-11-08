import { useState, useEffect } from 'react';
import { MenuItem } from '../../../../types/floor';
import {
  validateMenuImageFile,
  prepareMenuImageForUpload,
  uploadAndRecordProductImage,
  type PreparedMenuImage,
} from '@/features/menu/data/imageUpload.service';
import { useAuthStore } from '@/features/auth';

export interface UseAdminItemImageControllerProps {
  visible: boolean;
  item: MenuItem | null;
  onClose: () => void;
  onSaveImage: (itemId: string, newImageUrl: string) => Promise<boolean>;
}

export function useAdminItemImageController({
  visible,
  item,
  onClose,
  onSaveImage,
}: UseAdminItemImageControllerProps) {
  const { currentUser } = useAuthStore();
  const [imageUrl, setImageUrl] = useState<string>('');
  const [stagedImage, setStagedImage] = useState<PreparedMenuImage | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasImageLoadError, setHasImageLoadError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');

  const triggerFileBrowser = () => {
    if (typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp';
      input.style.display = 'none';
      input.onchange = (e: any) => {
        const f = e.target?.files?.[0];
        if (f) handleFileSelection(f);
      };
      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
    }
  };

  useEffect(() => {
    if (item) {
      setImageUrl(item.imageUrl || '');
      setStagedImage(null);
      setHasImageLoadError(false);
      setErrorMessage(null);
    }
  }, [item, visible]);

  useEffect(() => {
    return () => {
      if (stagedImage?.previewUri && stagedImage.previewUri.startsWith('blob:')) {
        URL.revokeObjectURL(stagedImage.previewUri);
      }
    };
  }, [stagedImage]);

  const handleFileSelection = async (file: File | Blob) => {
    if (!item) return;
    setErrorMessage(null);
    setHasImageLoadError(false);

    const validation = validateMenuImageFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid file');
      return;
    }

    try {
      const prepared = await prepareMenuImageForUpload(file, item.name);
      setStagedImage(prepared);
      setImageUrl('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to process image');
    }
  };

  const handleSave = async () => {
    if (!item || isSaving) return;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      let finalUrl = imageUrl.trim();

      if (stagedImage) {
        const uploadRes = await uploadAndRecordProductImage(item.id, stagedImage, currentUser?.id);
        if (!uploadRes.success) {
          setErrorMessage(uploadRes.error || 'Failed to upload image');
          setIsSaving(false);
          return;
        }
        finalUrl = uploadRes.publicUrl || '';
      }

      const success = await onSaveImage(item.id, finalUrl);
      if (success) {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save product image');
    } finally {
      setIsSaving(false);
    }
  };

  const clearImage = () => {
    setImageUrl('');
    setStagedImage(null);
    setHasImageLoadError(false);
  };

  const selectPreset = (url: string) => {
    setImageUrl(url);
    setStagedImage(null);
    setHasImageLoadError(false);
  };

  const displayUri = stagedImage ? stagedImage.previewUri : imageUrl;

  return {
    imageUrl,
    setImageUrl,
    stagedImage,
    isSaving,
    hasImageLoadError,
    setHasImageLoadError,
    errorMessage,
    activeTab,
    setActiveTab,
    displayUri,
    triggerFileBrowser,
    handleSave,
    clearImage,
    selectPreset,
  };
}
