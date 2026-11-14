import type { TableTransferPayload } from '../../shared/infrastructure/realtime';
import { toast } from '../../shared/toast/useToastStore';
import { playTransferAlertSound } from '../../shared/infrastructure/audio';
import type { FloorAlert } from '../../../types/floor';

export const handleRealtimeTableTransferAlert = (
  payload: TableTransferPayload,
  addAlert: (alert: Omit<FloorAlert, 'id' | 'time' | 'isRead'>) => void
) => {
  playTransferAlertSound();
  const guestSuffix = payload.guestName ? ` · "${payload.guestName}"` : '';
  const prepSuffix =
    payload.prepItemsCount > 0
      ? ` (${payload.prepItemsCount} item${payload.prepItemsCount === 1 ? '' : 's'} in prep)`
      : '';
  toast.info(
    `🔁 ${payload.originTableCode} ➔ ${payload.targetTableCode}${guestSuffix}${prepSuffix}`,
    {
      title: 'Table Relocated',
      duration: 7000,
    }
  );
  addAlert({
    title: `🔁 Table Transferred: ${payload.originTableCode} ➔ ${payload.targetTableCode}`,
    description: `Customer relocated to ${payload.targetTableCode}. Reason: ${
      payload.reason || 'Guest relocation request'
    }`,
    type: 'transfer',
    targetRef: payload.targetTableCode,
  });
};

export const handleRealtimeInventoryAlert = (
  item: any,
  addAlert: (alert: Omit<FloorAlert, 'id' | 'time' | 'isRead'>) => void
) => {
  const currentStock = parseFloat(item.current_stock) || 0;
  const minAlert = parseFloat(item.min_alert_level) || 0;
  if (currentStock <= minAlert) {
    const isDepleted = currentStock <= 0;
    addAlert({
      title: isDepleted ? `🔴 Depleted: ${item.name}` : `🟡 Low Stock: ${item.name}`,
      description: `${item.name} is down to ${currentStock.toFixed(2)} ${item.unit} (Par: ${minAlert} ${item.unit}). Orders remain active.`,
      type: 'auto_86',
      targetRef: item.id,
    });
    toast.warning(`${item.name}: ${currentStock.toFixed(2)} ${item.unit} remaining`, {
      title: isDepleted ? 'Ingredient Depleted' : 'Low Stock Warning',
    });
  }
};
