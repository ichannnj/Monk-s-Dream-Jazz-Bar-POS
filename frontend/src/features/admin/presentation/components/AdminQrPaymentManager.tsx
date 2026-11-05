import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Image, ActivityIndicator, Platform } from 'react-native';
import {
  QrCode,
  Plus,
  Trash2,
  Edit2,
  Check,
  UploadCloud,
  ExternalLink,
  ShieldCheck,
  Eye,
  AlertCircle,
} from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { AdminModal } from './AdminModal';
import { AdminInput } from './AdminInput';
import {
  qrPaymentChannelsApi,
  type QrPaymentChannel,
  type PreparedQrImage,
  prepareQrImageForUpload,
} from '@/features/checkout/data/qrPaymentChannels.api';

export const AdminQrPaymentManager: React.FC = () => {
  const [channels, setChannels] = useState<QrPaymentChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<QrPaymentChannel | null>(null);
  const [previewQrUrl, setPreviewQrUrl] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formAccountName, setFormAccountName] = useState('');
  const [formAccountNumber, setFormAccountNumber] = useState('');
  const [formDirectUrl, setFormDirectUrl] = useState('');
  const [stagedImage, setStagedImage] = useState<PreparedQrImage | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const triggerFileBrowser = () => {
    if (typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg,image/webp';
      input.style.display = 'none';
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          try {
            const prepared = await prepareQrImageForUpload(file, formName || 'qr');
            setStagedImage(prepared);
          } catch (err: any) {
            toast.error(err?.message || 'Failed to process QR image');
          }
        }
      };
      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
    }
  };

  const fetchChannels = async () => {
    setIsLoading(true);
    try {
      const data = await qrPaymentChannelsApi.fetchAllQrPaymentChannels();
      setChannels(data);
    } catch {
      toast.error('Failed to load payment QR channels', { title: 'Network Notice' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const openAddModal = () => {
    setEditingChannel(null);
    setFormName('');
    setFormAccountName("Monk's Dream Jazz Bar Corp");
    setFormAccountNumber('');
    setFormDirectUrl('');
    setStagedImage(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (ch: QrPaymentChannel) => {
    setEditingChannel(ch);
    setFormName(ch.name);
    setFormAccountName(ch.account_name);
    setFormAccountNumber(ch.account_number);
    setFormDirectUrl(ch.qr_image_url);
    setStagedImage(null);
    setIsAddModalOpen(true);
  };

  const handleSaveChannel = async () => {
    if (!formName.trim()) {
      toast.warning('Please enter a channel name (e.g. GCash, Maya, BDO)');
      return;
    }
    if (!formAccountName.trim()) {
      toast.warning('Please enter the merchant account name');
      return;
    }
    if (!formAccountNumber.trim()) {
      toast.warning('Please enter the account number or mobile number');
      return;
    }

    if (!stagedImage && !formDirectUrl.trim() && !editingChannel) {
      toast.warning('Please select or upload a QR code image');
      return;
    }

    setIsSaving(true);
    try {
      let finalQrUrl = editingChannel?.qr_image_url || formDirectUrl.trim();
      let storagePath = editingChannel?.qr_storage_path || null;

      // If a new image was staged, upload it to Supabase Storage
      if (stagedImage) {
        const uploadRes = await qrPaymentChannelsApi.uploadQrImage(stagedImage.blob, formName);
        finalQrUrl = uploadRes.publicUrl;
        storagePath = uploadRes.storagePath;
      }

      await qrPaymentChannelsApi.upsertQrPaymentChannel({
        id: editingChannel?.id,
        name: formName.trim(),
        channel_code: formName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        account_name: formAccountName.trim(),
        account_number: formAccountNumber.trim(),
        qr_image_url: finalQrUrl,
        qr_storage_path: storagePath,
        is_active: editingChannel ? editingChannel.is_active : true,
      });

      toast.success(
        editingChannel ? `Updated "${formName}" QR channel` : `Added "${formName}" QR channel`,
        { title: 'Payment Channel Saved' }
      );

      setIsAddModalOpen(false);
      fetchChannels();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save QR channel', { title: 'Save Error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (channel: QrPaymentChannel) => {
    const nextState = !channel.is_active;
    try {
      // Optimistic local update
      setChannels((prev) =>
        prev.map((c) => (c.id === channel.id ? { ...c, is_active: nextState } : c))
      );
      await qrPaymentChannelsApi.toggleChannelActive(channel.id, nextState);
      toast.info(
        `"${channel.name}" is now ${nextState ? 'ACTIVE on POS tablets' : 'INACTIVE (hidden from Floor POS)'}`
      );
    } catch {
      toast.error('Failed to toggle channel status');
      fetchChannels();
    }
  };

  const handleDelete = async (id: string, storagePath?: string | null) => {
    try {
      await qrPaymentChannelsApi.deleteQrPaymentChannel(id, storagePath);
      toast.success('Payment QR channel removed');
      setDeletingId(null);
      fetchChannels();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete channel');
    }
  };

  return (
    <View className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs space-y-4">
      {/* Section Header */}
      <View className="flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-3 gap-3">
        <View className="flex-row items-center space-x-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#800020]/10">
            <QrCode size={22} color="#800020" />
          </View>
          <View className="ml-2">
            <Text className="text-xl font-bold text-stone-900">
              Digital Wallet & QR Payment Methods
            </Text>
            <Text className="text-base text-stone-500">
              Upload merchant QR codes (GCash, Maya, QRPH, Banks) for customer tablet scanning
            </Text>
          </View>
        </View>

        <Pressable
          onPress={openAddModal}
          className="min-h-[44px] flex-row items-center justify-center rounded-xl bg-[#800020] px-4 active:opacity-90 shadow-sm"
        >
          <Plus size={18} color="#ffffff" />
          <Text className="ml-1.5 text-sm font-bold text-white">Add QR Channel</Text>
        </Pressable>
      </View>

      {/* Channels List */}
      {isLoading ? (
        <View className="py-8 items-center justify-center">
          <ActivityIndicator size="small" color="#800020" />
          <Text className="mt-2 text-sm text-stone-400">Loading payment channels...</Text>
        </View>
      ) : channels.length === 0 ? (
        <View className="py-8 items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50/50 p-6">
          <QrCode size={36} color="#a8a29e" />
          <Text className="mt-2 text-base font-bold text-stone-700">
            No QR Payment Methods Configured
          </Text>
          <Text className="mt-1 text-sm text-stone-500 text-center max-w-sm">
            Add GCash, Maya, or Bank Transfer QR codes so floor staff can collect cashless payments
            on tablets.
          </Text>
          <Pressable
            onPress={openAddModal}
            className="mt-4 min-h-[40px] flex-row items-center rounded-xl bg-[#800020] px-4 active:opacity-90"
          >
            <Plus size={16} color="#ffffff" />
            <Text className="ml-1 text-sm font-bold text-white">Add First QR Channel</Text>
          </Pressable>
        </View>
      ) : (
        <View className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {channels.map((channel) => (
            <View
              key={channel.id}
              className={`rounded-xl border p-4 transition-all ${
                channel.is_active
                  ? 'border-stone-200 bg-white shadow-xs'
                  : 'border-stone-200/60 bg-stone-50/80 opacity-75'
              }`}
            >
              <View className="flex-row items-start gap-3">
                {/* QR Thumbnail */}
                <Pressable
                  onPress={() => setPreviewQrUrl(channel.qr_image_url)}
                  className="h-20 w-20 rounded-lg border border-stone-200 bg-white p-1 items-center justify-center relative active:opacity-80 group"
                  accessibilityLabel={`View ${channel.name} QR code`}
                >
                  <Image
                    source={{ uri: channel.qr_image_url }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="contain"
                  />
                  <View className="absolute inset-0 bg-black/20 rounded-lg items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Eye size={16} color="#ffffff" />
                  </View>
                </Pressable>

                {/* Details */}
                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-bold text-stone-900 truncate">
                      {channel.name}
                    </Text>

                    {/* Active Toggle */}
                    <Pressable
                      onPress={() => handleToggleActive(channel)}
                      className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                        channel.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-stone-100 text-stone-500 border-stone-200'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          channel.is_active ? 'text-emerald-700' : 'text-stone-500'
                        }`}
                      >
                        {channel.is_active ? 'Active' : 'Inactive'}
                      </Text>
                    </Pressable>
                  </View>

                  <Text className="text-xs text-stone-500 mt-1 truncate" numberOfLines={1}>
                    {channel.account_name}
                  </Text>
                  <Text className="text-sm font-extrabold text-[#800020] font-mono mt-0.5">
                    {channel.account_number}
                  </Text>
                </View>
              </View>

              {/* Actions Footer */}
              <View className="mt-3 pt-3 border-t border-stone-100 flex-row items-center justify-between">
                <Pressable
                  onPress={() => setPreviewQrUrl(channel.qr_image_url)}
                  className="flex-row items-center text-xs text-stone-600 hover:text-stone-900"
                >
                  <ExternalLink size={13} color="#78716c" />
                  <Text className="ml-1 text-xs font-semibold text-stone-600">Scan View</Text>
                </Pressable>

                <View className="flex-row items-center gap-2">
                  <Pressable
                    onPress={() => openEditModal(channel)}
                    className="h-8 w-8 rounded-lg bg-stone-100 items-center justify-center hover:bg-stone-200 active:opacity-75"
                    accessibilityLabel="Edit channel"
                  >
                    <Edit2 size={14} color="#44403c" />
                  </Pressable>

                  <Pressable
                    onPress={() => setDeletingId(channel.id)}
                    className="h-8 w-8 rounded-lg bg-rose-50 items-center justify-center hover:bg-rose-100 active:opacity-75"
                    accessibilityLabel="Delete channel"
                  >
                    <Trash2 size={14} color="#e11d48" />
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Add / Edit Channel Modal */}
      <AdminModal
        visible={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingChannel ? `Edit ${editingChannel.name}` : 'Add Payment QR Channel'}
        subtitle="Upload high-resolution QR photo and enter merchant account details"
        icon={<QrCode size={20} color="#800020" />}
        size="md"
        footer={
          <View className="flex-row justify-end gap-3 w-full">
            <Pressable
              onPress={() => setIsAddModalOpen(false)}
              className="min-h-[44px] px-5 rounded-xl border border-stone-200 bg-white items-center justify-center active:bg-stone-50"
            >
              <Text className="text-sm font-semibold text-stone-700">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSaveChannel}
              disabled={isSaving}
              className="min-h-[44px] px-6 rounded-xl bg-[#800020] items-center justify-center active:opacity-90 shadow-sm"
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-sm font-bold text-white">
                  {editingChannel ? 'Save Changes' : 'Create Channel'}
                </Text>
              )}
            </Pressable>
          </View>
        }
      >
        <View className="space-y-4">
          <AdminInput
            label="Payment Provider / Channel Name *"
            value={formName}
            onChangeText={setFormName}
            placeholder="e.g. GCash, Maya, BPI QRPH, UnionBank"
          />

          <AdminInput
            label="Merchant Account Name *"
            value={formAccountName}
            onChangeText={setFormAccountName}
            placeholder="Monk's Dream Jazz Bar Corp"
          />

          <AdminInput
            label="Account Number / Registered Mobile Number *"
            value={formAccountNumber}
            onChangeText={setFormAccountNumber}
            placeholder="0917-888-5299 or 0042-8881-22"
          />

          {/* QR Code Upload Card */}
          <View className="space-y-2">
            <Text className="text-sm font-bold text-stone-700">QR Code Photo *</Text>

            <View className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 p-4 items-center justify-center">
              {stagedImage || formDirectUrl ? (
                <View className="items-center">
                  <View className="h-40 w-40 rounded-xl border border-stone-200 bg-white p-2 shadow-xs mb-3">
                    <Image
                      source={{ uri: stagedImage ? stagedImage.previewUri : formDirectUrl }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="contain"
                    />
                  </View>

                  <Pressable
                    onPress={triggerFileBrowser}
                    className="min-h-[36px] px-3 rounded-lg bg-stone-200 items-center justify-center active:bg-stone-300"
                  >
                    <Text className="text-xs font-bold text-stone-800">Choose Different Photo</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={triggerFileBrowser}
                  className="items-center justify-center py-4 w-full cursor-pointer active:opacity-75"
                >
                  <View className="h-12 w-12 rounded-full bg-stone-100 items-center justify-center mb-2">
                    <UploadCloud size={24} color="#78716c" />
                  </View>
                  <Text className="text-sm font-bold text-stone-800">Click to upload QR code</Text>
                  <Text className="text-xs text-stone-500 mt-0.5">PNG, JPG, WebP up to 5MB</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </AdminModal>

      {/* Large QR Scan Preview Modal */}
      {previewQrUrl && (
        <AdminModal
          visible={Boolean(previewQrUrl)}
          onClose={() => setPreviewQrUrl(null)}
          title="QR Code Scan Preview"
          subtitle="Test camera readability on floor tablets"
          size="sm"
          footer={
            <Pressable
              onPress={() => setPreviewQrUrl(null)}
              className="w-full min-h-[44px] rounded-xl bg-stone-900 items-center justify-center active:bg-stone-800"
            >
              <Text className="text-sm font-bold text-white">Close Preview</Text>
            </Pressable>
          }
        >
          <View className="items-center justify-center py-4">
            <View className="h-64 w-64 rounded-2xl border-2 border-stone-200 bg-white p-3 shadow-md">
              <Image
                source={{ uri: previewQrUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
            </View>
          </View>
        </AdminModal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <AdminModal
          visible={Boolean(deletingId)}
          onClose={() => setDeletingId(null)}
          title="Delete Payment QR Channel?"
          subtitle="This channel will no longer be available for tablet settlements."
          size="sm"
          footer={
            <View className="flex-row justify-end gap-3 w-full">
              <Pressable
                onPress={() => setDeletingId(null)}
                className="min-h-[44px] px-5 rounded-xl border border-stone-200 bg-white items-center justify-center"
              >
                <Text className="text-sm font-semibold text-stone-700">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const target = channels.find((c) => c.id === deletingId);
                  if (target) handleDelete(target.id, target.qr_storage_path);
                }}
                className="min-h-[44px] px-6 rounded-xl bg-rose-600 items-center justify-center active:bg-rose-700"
              >
                <Text className="text-sm font-bold text-white">Delete Channel</Text>
              </Pressable>
            </View>
          }
        >
          <View className="py-2">
            <Text className="text-sm text-stone-600">
              Are you sure you want to delete this payment channel? This action cannot be undone.
            </Text>
          </View>
        </AdminModal>
      )}
    </View>
  );
};
