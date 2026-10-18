import React from 'react';
import { TableItem, OrderLineItem, CustomerTab } from '../../mockData';
import { TableActionModal } from './TableActionModal';
import { TableTransferModal } from './TableTransferModal';
import { OpenTableTabModal } from './OpenTableTabModal';
import { NewTakeoutModal } from './NewTakeoutModal';
import { OnlineDeliveryModal } from './OnlineDeliveryModal';
import { OrderEntryModal } from './OrderEntryModal';
import { BillSettlementModal } from './BillSettlementModal';

export interface WaiterModalsClusterProps {
  tables: TableItem[];
  takeoutOrdersCount: number;

  // Table Action Modal
  selectedTable: TableItem | null;
  isActionModalOpen: boolean;
  onCloseActionModal: () => void;
  onOpenOrderEntryFromModal: (table: TableItem, tabIndex: number) => void;
  onOpenNewSplitTab: (table: TableItem) => void;
  onCheckoutFromModal: (table: TableItem, tabIndex: number) => void;
  onTransferTableFromModal: (table: TableItem) => void;

  // Table Transfer Modal
  tableToTransfer: TableItem | null;
  isTransferModalOpen: boolean;
  onCloseTransferModal: () => void;
  onConfirmTransfer: (
    originId: string,
    targetId: string,
    mode: 'entire' | 'tab',
    tabIndex?: number,
    reason?: string
  ) => void;

  // Open Table Tab Modal
  isOpenTabModalOpen: boolean;
  onCloseOpenTabModal: () => void;
  onConfirmOpenTab: (tableId: string, guestName: string, guestCount: number) => void;

  // Takeout Modal
  isTakeoutModalOpen: boolean;
  onCloseTakeoutModal: () => void;
  onProceedTakeout: (customerName: string, isPrepaid: boolean, notes: string) => void;

  // Online Modal
  isOnlineModalOpen: boolean;
  onCloseOnlineModal: () => void;
  onProceedOnline: (
    platform: 'grabfood' | 'foodpanda',
    platformRef: string,
    riderName: string,
    customerName: string
  ) => void;

  // Order Entry Modal
  isOrderEntryOpen: boolean;
  orderEntryContext: {
    title: string;
    initialItems?: OrderLineItem[];
    previousTabItems?: OrderLineItem[];
    hasExistingCorkage?: boolean;
  } | null;
  onCloseOrderEntry: () => void;
  onSendOrder: (items: OrderLineItem[], hasCorkageFee: boolean, corkageAmount: number) => void;

  // Checkout Modal
  isCheckoutOpen: boolean;
  checkoutContext: {
    table: TableItem;
    activeTab?: CustomerTab | null;
  } | null;
  onCloseCheckout: () => void;
  onConfirmPayment: (
    mode: 'single_tab' | 'entire_table',
    tabIndex: number,
    method: 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp',
    tenderedAmount?: number
  ) => void;
}

export const WaiterModalsCluster: React.FC<WaiterModalsClusterProps> = ({
  tables,
  takeoutOrdersCount,
  selectedTable,
  isActionModalOpen,
  onCloseActionModal,
  onOpenOrderEntryFromModal,
  onOpenNewSplitTab,
  onCheckoutFromModal,
  onTransferTableFromModal,
  tableToTransfer,
  isTransferModalOpen,
  onCloseTransferModal,
  onConfirmTransfer,
  isOpenTabModalOpen,
  onCloseOpenTabModal,
  onConfirmOpenTab,
  isTakeoutModalOpen,
  onCloseTakeoutModal,
  onProceedTakeout,
  isOnlineModalOpen,
  onCloseOnlineModal,
  onProceedOnline,
  isOrderEntryOpen,
  orderEntryContext,
  onCloseOrderEntry,
  onSendOrder,
  isCheckoutOpen,
  checkoutContext,
  onCloseCheckout,
  onConfirmPayment,
}) => {
  return (
    <>
      {/* MODAL 1: Table Action Hub Modal */}
      {selectedTable && (
        <TableActionModal
          visible={isActionModalOpen}
          table={selectedTable}
          onClose={onCloseActionModal}
          onTransferTable={onTransferTableFromModal}
          onOpenOrderEntry={onOpenOrderEntryFromModal}
          onOpenNewTab={onOpenNewSplitTab}
          onCheckout={onCheckoutFromModal}
        />
      )}

      {/* MODAL 2: Table & Tab Transfer Modal */}
      {tableToTransfer && (
        <TableTransferModal
          visible={isTransferModalOpen}
          originTable={tableToTransfer}
          allTables={tables}
          onClose={onCloseTransferModal}
          onConfirmTransfer={onConfirmTransfer}
        />
      )}

      {/* MODAL 3: Open Table Tab Modal */}
      <OpenTableTabModal
        visible={isOpenTabModalOpen}
        tables={tables}
        preselectedTable={selectedTable}
        onClose={onCloseOpenTabModal}
        onConfirmOpenTab={onConfirmOpenTab}
      />

      {/* MODAL 4: New Walk-In Takeout Modal */}
      <NewTakeoutModal
        visible={isTakeoutModalOpen}
        nextTicketNumber={`T-${107 + takeoutOrdersCount}`}
        onClose={onCloseTakeoutModal}
        onProceedToOrder={onProceedTakeout}
      />

      {/* MODAL 5: Online Delivery Intake Modal */}
      <OnlineDeliveryModal
        visible={isOnlineModalOpen}
        onClose={onCloseOnlineModal}
        onProceedToOrder={onProceedOnline}
      />

      {/* MODAL 6: Fullscreen Menu Catalog & Order Entry Modal */}
      <OrderEntryModal
        visible={isOrderEntryOpen}
        title={orderEntryContext?.title || 'Order Entry'}
        initialItems={orderEntryContext?.initialItems || []}
        previousTabItems={orderEntryContext?.previousTabItems || []}
        hasExistingCorkage={orderEntryContext?.hasExistingCorkage || false}
        onClose={onCloseOrderEntry}
        onSendOrder={onSendOrder}
      />

      {/* MODAL 7: Bill Settlement & Checkout Modal */}
      {checkoutContext?.table && (
        <BillSettlementModal
          visible={isCheckoutOpen}
          table={checkoutContext.table}
          activeTab={checkoutContext?.activeTab}
          onClose={onCloseCheckout}
          onConfirmPayment={onConfirmPayment}
        />
      )}
    </>
  );
};
