import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { INITIAL_TICKETS, StationTicket } from '../mockData';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Wine,
  Coffee,
  UtensilsCrossed,
  Volume2,
} from 'lucide-react-native';

export const KdsScreen: React.FC = () => {
  const { kdsStation } = useAuthStore();
  const [tickets, setTickets] = useState<StationTicket[]>(INITIAL_TICKETS);
  const [filterStation, setFilterStation] = useState<string>('all');

  const filteredTickets = tickets.filter((t) => {
    if (filterStation === 'all') return true;
    return t.station === filterStation;
  });

  const handleUpdateStatus = (ticketId: string, nextStatus: StationTicket['status']) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: nextStatus } : t))
    );
  };

  const getStatusBadge = (status: StationTicket['status']) => {
    switch (status) {
      case 'NEW':
        return {
          bg: 'bg-rose-950/80',
          border: 'border-rose-700',
          text: 'NEW TICKET',
          textCol: 'text-rose-400',
        };
      case 'PREPARING':
        return {
          bg: 'bg-amber-950/80',
          border: 'border-amber-700',
          text: 'PREPARING',
          textCol: 'text-amber-400',
        };
      case 'READY':
        return {
          bg: 'bg-emerald-950/80',
          border: 'border-emerald-600',
          text: 'READY FOR RUNNER',
          textCol: 'text-emerald-400',
        };
      case 'SERVED':
        return {
          bg: 'bg-gray-900',
          border: 'border-gray-800',
          text: 'SERVED',
          textCol: 'text-gray-400',
        };
    }
  };

  return (
    <View className="flex-1 bg-jazz-950 p-4">
      {/* Top KDS Controls */}
      <View className="flex-row items-center justify-between pb-3 mb-4 border-b border-jazz-850">
        <View className="flex-row items-center space-x-3">
          <View className="p-2 rounded-xl bg-jazz-gold/10 border border-jazz-gold/30">
            {kdsStation === 'bar' ? (
              <Wine size={20} color="#f59e0b" />
            ) : kdsStation === 'cafe' ? (
              <Coffee size={20} color="#60a5fa" />
            ) : (
              <UtensilsCrossed size={20} color="#34d399" />
            )}
          </View>
          <View>
            <Text className="text-base font-extrabold text-white">
              Kitchen Display Station (KDS)
            </Text>
            <Text className="text-xs text-gray-400">
              Live Paperless Order Queue • Auto-deduct on Ready
            </Text>
          </View>
        </View>

        {/* Filter Buttons */}
        <View className="flex-row space-x-2 bg-jazz-900 p-1 rounded-xl border border-jazz-800">
          <TouchableOpacity
            onPress={() => setFilterStation('all')}
            className={`px-3 py-1.5 rounded-lg ${
              filterStation === 'all' ? 'bg-jazz-gold' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                filterStation === 'all' ? 'text-jazz-950' : 'text-gray-400'
              }`}
            >
              All ({tickets.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilterStation('bar')}
            className={`px-3 py-1.5 rounded-lg ${
              filterStation === 'bar' ? 'bg-jazz-gold' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                filterStation === 'bar' ? 'text-jazz-950' : 'text-gray-400'
              }`}
            >
              Bar ({tickets.filter((t) => t.station === 'bar').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilterStation('food')}
            className={`px-3 py-1.5 rounded-lg ${
              filterStation === 'food' ? 'bg-jazz-gold' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                filterStation === 'food' ? 'text-jazz-950' : 'text-gray-400'
              }`}
            >
              Food ({tickets.filter((t) => t.station === 'food').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilterStation('cafe')}
            className={`px-3 py-1.5 rounded-lg ${
              filterStation === 'cafe' ? 'bg-jazz-gold' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                filterStation === 'cafe' ? 'text-jazz-950' : 'text-gray-400'
              }`}
            >
              Cafe ({tickets.filter((t) => t.station === 'cafe').length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Ticket Cards Grid */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="flex-row flex-wrap -mx-2">
          {filteredTickets.map((ticket) => {
            const badge = getStatusBadge(ticket.status);
            const isLate = ticket.elapsedMinutes > 8 && ticket.status !== 'SERVED';

            return (
              <View
                key={ticket.id}
                className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 p-2"
              >
                <View
                  className={`bg-jazz-900 rounded-2xl border ${
                    isLate
                      ? 'border-rose-500/70 shadow-lg shadow-rose-950'
                      : 'border-jazz-800'
                  } p-3.5 flex-col justify-between min-h-[300px]`}
                >
                  {/* Card Header */}
                  <View>
                    <View className="flex-row items-center justify-between pb-2 border-b border-jazz-800 mb-2">
                      <View>
                        <Text className="text-white font-black text-lg">
                          Table {ticket.tableNumber}
                        </Text>
                        <Text className="text-[10px] text-gray-400">
                          #{ticket.id}
                        </Text>
                      </View>

                      <View className="items-end">
                        <View
                          className={`px-2 py-0.5 rounded-full border ${badge.bg} ${badge.border}`}
                        >
                          <Text
                            className={`text-[9px] font-extrabold tracking-wider ${badge.textCol}`}
                          >
                            {badge.text}
                          </Text>
                        </View>
                        <View className="flex-row items-center mt-1">
                          <Clock
                            size={11}
                            color={isLate ? '#f43f5e' : '#9ca3af'}
                          />
                          <Text
                            className={`text-[10px] ml-1 font-bold ${
                              isLate ? 'text-rose-400 font-extrabold' : 'text-gray-400'
                            }`}
                          >
                            {ticket.elapsedMinutes}m ago
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Items */}
                    <View className="space-y-2 mt-1">
                      {ticket.items.map((item, idx) => (
                        <View
                          key={idx}
                          className="bg-jazz-950/60 p-2 rounded-xl border border-jazz-850"
                        >
                          <View className="flex-row items-center justify-between">
                            <Text className="text-white text-xs font-bold flex-1 pr-1">
                              {item.name}
                            </Text>
                            <View className="w-5 h-5 rounded-full bg-jazz-gold items-center justify-center">
                              <Text className="text-jazz-950 font-black text-[10px]">
                                {item.quantity}
                              </Text>
                            </View>
                          </View>
                          {item.notes ? (
                            <View className="mt-1 flex-row items-center">
                              <AlertCircle size={10} color="#f59e0b" />
                              <Text className="text-amber-300 text-[10px] font-semibold italic ml-1">
                                {item.notes}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Card Workflow Controls */}
                  <View className="pt-3 border-t border-jazz-850 mt-3">
                    {ticket.status === 'NEW' && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() =>
                          handleUpdateStatus(ticket.id, 'PREPARING')
                        }
                        className="w-full py-2.5 rounded-xl bg-amber-500 items-center justify-center"
                      >
                        <Text className="text-jazz-950 font-extrabold text-xs tracking-wider uppercase">
                          Start Preparing
                        </Text>
                      </TouchableOpacity>
                    )}

                    {ticket.status === 'PREPARING' && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleUpdateStatus(ticket.id, 'READY')}
                        className="w-full py-2.5 rounded-xl bg-emerald-500 flex-row items-center justify-center space-x-1.5"
                      >
                        <CheckCircle2 size={14} color="#07090e" />
                        <Text className="text-jazz-950 font-black text-xs tracking-wider uppercase">
                          Mark Ready (Notify Waiter)
                        </Text>
                      </TouchableOpacity>
                    )}

                    {ticket.status === 'READY' && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleUpdateStatus(ticket.id, 'SERVED')}
                        className="w-full py-2 rounded-xl bg-jazz-800 items-center justify-center"
                      >
                        <Text className="text-gray-300 font-bold text-xs uppercase">
                          Delivered / Served
                        </Text>
                      </TouchableOpacity>
                    )}

                    {ticket.status === 'SERVED' && (
                      <View className="py-1.5 items-center justify-center">
                        <Text className="text-gray-500 font-semibold text-[11px]">
                          Order Completed
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};
