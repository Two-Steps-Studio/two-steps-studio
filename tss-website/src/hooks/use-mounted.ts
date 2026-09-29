import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

// false during SSR and hydration, true afterwards - for UI that depends on
// browser-only values (theme, current time, locale formatting). Unlike the
// common `useEffect(() => setMounted(true), [])`, it doesn't need a second
// render pass triggered from an effect.
export function useMounted() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
