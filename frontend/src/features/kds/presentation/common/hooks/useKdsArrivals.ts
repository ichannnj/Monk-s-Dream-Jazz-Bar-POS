import { useEffect, useRef } from 'react';
import { toast } from '../../../../shared/toast/useToastStore';
import { BarTicket } from '../../barista/types';

// Native Web Audio chime for KDS ticket arrivals
export const playKdsChime = () => {
  try {
    const AudioCtx =
      typeof window !== 'undefined'
        ? window.AudioContext || (window as any).webkitAudioContext
        : null;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(783.99, ctx.currentTime); // G5
    osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.12); // C6
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // AudioContext blocked or unsupported in headless environment
  }
};

interface UseKdsArrivalsProps {
  newTickets: BarTicket[];
  audioChimes: boolean;
  stationName: string;
}

export function useKdsArrivals({ newTickets, audioChimes, stationName }: UseKdsArrivalsProps) {
  const prevNewTicketIdsRef = useRef<Set<string>>(new Set());
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevNewTicketIdsRef.current = new Set(newTickets.map((t) => t.id));
      return;
    }

    const prevIds = prevNewTicketIdsRef.current;
    const incomingNewTickets = newTickets.filter((t) => !prevIds.has(t.id));

    if (incomingNewTickets.length > 0) {
      if (audioChimes) {
        playKdsChime();
      }
      incomingNewTickets.forEach((t) => {
        const roundText = t.roundNumber && t.roundNumber > 1 ? ` (Round ${t.roundNumber})` : '';
        toast.info(`🔔 New Order: ${t.orderNumber}${roundText} JUST IN`, {
          title: `New Ticket at ${stationName}`,
        });
      });
    }

    prevNewTicketIdsRef.current = new Set(newTickets.map((t) => t.id));
  }, [newTickets, audioChimes, stationName]);
}
