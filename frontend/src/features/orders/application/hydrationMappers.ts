import type {
  TableItem,
  CustomerTab,
  TakeoutOrder,
  OnlineDeliveryOrder,
  OrderLineItem,
} from '../../../types/floor';
import { deriveTableStatus, deriveTableStateTimestamp } from './order.helpers';
import { getElapsedSeconds, formatElapsedTimer } from '../../shared/utils/elapsedTime';

export const mapHydratedTables = (
  dbTables: any[],
  currentTables: TableItem[],
  allOpenDbTabIds: Set<string>,
  nowMs: number
): TableItem[] => {
  return dbTables.map((dbt: any) => {
    const rawTabs = dbt.tabs || [];
    const openTabs = rawTabs
      .filter((tb: any) => tb.status === 'OPEN')
      .sort(
        (a: any, b: any) =>
          new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      );

    const customerTabs: CustomerTab[] = openTabs.map((tb: any, idx: number) => {
      const rawOrders = (tb.orders || []).sort(
        (a: any, b: any) => (a.round_number || 1) - (b.round_number || 1)
      );
      const lineItems: OrderLineItem[] = rawOrders.flatMap((o: any) =>
        (o.order_items || []).map((oi: any) => {
          const sels: import('@/types/floor').OrderItemVariantSelection[] = (
            oi.order_item_variant_selections || []
          ).map((s: any) => ({
            groupId: s.group_id,
            optionId: s.option_id,
            groupNameSnapshot: s.group_name_snapshot,
            optionNameSnapshot: s.option_name_snapshot,
            priceDeltaSnapshot: Number(s.price_delta_snapshot || 0),
          }));

          const descParts: string[] = [];
          sels.forEach((s) => {
            if (s.optionNameSnapshot) descParts.push(s.optionNameSnapshot);
          });
          if (oi.temperature && oi.temperature !== 'NONE') {
            descParts.push(oi.temperature === 'HOT' ? 'Hot' : 'Iced');
          }
          if (oi.size_label && oi.size_label !== 'Standard') {
            descParts.push(oi.size_label);
          }

          let formattedName = oi.products?.name || 'Menu Item';
          if (descParts.length > 0) {
            formattedName = `${formattedName} (${descParts.join(' · ')})`;
          }

          return {
            id: oi.id,
            productId: oi.product_id,
            productName: formattedName,
            unitPrice: parseFloat(oi.unit_price) || 0,
            quantity: oi.quantity || 1,
            stationTarget: (oi.station_target || oi.products?.station_target || 'bar') as
              'bar' | 'kitchen',
            categorySlug:
              oi.products?.categories?.slug ||
              (formattedName.toLowerCase().includes('door charge') ? 'door_charge' : undefined),
            eventId: oi.event_id || undefined,
            variantId: oi.variant_id || undefined,
            temperature: oi.temperature || undefined,
            sizeLabel: oi.size_label || undefined,
            modifiers: Array.isArray(oi.modifiers) ? oi.modifiers : [],
            notes: oi.notes || undefined,
            status: (oi.status || 'PENDING').toLowerCase() as any,
            roundNumber: o.round_number || 1,
            createdAt: oi.created_at || o.created_at || tb.created_at,
            preparingAt: oi.preparing_at || undefined,
            readyAt: oi.ready_at || undefined,
            servedAt: oi.delivered_at || undefined,
            stateChangedAt:
              oi.state_changed_at || oi.delivered_at || oi.updated_at || oi.created_at,
            variantSelections: sels.length > 0 ? sels : undefined,
          };
        })
      );

      const activeItems = lineItems.filter((i) => i.status !== 'cancelled');
      const itemsSum = activeItems.reduce((acc, cur) => acc + cur.unitPrice * cur.quantity, 0);
      const corkage = parseFloat(tb.corkage_amount) || 0;

      const localTabMatch = currentTables
        .flatMap((t) => t.tabs || [])
        .find((lt) => lt.id === tb.id);

      const transferredFrom = tb.transferred_from_table_code
        ? {
            tableCode: tb.transferred_from_table_code,
            transferredAt: tb.transferred_at
              ? new Date(tb.transferred_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : undefined,
          }
        : localTabMatch?.transferredFrom;

      return {
        id: tb.id,
        tabIndex: idx + 1,
        guestName: tb.customer_name || `Guest ${idx + 1}`,
        status: 'open',
        hasCorkageFee: tb.has_corkage_fee,
        corkageAmount: corkage,
        items: lineItems,
        totalAmount: itemsSum + corkage,
        transferredFrom,
        operatingMode: tb.operating_mode || 'CAFE',
        openedAtIso: tb.created_at || undefined,
        openedAt: tb.created_at
          ? new Date(tb.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'Open',
      };
    });

    const currentLocalTable = currentTables.find(
      (t) => t.id === dbt.id || t.code === dbt.table_number
    );
    const pendingLocalTabs = (currentLocalTable?.tabs || []).filter(
      (lt) =>
        lt.status === 'open' &&
        !customerTabs.some((ct) => ct.id === lt.id) &&
        !allOpenDbTabIds.has(lt.id) &&
        lt.id.startsWith('tab-')
    );
    const combinedTabs = [...customerTabs, ...pendingLocalTabs];
    const activeTabsIndices = combinedTabs.map((tb, idx) => tb.tabIndex || idx + 1);

    const totalTableAmount = combinedTabs.reduce((acc, cur) => acc + cur.totalAmount, 0);
    const hasActiveTabs = combinedTabs.length > 0;

    const tableStatus = deriveTableStatus(hasActiveTabs, combinedTabs);
    const isBar = dbt.zone === 'BAR_AREA' || dbt.table_number.toLowerCase().includes('bar');

    const earliestTabIso = combinedTabs
      .map((tb) => tb.openedAtIso)
      .filter(Boolean)
      .sort()[0];

    const stateChangedAtIso = deriveTableStateTimestamp(tableStatus, combinedTabs, earliestTabIso);

    const liveElapsed =
      hasActiveTabs && stateChangedAtIso
        ? formatElapsedTimer(getElapsedSeconds(stateChangedAtIso, undefined, nowMs))
        : '00:00';

    return {
      id: dbt.id,
      code: dbt.table_number,
      area: isBar ? 'bar' : 'cafe',
      seats: dbt.capacity || 4,
      guests: hasActiveTabs ? Math.max(1, combinedTabs.length) : 0,
      status: tableStatus,
      elapsedTime: liveElapsed,
      occupiedSinceIso: hasActiveTabs ? earliestTabIso : undefined,
      stateChangedAt: hasActiveTabs ? stateChangedAtIso : undefined,
      hasOpenCheck: hasActiveTabs,
      activeTabs: activeTabsIndices,
      maxTabs: 99,
      isMyTable: false,
      tabs: combinedTabs,
      totalAmount: hasActiveTabs ? totalTableAmount : undefined,
    };
  });
};

export const mapHydratedOffPremiseTabs = (
  nonDineInTabs: any[],
  currentTakeout: TakeoutOrder[],
  nowMs: number
): { dbTakeout: TakeoutOrder[]; dbOnline: OnlineDeliveryOrder[] } => {
  const dbTakeout: TakeoutOrder[] = [];
  const dbOnline: OnlineDeliveryOrder[] = [];

  (nonDineInTabs || []).forEach((t: any) => {
    const rawOrders = (t.orders || []).sort(
      (a: any, b: any) => (a.round_number || 1) - (b.round_number || 1)
    );
    const lineItems: OrderLineItem[] = rawOrders.flatMap((o: any) =>
      (o.order_items || []).map((oi: any) => {
        const sels: import('@/types/floor').OrderItemVariantSelection[] = (
          oi.order_item_variant_selections || []
        ).map((s: any) => ({
          groupId: s.group_id,
          optionId: s.option_id,
          groupNameSnapshot: s.group_name_snapshot,
          optionNameSnapshot: s.option_name_snapshot,
          priceDeltaSnapshot: Number(s.price_delta_snapshot || 0),
        }));

        const descParts: string[] = [];
        sels.forEach((s) => {
          if (s.optionNameSnapshot) descParts.push(s.optionNameSnapshot);
        });
        if (oi.temperature && oi.temperature !== 'NONE') {
          descParts.push(oi.temperature === 'HOT' ? 'Hot' : 'Iced');
        }
        if (oi.size_label && oi.size_label !== 'Standard') {
          descParts.push(oi.size_label);
        }

        let formattedName = oi.products?.name || 'Menu Item';
        if (descParts.length > 0) {
          formattedName = `${formattedName} (${descParts.join(' · ')})`;
        }

        return {
          id: oi.id,
          productId: oi.product_id,
          productName: formattedName,
          unitPrice: parseFloat(oi.unit_price) || 0,
          quantity: oi.quantity || 1,
          stationTarget: (oi.station_target || oi.products?.station_target || 'bar') as
            'bar' | 'kitchen',
          categorySlug:
            oi.products?.categories?.slug ||
            (formattedName.toLowerCase().includes('door charge') ? 'door_charge' : undefined),
          eventId: oi.event_id || undefined,
          variantId: oi.variant_id || undefined,
          temperature: oi.temperature || undefined,
          sizeLabel: oi.size_label || undefined,
          modifiers: Array.isArray(oi.modifiers) ? oi.modifiers : [],
          notes: oi.notes || undefined,
          status: (oi.status || 'PENDING').toLowerCase() as any,
          roundNumber: o.round_number || 1,
          createdAt: oi.created_at || o.created_at || t.created_at,
          preparingAt: oi.preparing_at || undefined,
          readyAt: oi.ready_at || undefined,
          servedAt: oi.delivered_at || undefined,
          stateChangedAt: oi.state_changed_at || oi.delivered_at || oi.updated_at || oi.created_at,
          variantSelections: sels.length > 0 ? sels : undefined,
        };
      })
    );

    const activeItems = lineItems.filter((i) => i.status !== 'cancelled');
    const itemsTotal = activeItems.reduce((acc, cur) => acc + cur.unitPrice * cur.quantity, 0);
    const hasPayments = Array.isArray(t.payments) && t.payments.length > 0;
    const isPrepaidFlag = Boolean(t.is_prepaid || hasPayments);

    const allServed = activeItems.length > 0 && activeItems.every((i) => i.status === 'served');
    const allReadyOrServed =
      activeItems.length > 0 &&
      activeItems.every((i) => i.status === 'ready' || i.status === 'served');

    const orderStatus =
      allServed && (t.order_type !== 'TAKEOUT' || isPrepaidFlag)
        ? 'completed'
        : allReadyOrServed
          ? 'ready'
          : 'preparing';

    if (orderStatus === 'completed') return;

    const createdAtIso = t.created_at || rawOrders[0]?.created_at || new Date().toISOString();
    const stateChangedAtIso =
      orderStatus === 'ready'
        ? activeItems
            .map((i) => i.readyAt || i.stateChangedAt)
            .filter(Boolean)
            .sort()
            .reverse()[0] || createdAtIso
        : activeItems
            .map((i) => i.preparingAt || i.stateChangedAt)
            .filter(Boolean)
            .sort()[0] || createdAtIso;
    const liveElapsed = formatElapsedTimer(getElapsedSeconds(stateChangedAtIso, undefined, nowMs));

    if (t.order_type === 'TAKEOUT') {
      const localMatch = currentTakeout.find((lo) => lo.id === t.id || lo.tabId === t.id);
      const ticketNum =
        t.ticket_number ||
        rawOrders[0]?.order_number?.split('-R')[0] ||
        localMatch?.ticketNumber ||
        'T-107';

      dbTakeout.push({
        id: t.id,
        tabId: t.id,
        ticketNumber: ticketNum,
        customerName: t.customer_name || 'Takeout Customer',
        items: lineItems,
        total: itemsTotal,
        status: orderStatus as any,
        elapsedTime: liveElapsed,
        createdAt: createdAtIso,
        stateChangedAt: stateChangedAtIso,
        isPrepaid:
          t.is_prepaid !== undefined && t.is_prepaid !== null
            ? Boolean(t.is_prepaid || hasPayments)
            : (localMatch?.isPrepaid ?? hasPayments),
        operatingMode: t.operating_mode || 'CAFE',
        notes: t.notes || localMatch?.notes || undefined,
      });
    } else if (t.order_type === 'ONLINE_DELIVERY') {
      const platform = t.order_channel === 'FOODPANDA' ? 'foodpanda' : 'grabfood';
      const ref =
        t.external_order_ref ||
        t.ticket_number ||
        rawOrders[0]?.order_number?.split('-R')[0] ||
        'ONL-101';

      dbOnline.push({
        id: t.id,
        tabId: t.id,
        platform,
        platformOrderRef: ref,
        riderName: t.rider_name || 'Assigned Driver',
        customerName: t.customer_name || 'Delivery Customer',
        items: lineItems,
        total: itemsTotal,
        status: orderStatus as any,
        elapsedTime: liveElapsed,
        createdAt: createdAtIso,
        stateChangedAt: stateChangedAtIso,
        operatingMode: t.operating_mode || 'CAFE',
        paymentStatus: platform === 'foodpanda' ? 'PAID_ONLINE_FOODPANDA' : 'PAID_ONLINE_GRAB',
      });
    }
  });

  return { dbTakeout, dbOnline };
};
