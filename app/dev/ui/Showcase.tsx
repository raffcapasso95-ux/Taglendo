"use client";

import { useState, type ReactNode } from "react";
import {
  Button,
  Card,
  Checkbox,
  Field,
  Modal,
  Segmented,
  Sheet,
  ToastProvider,
  Toggle,
  useToast,
  type ButtonVariant,
} from "@/components/ui";
import styles from "./Showcase.module.css";

const VARIANTS: Array<{ variant: ButtonVariant; label: string; text: string }> = [
  { variant: "primary", label: "Primario", text: "Fissa appuntamento" },
  { variant: "secondary", label: "Secondario", text: "Tengo l’abbonamento" },
  { variant: "accent", label: "Accent", text: "Prova gratis" },
  { variant: "danger", label: "Pericolo", text: "Disdici" },
];

type AgendaView = "griglia" | "righe" | "elenco";

export function Showcase() {
  return (
    <ToastProvider>
      <Catalog />
    </ToastProvider>
  );
}

function Section({ id, title, source, children }: { id: string; title: string; source: string; children: ReactNode }) {
  return (
    <section id={id} className={styles.section} aria-labelledby={`${id}-t`}>
      <header className={styles.sectionHead}>
        <h2 id={`${id}-t`} className={styles.sectionTitle}>
          {title}
        </h2>
        <p className={styles.source}>{source}</p>
      </header>
      {children}
    </section>
  );
}

function Catalog() {
  const toast = useToast();
  const [view, setView] = useState<AgendaView>("griglia");
  const [book, setBook] = useState(true);
  const [prices, setPrices] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [privacyTouched, setPrivacyTouched] = useState(false);
  const [email, setEmail] = useState("luca.rossi@");
  const [emailTouched, setEmailTouched] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const emailError =
    emailTouched && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Controlla l’indirizzo email." : undefined;

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <p className={styles.eyebrow}>Solo sviluppo · /dev/ui</p>
        <h1 className={styles.h1}>Componenti base</h1>
        <p className={styles.lead}>
          Misure e colori da design/uploads/design-system.html e dai prototipi. Ogni valore viene da
          tokens/tokens.css.
        </p>
      </header>

      <Section id="button" title="Button" source="design-system .btn* · B6 per pericolo">
        <div className={styles.grid}>
          {VARIANTS.map(({ variant, label, text }) => (
            <div key={variant} className={styles.stack}>
              <p className={styles.caption}>{label}</p>
              <Button variant={variant} size="small">
                {text}
              </Button>
              <Button variant={variant}>{text}</Button>
              <Button variant={variant} size="large">
                {text}
              </Button>
              <Button variant={variant} disabled>
                {text}
              </Button>
            </div>
          ))}
        </div>
        <p className={styles.caption}>Piccolo 44 px · standard 48 px · grande 52 px · disabilitato</p>
        <Button fullWidth size="large">
          Conferma prenotazione
        </Button>
      </Section>

      <Section id="field" title="Field" source="design-system .field · errore all’uscita dal campo">
        <div className={styles.grid2}>
          <Field label="Nome e cognome" placeholder="Luca Rossi" autoComplete="name" maxLength={60} />
          <Field
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder="nome@esempio.it"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailTouched(false);
            }}
            onBlur={() => setEmailTouched(true)}
            error={emailError}
          />
          <Field label="Telefono" type="tel" inputMode="tel" placeholder="+39 333 412 8890" hint="Facoltativo" maxLength={20} />
          <Field label="Email" defaultValue="andrea@barberiasaragozza.it" disabled hint="Precompilata dall’invito" />
        </div>
      </Section>

      <Section id="segmented" title="Segmented" source="design-system .segmented">
        <Segmented
          label="Vista dell’agenda"
          value={view}
          onChange={setView}
          options={[
            { value: "griglia", label: "Griglia" },
            { value: "righe", label: "Righe" },
            { value: "elenco", label: "Elenco" },
          ]}
        />
        <Segmented
          label="Passo degli orari"
          value="15"
          onChange={() => {}}
          fullWidth
          options={[
            { value: "15", label: "Ogni 15 minuti" },
            { value: "30", label: "Ogni 30 minuti" },
          ]}
        />
      </Section>

      <Section id="toggle" title="Toggle" source="Sito Barberia Saragozza · preferenze cookie">
        <Card flush className={styles.narrow}>
          <Toggle
            label="Prenotazione online"
            description="I clienti prenotano dal link."
            checked={book}
            onChange={setBook}
          />
          <Toggle
            label="Statistiche"
            description="Pagine più viste, in forma anonima."
            checked={prices}
            onChange={setPrices}
          />
          <Toggle label="Disattivato" checked={false} onChange={() => {}} disabled />
        </Card>
      </Section>

      <Section id="checkbox" title="Checkbox" source="casella privacy della prenotazione">
        <div className={styles.narrow}>
          <Checkbox
            checked={privacy}
            onChange={(v) => {
              setPrivacy(v);
              setPrivacyTouched(true);
            }}
            error={privacyTouched && !privacy ? "Conferma di aver letto l’informativa per prenotare." : undefined}
          >
            Ho letto l’<u>informativa privacy</u> del salone.
          </Checkbox>
          <Checkbox checked onChange={() => {}}>
            Voglio ricevere offerte e novità dal salone.
          </Checkbox>
        </div>
      </Section>

      <Section id="card" title="Card" source="design-system .surface">
        <div className={styles.grid2}>
          <Card>
            <h3 className={styles.cardTitle}>Taglio uomo</h3>
            <p className={styles.cardText}>30 min · 20 €</p>
          </Card>
          <Card>
            <h3 className={styles.cardTitle}>Taglio sfumato con disegno a mano libera e rifinitura a rasoio</h3>
            <p className={styles.cardText}>1 h 15 min · 45 €</p>
          </Card>
        </div>
      </Section>

      <Section id="overlay" title="Sheet, Modal e Toast" source="Taglendo App (foglio, toast) · B6-D (finestra)">
        <div className={styles.row}>
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>
            Apri il foglio (telefono)
          </Button>
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Apri la finestra (desktop)
          </Button>
          <Button
            variant="secondary"
            onClick={() => toast("Appuntamento annullato", "L’orario è di nuovo libero sul link")}
          >
            Mostra un avviso
          </Button>
          <Button variant="secondary" onClick={() => toast("Nota salvata")}>
            Avviso breve
          </Button>
        </div>
      </Section>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Nuovo appuntamento"
        footer={
          <>
            <Button variant="secondary" size="large" onClick={() => setSheetOpen(false)}>
              Annulla
            </Button>
            <Button
              size="large"
              onClick={() => {
                setSheetOpen(false);
                toast("Appuntamento fissato", "Oggi, 15:30 · Andrea");
              }}
            >
              Fissa
            </Button>
          </>
        }
      >
        <Field label="Cliente" placeholder="Cerca per nome o telefono" />
        <Segmented
          label="Operatore"
          value="andrea"
          onChange={() => {}}
          fullWidth
          options={[
            { value: "andrea", label: "Andrea" },
            { value: "marco", label: "Marco" },
            { value: "simone", label: "Simone" },
          ]}
        />
      </Sheet>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Disdire il piano Salone?"
        footer={
          <>
            <Button variant="secondary" size="large" onClick={() => setModalOpen(false)}>
              Tengo l’abbonamento
            </Button>
            <Button variant="danger" size="large" onClick={() => setModalOpen(false)}>
              Disdici
            </Button>
          </>
        }
      >
        <ul className={styles.list}>
          <li>Resta attivo fino al 12 dicembre.</li>
          <li>Dopo, la tua pagina mostra solo listino e telefono.</li>
          <li>Agenda e clienti restano consultabili per 12 mesi; puoi esportarli quando vuoi.</li>
        </ul>
      </Modal>
    </main>
  );
}
