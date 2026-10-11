import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { StationTicket } from '../../../mockData';
import { Clock, UtensilsCrossed, CheckCircle2, AlertTriangle } from 'lucide-react-native';

interface KitchenTicketCardProps {
  ticket: StationTicket;
  onUpdateStatus: (ticketId: string, status: StationTicket['status']) => void;
}

export const KitchenTicketCard: React.FC<KitchenTicketCardProps> = ({
  ticket,
  onUpdateStatus,
}) => {
  const isLate = ticket.elapsedMinutes > 10 && ticket.status !== 'SERVED';

  return (
    <View
      className={`bg-jazz-900 rounded-2xl border ${
        isLate ? 'border-rose-500 shadow-md shadow-rose-950' : 'border-jazz-800'
      } p-3.5 flex-col justify-between min-h-[290px]`}
    >
      <View>
        <View className="flex-row items-center justify-between pb-2 border-b border-jazz-800 mb-2">
          <View>
            <View className="flex-row items-center space-x-1.5">
              <UtensilsCrossed size={14} color="#34d399" />
              <Text className="text-white font-black text-base">
                Table {ticket.tableNumber}
              </Text>
            </View>
            <Text className="text-[10px] text-gray-400">#{ticket.id} • Kitchen Food</Text>
          </View>

          <View className="items-end">
            <View className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700">
              <Text className="text-[9px] font-black text-emerald-400">
                {ticket.status}
              </Text>
            </View>
            <View className="flex-row items-center mt-1">
              <Clock size={11} color={isLate ? '#f43f5e' : '#9ca3af'} />
              <Text
                className={`text-[10px] ml-1 font-bold ${
                  isLate ? 'text-rose-400 font-extrabold' : 'text-gray-400'
                }`}
              >
                {ticket.elapsedMinutes}m
              </Text>
            </View>
          </View>
        </View>

        {/* Food Items List */}
        <View className="space-y-1.5 mt-1">
          {ticket.items.map((item, idx) => (
            <View
              key={idx}
              className="bg-jazz-950/70 p-2 rounded-xl border border-jazz-850"
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-white text-xs font-bold flex-1 pr-1">
                  {item.name}
                </Text>
                <View className="w-5 h-5 rounded-full bg-emerald-500 items-center justify-center">
                  <Text className="text-jazz-950 font-black text-[10px]">
                    {item.quantity}
                  </Text>
                </View>
              </View>
              {item.notes ? (
                <View className="mt-1 flex-row items-center">
                  <AlertTriangle size={10} color="#f59e0b" />
                  <Text className="text-amber-300 text-[10px] font-bold italic ml-1">
                    Special: {item.notes}
                  </Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </View>

      {/* Kitchen Status Workflow */}
      <View className="pt-3 border-t border-jazz-850 mt-2">
        {ticket.status === 'NEW' && (
          <TouchableOpacity
            onPress={() => onUpdateStatus(ticket.id, 'PREPARING')}
            className="w-full py-2.5 rounded-xl bg-amber-500 items-center justify-center"
          >
            <Text className="text-jazz-950 font-extrabold text-xs uppercase tracking-wider">
              Fire / Start Cooking
            </Text>
          </TouchableOpacity>
        )}

        {ticket.status === 'PREPARING' && (
          <TouchableOpacity
            onPress={() => onUpdateStatus(ticket.id, 'READY')}
            className="w-full py-2.5 rounded-xl bg-emerald-500 flex-row items-center justify-center space-x-1"
          >
            <CheckCircle2 size={14} color="#07090e" />
            <Text className="text-jazz-950 font-black text-xs uppercase tracking-wider">
              Food Ready on Pass
            </Text>
          </TouchableOpacity>
        )}

        {ticket.status === 'READY' && (
          <TouchableOpacity
            onPress={() => onUpdateStatus(ticket.id, 'SERVED')}
            className="w-full py-2 rounded-xl bg-jazz-800 items-center justify-center"
          >
            <Text className="text-gray-300 font-bold text-xs uppercase">
              Runner Dispatched
            </Text>
          </TouchableOpacity>
        )}

        {ticket.status === 'SERVED' && (
          <View className="py-1 items-center justify-center">
            <Text className="text-gray-500 font-semibold text-xs">Served to Table</Text>
          </View>
        )}
      </View>
    </View>
  );
};
