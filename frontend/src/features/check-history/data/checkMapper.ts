import type {
  SettledCheckItem,
  CheckLineItem,
  CheckOrderType,
  CheckFilterParams,
} from '../domain/check.types';

export function mapRawPaymentToCheck(
  p: any,
  itemsByTab: Map<string, CheckLineItem[]>
): SettledCheckItem {
  const tab = p.tabs || {};
  const tableNumber = tab.tables?.table_number;
  const channelRaw = (tab.order_channel || '').toLowerCase();

  let orderType: CheckOrderType = 'dine_in';
  if (channelRaw.includes('takeout') || channelRaw.includes('counter')) {
    orderType = 'takeout';
  } else if (
    channelRaw.includes('grab') ||
    channelRaw.includes('delivery') ||
    channelRaw.includes('panda')
  ) {
    orderType = 'online_delivery';
  }

  let tableOrRef = 'Bar / Quick Till';
  if (tableNumber) {
    tableOrRef = `Table ${tableNumber}`;
  } else if (orderType === 'takeout') {
    tableOrRef = 'Takeout Counter';
  } else if (orderType === 'online_delivery') {
    tableOrRef = channelRaw.includes('panda') ? 'Foodpanda Delivery' : 'GrabFood Delivery';
  }

  const guestName = tab.customer_name || tab.guest_name || 'Guest Tab';
  const cashierName =
    p.users?.display_name ||
    tab.opened_by?.display_name ||
    p.users?.name ||
    tab.opened_by?.name ||
    'Cashier';
  const total = Number(p.amount) || 0;
  const rawDiscountAmount = Number(p.discount_amount || 0);
  const corkageFee = Number(p.corkage_amount || 0);

  const storedSc =
    p.service_charge !== null && p.service_charge !== undefined ? Number(p.service_charge) : null;
  const vatExemptSales = Number(p.vat_exempt_sales || 0);

  const netBase = Math.max(0, total - corkageFee);
  // Service charge is explicitly chosen at settlement; never auto-assume 10% if null
  const serviceCharge = storedSc !== null ? storedSc : 0;
  /* TODO(BIR): Uncomment when BIR VAT-registered
  const storedVat =
    p.vat_amount !== null && p.vat_amount !== undefined ? Number(p.vat_amount) : null;
  const storedVatable =
    p.vatable_sales !== null && p.vatable_sales !== undefined ? Number(p.vatable_sales) : null;
  const vatableSales =
    storedVatable !== null ? storedVatable : Number(((netBase - serviceCharge) / 1.12).toFixed(2));
  const vatAmount =
    storedVat !== null ? storedVat : Number((netBase - serviceCharge - vatableSales).toFixed(2));
  */
  const vatableSales = 0;
  const vatAmount = 0;

  const items = itemsByTab.get(p.tab_id) || [];
  const computedItemsSubtotal =
    items.length > 0
      ? items.reduce((sum, it) => sum + it.subtotal, 0)
      : Math.max(0, netBase - serviceCharge + rawDiscountAmount);
  const subtotal = computedItemsSubtotal;

  // Reconcile historical Senior/PWD records where vat_exempt_sales held the 12% VAT relief portion
  const impliedFullDiscount =
    vatExemptSales > 0 && items.length > 0
      ? Math.max(
          rawDiscountAmount,
          Number(Math.max(0, subtotal + corkageFee + serviceCharge - total).toFixed(2))
        )
      : rawDiscountAmount;
  const discountAmount = impliedFullDiscount;

  const dateObj = new Date(p.created_at);
  const timestamp = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const shortId = p.id.substring(0, 8).toUpperCase();
  const checkNumber = p.receipt_number || `#${shortId}`;

  return {
    id: p.id,
    paymentId: p.id,
    tabId: p.tab_id,
    checkNumber,
    billNumber: tab.bill_number || undefined,
    orderType,
    tableOrRef,
    guestName,
    itemsCount: items.length > 0 ? items.reduce((sum, it) => sum + it.quantity, 0) : 1,
    items,
    subtotal,
    discountAmount,
    corkageFee,
    vatableSales,
    vatAmount,
    vatExemptSales,
    serviceCharge,
    discountType: p.discount_type || undefined,
    seniorPwdId: p.senior_pwd_id || undefined,
    seniorPwdName: p.senior_pwd_name || undefined,
    total,
    paymentMethod: p.payment_method || 'CASH',
    paymentChannel: p.payment_channel || undefined,
    referenceNumber: p.reference_number || undefined,
    drawerTarget: (p.drawer_target || 'main') as 'main' | 'bar' | 'consolidated',
    cashierName,
    settledAt: p.created_at,
    timestamp,
    orderChannel: tab.order_channel || 'CAFE_AREA',
    operatingMode: tab.operating_mode || p.operating_mode || 'CAFE',
    groupTabIds:
      Array.isArray(p.group_tab_ids) && p.group_tab_ids.length > 0 ? p.group_tab_ids : undefined,
    notes: p.notes || tab.notes || undefined,
    tenders: p.tenders || undefined,
  };
}

export function filterSettledChecks(
  checks: SettledCheckItem[],
  filter: CheckFilterParams
): SettledCheckItem[] {
  return checks.filter((chk) => {
    if (filter.mode && filter.mode !== 'all' && chk.operatingMode !== filter.mode) {
      return false;
    }

    if (filter.channel && filter.channel !== 'all' && chk.orderType !== filter.channel) {
      return false;
    }

    if (filter.station && filter.station !== 'ALL') {
      const st = filter.station.toUpperCase();
      if (st === 'CAFE_AREA' && !chk.orderChannel.includes('CAFE') && chk.drawerTarget !== 'main') {
        return false;
      }
      if (st === 'BAR_AREA' && !chk.orderChannel.includes('BAR') && chk.drawerTarget !== 'bar') {
        return false;
      }
      if (st === 'TAKEOUT_COUNTER' && chk.orderType !== 'takeout') return false;
      if (st === 'GRAB_FOOD' && chk.orderType !== 'online_delivery') return false;
    }

    if (filter.searchQuery && filter.searchQuery.trim().length > 0) {
      const q = filter.searchQuery.toLowerCase().trim();
      const matchCheck = chk.checkNumber.toLowerCase().includes(q);
      const matchBill = chk.billNumber ? chk.billNumber.toLowerCase().includes(q) : false;
      const matchGuest = chk.guestName.toLowerCase().includes(q);
      const matchRef = chk.tableOrRef.toLowerCase().includes(q);
      const matchCashier = chk.cashierName.toLowerCase().includes(q);
      const matchItem = chk.items.some((it) => it.name.toLowerCase().includes(q));
      const matchPaymentRef = chk.referenceNumber
        ? chk.referenceNumber.toLowerCase().includes(q)
        : false;
      const matchChannel = chk.paymentChannel
        ? chk.paymentChannel.toLowerCase().includes(q)
        : false;
      return (
        matchCheck ||
        matchBill ||
        matchGuest ||
        matchRef ||
        matchCashier ||
        matchItem ||
        matchPaymentRef ||
        matchChannel
      );
    }

    return true;
  });
}
