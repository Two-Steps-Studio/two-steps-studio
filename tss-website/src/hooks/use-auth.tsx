"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useIsElectron, useDeepLinks } from "@/hooks/useElectron";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const isElectron = useIsElectron();

  useEffect(() => {
    const cleanupSubscription = async () => {
      try {
        if (!supabase) {
          // There's no client to call getSession() on -- the previous
          // "fallback" here did `supabase?.auth.getSession?.()` on the very
          // client this branch had just confirmed was missing, which always
          // evaluated to undefined and threw on the destructure right after,
          // landing in the catch block below instead of exiting cleanly.
          console.warn("[useAuth] Supabase not configured - staying unauthenticated");
          setLoading(false);
          return;
        }

        // console.log("[useAuth] Initializing auth session...");

        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("[useAuth] Error getting session:", error);
          // Don't set loading to false on error - keep loading while user sees error state
          return;
        }

        console.log("[useAuth] Session retrieved:", session ? "authenticated" : "not authenticated");

        if (session) {
          // Save session to Electron storage if running in Electron
          if (isElectron && window.electron) {
            try {
              await window.electron.saveSession({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                user: session.user,
              });
            } catch (saveError) {
              console.error("[useAuth] Failed to save session to Electron:", saveError);
            }
          }
          setSession(session);
          setUser(session.user);
          setLoading(false);
          return;
        }

        // No live browser session - on Electron, fall back to whatever this
        // device saved on a previous sign-in (see the SIGNED_IN branch
        // below) instead of showing the login screen again on every
        // restart. window.electron.loadSession() already existed as
        // infrastructure (main.js/preload.js, also used by the game
        // library's own auth) but nothing ever called it from here to
        // actually restore a session.
        if (isElectron && window.electron) {
          try {
            const saved = await window.electron.loadSession();
            if (saved?.access_token && saved?.refresh_token) {
              const { data: restored, error: restoreError } = await supabase.auth.setSession({
                access_token: saved.access_token,
                refresh_token: saved.refresh_token,
              });
              if (restoreError) {
                console.error("[useAuth] Saved Electron session is no longer valid:", restoreError.message);
                await window.electron.clearSession();
              } else {
                console.log("[useAuth] Restored session from Electron storage");
                setSession(restored.session);
                setUser(restored.session?.user ?? null);
                setLoading(false);
                return;
              }
            }
          } catch (restoreErr) {
            console.error("[useAuth] Error restoring Electron session:", restoreErr);
          }
        }

        setSession(null);
        setUser(null);
        setLoading(false);
      } catch (err) {
        console.error("[useAuth] Exception in auth initialization:", err);
        setLoading(false);
      }
    };

    let cleanup: (() => void) | undefined;

    cleanupSubscription();

    if (supabase) {
      try {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            console.log("[useAuth] Auth state changed:", _event, session?.user?.id);
            
            // Handle session changes in Electron
            if (isElectron && window.electron) {
              if (_event === 'SIGNED_IN' && session) {
                try {
                  await window.electron.saveSession({
                    access_token: session.access_token,
                    refresh_token: session.refresh_token,
                    user: session.user,
                  });
                } catch (saveError) {
                  console.error("[useAuth] Failed to save session to Electron:", saveError);
                }
              } else if (_event === 'SIGNED_OUT') {
                try {
                  await window.electron.clearSession();
                } catch (clearError) {
                  console.error("[useAuth] Failed to clear session in Electron:", clearError);
                }
              }
            }
            
            setSession(session);
            setUser(session?.user ?? null);
            // Don't set loading to false here - it's already false after getSession()
          }
        );

        // Store subscription reference for cleanup
        cleanup = () => {
          subscription?.unsubscribe();
          console.log("[useAuth] Subscription unsubscribed");
        };
      } catch (err) {
        console.error("[useAuth] Error setting up auth state change listener:", err);
      }
    }

    // Cleanup on unmount
    return cleanup;
  }, [isElectron]);

  // Discord/Google OAuth in Electron finishes in the user's regular browser
  // (see login.tsx / electron/main.js's will-navigate) and comes back via the
  // app's own tss:// protocol rather than a normal page navigation, so there's
  // no /auth/callback route running here to exchange the code - do it
  // ourselves from the deep link. Wrapped in useCallback so this identity
  // stays stable across re-renders: useDeepLinks re-subscribes on every
  // identity change, and Electron's ipcRenderer.on has no matching "remove
  // the old one first" here, so an unstable callback would pile up duplicate
  // listeners and exchange the same one-time code more than once.
  const handleAuthDeepLink = useCallback(
    async (url: string) => {
      if (!url.startsWith("tss://auth/callback")) return;
      try {
        const parsed = new URL(url);
        const code = parsed.searchParams.get("code");
        if (!code || !supabase) return;
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("[useAuth] Deep-link code exchange failed:", error.message);
          return;
        }
        router.push(parsed.searchParams.get("next") || "/profile");
      } catch (err) {
        console.error("[useAuth] Failed to handle auth deep link:", err);
      }
    },
    [router]
  );
  useDeepLinks(handleAuthDeepLink);

  const signOut = async () => {
    await supabase.auth.signOut();
    
    // Clear Electron session
    if (isElectron && window.electron) {
      try {
        await window.electron.clearSession();
      } catch (error) {
        console.error("[useAuth] Failed to clear session in Electron:", error);
      }
    }
    
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
