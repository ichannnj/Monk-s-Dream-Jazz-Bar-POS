import { TableItem, CustomerTab, TakeoutOrder } from '@/types/floor';
import { DiscountType } from '../../../utils/taxAndDiscountCalculator';
import { QrPaymentChannel } from '../../../data/qrPaymentChannels.api';

export interface BillSettlementModalProps {
  visible: boolean;
  table?: TableItem | null;
  activeTab?: CustomerTab | null;
  takeoutOrder?: TakeoutOrder | null;
  takeoutCollectAfterPay?: boolean;
  onClose: () => void;
  onDeferTakeoutPayment?: () => void;
  onConfirmPayment: (
    mode: 'single_tab' | 'entire_table' | 'takeout',
    tabIndex: number,
    method: 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp',
    tenderedAmount?: number,
    paymentChannel?: string,
    referenceNumber?: string,
    billingDetails?: any
  ) => void;
}

export type PaymentMethodType = 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp';
export type SettlementModeType = 'single_tab' | 'entire_table' | 'takeout';
