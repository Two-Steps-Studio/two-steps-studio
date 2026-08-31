"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useIsElectron } from "@/hooks/useElectron";

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
        } else {
          console.log("[useAuth] Session retrieved:", session ? "authenticated" : "not authenticated");
          
          // Save session to Electron storage if running in Electron
          if (isElectron && session && window.electron) {
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
        }

        setSession(session);
        setUser(session?.user ?? null);
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
