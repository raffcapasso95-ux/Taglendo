import { env } from "@/lib/supabase/env";

/** Indirizzo pubblico del logo del salone (bucket salon-photos), o null se non c'è. */
export const salonLogoUrl = (path: string | null | undefined) => (path ? `${env.url()}/storage/v1/object/public/salon-photos/${path}` : null);
