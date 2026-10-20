import { createContext, use, useCallback, useEffect, useState, type PropsWithChildren } from 'react';

import { useSession } from '@/components/session-provider';
import { supabase } from '@/lib/supabase';

export type Business = {
  id: string;
  name: string;
  google_review_url: string | null;
  message_template: string;
};

type BusinessContextValue = {
  /** The logged-in owner's business, or null if they haven't set it up yet. */
  business: Business | null;
  /** True while we're loading the business after log in. */
  isLoading: boolean;
  /** A problem loading the business (for example, no internet). */
  loadError: string | null;
  reload: () => Promise<void>;
};

type Loaded = { userId: string; business: Business | null; error: string | null };

const BusinessContext = createContext<BusinessContextValue | null>(null);

export function useBusiness() {
  const value = use(BusinessContext);
  if (!value) {
    throw new Error('useBusiness must be used inside <BusinessProvider>');
  }
  return value;
}

async function fetchBusiness(userId: string): Promise<Loaded> {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, google_review_url, message_template')
    .eq('owner_id', userId)
    .maybeSingle();
  return { userId, business: data, error: error ? error.message : null };
}

// Loads the logged-in owner's business. Row-level security means Supabase only
// ever returns the owner's own business, never anyone else's.
export function BusinessProvider({ children }: PropsWithChildren) {
  const { session } = useSession();
  const userId = session?.user.id;
  // Remembers which owner it was loaded for, so a fresh log in counts as loading
  // straight away (instead of briefly looking like "no business yet").
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!userId) return;
    let current = true;
    fetchBusiness(userId).then((result) => {
      if (current) setLoaded(result);
    });
    return () => {
      current = false;
    };
  }, [userId]);

  const reload = useCallback(async () => {
    if (userId) setLoaded(await fetchBusiness(userId));
  }, [userId]);

  const isCurrent = !!userId && loaded?.userId === userId;

  return (
    <BusinessContext
      value={{
        business: isCurrent ? loaded.business : null,
        isLoading: !!userId && !isCurrent,
        loadError: isCurrent ? loaded.error : null,
        reload,
      }}>
      {children}
    </BusinessContext>
  );
}
