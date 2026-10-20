import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, use, useEffect, useRef, useState, type PropsWithChildren } from 'react';

import { readAuthParams } from '@/lib/auth-link';
import { supabase } from '@/lib/supabase';

type SessionContextValue = {
  /** The logged-in owner, or null when logged out. */
  session: Session | null;
  /** True until we've checked the phone for a saved login. */
  isLoading: boolean;
  /** A problem with the login link the owner tapped (for example, it expired). */
  linkError: string | null;
  clearLinkError: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const value = use(SessionContext);
  if (!value) {
    throw new Error('useSession must be used inside <SessionProvider>');
  }
  return value;
}

// Keeps track of who is logged in, and logs the owner in when they tap the link in their email.
export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);
  const handledUrl = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function handleUrl(url: string | null) {
      if (!url || url === handledUrl.current) return;
      handledUrl.current = url;

      const params = readAuthParams(url);
      if (params.error_code || params.error) {
        setLinkError(
          params.error_code === 'otp_expired'
            ? 'That login link has expired or was already used. Send yourself a new one.'
            : (params.error_description ?? 'That login link didn’t work. Send yourself a new one.'),
        );
        return;
      }
      if (!params.access_token || !params.refresh_token) return;

      const { error } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      setLinkError(error ? error.message : null);
    }

    // The link can open the app from scratch, or arrive while the app is already open.
    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, []);

  return (
    <SessionContext
      value={{ session, isLoading, linkError, clearLinkError: () => setLinkError(null) }}>
      {children}
    </SessionContext>
  );
}
