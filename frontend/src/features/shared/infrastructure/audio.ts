/**
 * Web Audio Chime Synthesizer for KDS & POS Alerts
 * Monk's Dream Jazz Bar POS
 */

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
    // AudioContext blocked or unsupported in environment
  }
};

export const playTransferAlertSound = () => {
  try {
    const AudioCtx =
      typeof window !== 'undefined'
        ? window.AudioContext || (window as any).webkitAudioContext
        : null;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    // Attention chime sequence (D5 -> A5 -> D6)
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // AudioContext blocked or unsupported
  }
};
