import React from 'react';
import { View } from 'react-native';
import type { DashboardTelemetry } from '../../../domain/admin.types';
import { HourlySalesVelocityChart } from '../analytics/HourlySalesVelocityChart';
import { PaymentTenderMixBar } from '../analytics/PaymentTenderMixBar';
import { DepartmentSalesBreakdown, DepartmentShare } from '../analytics/DepartmentSalesBreakdown';

interface DashboardChartsAndTendersSectionProps {
  telemetry: DashboardTelemetry;
  departmentShares: DepartmentShare[];
}

export const DashboardChartsAndTendersSection: React.FC<DashboardChartsAndTendersSectionProps> = ({
  telemetry,
  departmentShares,
}) => {
  return (
    <View className="w-full min-w-0 space-y-6">
      {/* 1. Hourly Sales Velocity & Peak Pacing Curve */}
      <HourlySalesVelocityChart
        data={(telemetry.hourlySales || []).map((pt) => ({
          hour: pt.hourLabel,
          sales: pt.sales,
        }))}
        peakHourLabel={telemetry.peakHourLabel}
        totalSales={telemetry.liveSalesTotal}
      />

      {/* 2 & 3: Tender Mix & Department Breakdown Flex Row */}
      <View className="flex-col lg:flex-row gap-6">
        <PaymentTenderMixBar
          data={{
            cash: telemetry.cashSales || 0,
            card: telemetry.cardSales || 0,
            digital: telemetry.digitalSales || 0,
            delivery: 0,
            total: telemetry.liveSalesTotal || 0,
          }}
        />

        <DepartmentSalesBreakdown
          departments={departmentShares}
          totalSales={telemetry.liveSalesTotal}
        />
      </View>
    </View>
  );
};
