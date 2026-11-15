"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { rememberSearch } from "@/lib/search/lastSearch";

/** Non disegna niente: ricorda l'indirizzo della ricerca (con i filtri), così dalla pagina di un salone si può tornare ai risultati. */
export function RememberSearch() {
  const path = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    rememberSearch(search ? `${path}?${search}` : path);
  }, [path, search]);
  return null;
}
