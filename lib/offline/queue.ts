/**
 * La coda delle modifiche fatte senza rete (D1). Sta nel telefono (localStorage) e parte quando torna la rete.
 * Le modifiche ammesse offline sono due: nuovo appuntamento e cambio di stato. Spostare e annullare servono la rete.
 */

export type QueuedCreate = {
  id: string;
  kind: "create";
  at: number;
  input: {
    clientId?: string;
    newClient?: { name: string; phone: string | null; avatarColor?: number | null };
    serviceId: string;
    memberId: string | null;
    date: string;
    startMin: number;
    /** Prezzo diverso dal listino, in centesimi, e il suo motivo. */
    priceCents?: number | null;
    priceNote?: string | null;
  };
  label: { client: string; service: string };
  error?: string;
};

export type QueuedStatus = {
  id: string;
  kind: "status";
  at: number;
  appointmentId: string;
  status: "confermato" | "completato" | "non_presentato";
  label: { client: string; service: string };
  error?: string;
};

export type QueueItem = QueuedCreate | QueuedStatus;

export const QUEUE_KEY = "tg-offline-queue";
export const SAVED_KEY = "tg-agenda-saved";

/** Dove si salva: il browser, o una finta nei test. */
export type Store = Pick<Storage, "getItem" | "setItem">;

const isItem = (x: unknown): x is QueueItem => {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.id === "string" && (o.kind === "create" || o.kind === "status") && typeof o.at === "number";
};

export function readQueue(store: Store): QueueItem[] {
  try {
    const parsed = JSON.parse(store.getItem(QUEUE_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter(isItem) : [];
  } catch {
    return [];
  }
}

function writeQueue(store: Store, items: QueueItem[]): void {
  try {
    store.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    // memoria piena o bloccata: la modifica resta solo sullo schermo
  }
}

const newId = () => `q${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export function addItem(store: Store, item: Omit<QueuedCreate, "id" | "at"> | Omit<QueuedStatus, "id" | "at">, now = Date.now()): QueueItem {
  const next = { ...item, id: newId(), at: now } as QueueItem;
  writeQueue(store, [...readQueue(store), next]);
  return next;
}

export function removeItem(store: Store, id: string): void {
  writeQueue(store, readQueue(store).filter((i) => i.id !== id));
}

export function markFailed(store: Store, id: string, error: string): void {
  writeQueue(store, readQueue(store).map((i) => (i.id === id ? { ...i, error } : i)));
}

export function clearFailure(store: Store, id: string): void {
  writeQueue(store, readQueue(store).map((i) => {
    if (i.id !== id) return i;
    const { error: _error, ...rest } = i;
    void _error;
    return rest as QueueItem;
  }));
}

/** Un cambio di stato sullo stesso appuntamento sostituisce quello in coda: conta l'ultimo. */
export function addStatus(store: Store, item: Omit<QueuedStatus, "id" | "at">, now = Date.now()): QueueItem {
  writeQueue(store, readQueue(store).filter((i) => !(i.kind === "status" && i.appointmentId === item.appointmentId)));
  return addItem(store, item, now);
}

export type Runner = {
  create: (input: QueuedCreate["input"]) => Promise<{ ok: true } | { ok: false; error: string }>;
  status: (appointmentId: string, status: QueuedStatus["status"]) => Promise<{ ok: true } | { ok: false; error: string }>;
};

export type FlushResult = { sent: number; failed: number; offline: boolean };

/**
 * Manda la coda nell'ordine in cui è stata fatta. Se la rete cade si ferma e tiene il resto;
 * se il server dice di no (orario preso...) segna l'errore e passa oltre: chi guarda decide cosa fare.
 */
export async function flushQueue(store: Store, run: Runner): Promise<FlushResult> {
  const result: FlushResult = { sent: 0, failed: 0, offline: false };
  for (const item of readQueue(store)) {
    if (item.error) continue; // già fallito: aspetta chi l'ha fatto
    try {
      const r = item.kind === "create" ? await run.create(item.input) : await run.status(item.appointmentId, item.status);
      if (r.ok) {
        removeItem(store, item.id);
        result.sent += 1;
      } else {
        markFailed(store, item.id, r.error);
        result.failed += 1;
      }
    } catch {
      result.offline = true; // la rete è caduta a metà: si riprova al prossimo giro
      break;
    }
  }
  return result;
}
