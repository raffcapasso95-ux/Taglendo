/** Promemoria WhatsApp manuali: link `wa.me` (docs/04-regole.md). Testi da design/Taglendo App.dc.html. */

/**
 * Numero per wa.me: solo cifre, con il prefisso del paese.
 * "+39 333 412 8890" → 393334128890; "333 412 8890" e "051 644 2190" (senza prefisso) → +39.
 * Null se non sembra un numero.
 */
export function whatsappNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 6) return null;
  if (trimmed.startsWith("+")) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  return digits.startsWith("39") && digits.length >= 11 ? digits : `39${digits}`;
}

export function whatsappLink(phone: string | null | undefined, text: string): string | null {
  const number = whatsappNumber(phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null;
}

/** "Ciao Luca, ti ricordo l'appuntamento di oggi alle 10:30 da Barberia Saragozza." */
export function reminderText(opts: { clientName: string; dayLabel: string; time: string; salonName: string }): string {
  const first = opts.clientName.trim().split(/\s+/)[0] ?? opts.clientName;
  return `Ciao ${first}, ti ricordo l’appuntamento ${opts.dayLabel} alle ${opts.time} da ${opts.salonName}.`;
}
