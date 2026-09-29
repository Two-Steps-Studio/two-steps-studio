// Safari < 14.1 only ships the prefixed constructor.
export function createAudioContext(): AudioContext {
  const AC: typeof AudioContext =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return new AC();
}

// Short enveloped sine/square blip at an absolute AudioContext time - the
// exponential ramp avoids the click a hard stop would make.
export function playTone(ctx: AudioContext, freq: number, at: number, duration: number, volume = 0.2, type: OscillatorType = "sine") {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + duration);
}

export const midiToFreq = (midi: number, a4 = 440) => a4 * 2 ** ((midi - 69) / 12);
