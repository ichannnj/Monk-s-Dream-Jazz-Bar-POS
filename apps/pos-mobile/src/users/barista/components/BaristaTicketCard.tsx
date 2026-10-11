import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { StationTicket } from '../../../mockData';
import { Clock, Coffee, CheckCircle2, AlertCircle } from 'lucide-react-native';

interface BaristaTicketCardProps {
  ticket: StationTicket;
  onUpdateStatus: (ticketId: string, status: StationTicket['status']) => void;
}

export const BaristaTicketCard: React.FC<BaristaTicketCardProps> = ({
  ticket,
  onUpdateStatus,
}) => {
  const isLate = ticket.elapsedMinutes > 6 && ticket.status !== 'SERVED';

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
              <Coffee size={14} color="#60a5fa" />
              <Text className="text-white font-black text-base">
                Table {ticket.tableNumber}
              </Text>
            </View>
            <Text className="text-[10px] text-gray-400">#{ticket.id} • Barista</Text>
          </View>

          <View className="items-end">
            <View className="px-2 py-0.5 rounded-full bg-blue-950/80 border border-blue-700">
              <Text className="text-[9px] font-black text-blue-400">
                {ticket.status}
              </Text>
            </View>
            <View className="flex-row items-center mt-1">
              <Clock size={11} color={isLate ? '#f43f5e' : '#9ca3af'} />
              <Text
                className={`text-[10px] ml-1 font-bold ${
                  isLate ? 'text-rose-400' : 'text-gray-400'
                }`}
              >
                {ticket.elapsedMinutes}m
              </Text>
            </View>
          </View>
        </View>

        {/* Coffee Items List */}
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
                <View className="w-5 h-5 rounded-full bg-blue-500 items-center justify-center">
                  <Text className="text-jazz-950 font-black text-[10px]">
                    {item.quantity}
                  </Text>
                </View>
              </View>
              {item.notes ? (
                <View className="mt-1 flex-row items-center">
                  <AlertCircle size={10} color="#60a5fa" />
                  <Text className="text-blue-300 text-[10px] font-medium italic ml-1">
                    {item.notes}
                  </Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </View>

      {/* Barista Status Workflow */}
      <View className="pt-3 border-t border-jazz-850 mt-2">
        {ticket.status === 'NEW' && (
          <TouchableOpacity
            onPress={() => onUpdateStatus(ticket.id, 'PREPARING')}
            className="w-full py-2.5 rounded-xl bg-blue-600 items-center justify-center"
          >
            <Text className="text-white font-extrabold text-xs uppercase tracking-wider">
              Pull Espresso / Brew
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
              Coffee Ready (Notify Waiter)
            </Text>
          </TouchableOpacity>
        )}

        {ticket.status === 'READY' && (
          <TouchableOpacity
            onPress={() => onUpdateStatus(ticket.id, 'SERVED')}
            className="w-full py-2 rounded-xl bg-jazz-800 items-center justify-center"
          >
            <Text className="text-gray-300 font-bold text-xs uppercase">
              Picked Up By Waiter
            </Text>
          </TouchableOpacity>
        )}

        {ticket.status === 'SERVED' && (
          <View className="py-1 items-center justify-center">
            <Text className="text-gray-500 font-semibold text-xs">Completed</Text>
          </View>
        )}
      </View>
    </View>
  );
};
