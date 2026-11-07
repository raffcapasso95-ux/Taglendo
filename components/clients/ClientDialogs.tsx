"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button, Field, ResponsiveDialog, useToast } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import avatarStyles from "@/components/ui/Avatar.module.css";
import fieldStyles from "@/components/ui/Field.module.css";
import dialogs from "@/components/agenda/Dialogs.module.css";
import { createClientRecord, setClientColor } from "@/lib/clients/actions";
import { removeClientPhoto, setClientPhoto } from "@/lib/clients/photo";
import { resizePhoto } from "@/lib/clients/resizeImage";
import { agendaCopy } from "@/lib/copy/agenda";
import { AVATAR_COLOR_NAMES, avatarColor, clientInitials } from "@/lib/rules/avatar";
import { LIMITS } from "@/lib/rules/forms";
import styles from "./Clients.module.css";

const flow = agendaCopy.flow;

/** Anteprima di una foto scelta: il file ridimensionato e il suo indirizzo temporaneo. */
type Picked = { blob: Blob; url: string };

function usePhoto() {
  const toast = useToast();
  const [photo, setPhoto] = useState<Picked | null>(null);
  useEffect(
    () => () => {
      if (photo) URL.revokeObjectURL(photo.url);
    },
    [photo],
  );
  const choose = async (file: File | undefined) => {
    if (!file) return;
    try {
      const blob = await resizePhoto(file);
      setPhoto({ blob, url: URL.createObjectURL(blob) });
      toast(flow.photoAdded, flow.photoAddedSub);
    } catch {
      toast(flow.photoError);
    }
  };
  return { photo, setPhoto, choose };
}

const photoForm = (blob: Blob) => {
  const form = new FormData();
  form.set("photo", new File([blob], "foto.jpg", { type: "image/jpeg" }));
  return form;
};

function Swatches({ value, onPick }: { value: number | null; onPick: (i: number) => void }) {
  return (
    <div className={avatarStyles.swatches} role="group" aria-label={flow.colorGroup}>
      {AVATAR_COLOR_NAMES.map((n, i) => (
        <button key={n} type="button" className={cx(avatarStyles.swatch, avatarStyles[`c${i}` as "c0"], value === i && avatarStyles.swatchOn)} aria-pressed={value === i} aria-label={n} onClick={() => onPick(i)} />
      ))}
    </div>
  );
}

/** «+ Nuovo» nella rubrica: foto o colore, nome, telefono e una nota privata. */
export function NewClientDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const { photo, setPhoto, choose } = usePhoto();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [color, setColor] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();

  const save = (thenBook: boolean) =>
    start(async () => {
      setError(null);
      if (!name.trim()) return setError(agendaCopy.errors.clientName);
      const result = await createClientRecord({ name, phone, note, avatarColor: color });
      if (!result.ok) return setError(result.error);
      if (photo) await setClientPhoto(result.id, photoForm(photo.blob)).catch(() => null);
      if (thenBook) return router.push(`/agenda?nuovo=${result.id}`);
      toast("Cliente salvato", result.name);
      onClose();
      router.refresh();
    });

  return (
    <ResponsiveDialog
      open
      onClose={onClose}
      title="Nuovo cliente"
      sheetClassName={styles.sheetAuto}
      footer={
        <div className={dialogs.footerButtons}>
          <Button variant="secondary" size="large" onClick={onClose}>
            Annulla
          </Button>
          <Button size="large" disabled={saving} onClick={() => save(false)}>
            Salva cliente
          </Button>
        </div>
      }
    >
      <div className={dialogs.form}>
        <div className={avatarStyles.picker}>
          <Avatar name={name || "+"} color={color} photoUrl={photo?.url} size="lg" text={name.trim() ? clientInitials(name) : "+"} />
          <div className={avatarStyles.pickerSide}>
            <label className={avatarStyles.photoButton} htmlFor="nc-foto">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
                <circle cx="12" cy="12.5" r="3.5" />
              </svg>
              <span>{flow.addPhoto}</span>
            </label>
            <input id="nc-foto" className={avatarStyles.fileInput} type="file" accept="image/*" capture="user" onChange={(e) => void choose(e.target.files?.[0])} />
            <Swatches
              value={color}
              onPick={(i) => {
                setColor(i);
                setPhoto(null);
              }}
            />
          </div>
        </div>
        <p className={dialogs.hint}>Foto e colore servono a riconoscerlo al volo in agenda. La foto la vedete solo tu e il tuo staff.</p>
        <Field size="large" label="Nome" maxLength={LIMITS.clientName} value={name} onChange={(e) => setName(e.target.value)} error={error ?? undefined} />
        <Field size="large" label="Telefono · facoltativo, per WhatsApp" type="tel" inputMode="tel" maxLength={LIMITS.phone} value={phone} onChange={(e) => setPhone(e.target.value)} />
        <div className={cx(fieldStyles.field, fieldStyles.fieldLarge)}>
          <label htmlFor="nc-note" className={fieldStyles.label}>
            Preferenze e note private · facoltativo
          </label>
          <textarea id="nc-note" className={styles.textarea} rows={3} maxLength={LIMITS.clientNote} placeholder="Es. sfumatura bassa, niente riga" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button type="button" className={dialogs.linkButton} disabled={saving} onClick={() => save(true)}>
          Salva e fissa un appuntamento
        </button>
      </div>
    </ResponsiveDialog>
  );
}

type PhotoProps = { clientId: string; name: string; color: number | null; photoUrl: string | null; onClose: () => void };

/** «Foto di Alessio»: scatta, scegli dalla galleria, oppure iniziali con un colore. */
export function ClientPhotoDialog({ clientId, name, color, photoUrl, onClose }: PhotoProps) {
  const router = useRouter();
  const toast = useToast();
  const { photo, setPhoto, choose } = usePhoto();
  const [picked, setPicked] = useState<number | null>(color);
  const [keepOld, setKeepOld] = useState(Boolean(photoUrl));
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const first = name.trim().split(/\s+/)[0] ?? name;
  const shownColor = avatarColor(name, picked);
  const shownPhoto = photo?.url ?? (keepOld ? photoUrl : null);

  const save = () =>
    start(async () => {
      setError(null);
      if (photo) {
        const r = await setClientPhoto(clientId, photoForm(photo.blob));
        if (!r.ok) return setError(r.error);
      } else if (!keepOld && photoUrl) {
        const r = await removeClientPhoto(clientId);
        if (!r.ok) return setError(r.error);
      }
      if (picked !== null && picked !== color) {
        const r = await setClientColor(clientId, picked);
        if (!r.ok) return setError(r.error);
      }
      toast("Foto aggiornata");
      onClose();
      router.refresh();
    });

  return (
    <ResponsiveDialog
      open
      onClose={onClose}
      title={`Foto di ${first}`}
      sheetClassName={styles.sheetAuto}
      footer={
        <div className={dialogs.footerButtons}>
          <Button variant="secondary" size="large" onClick={onClose}>
            Annulla
          </Button>
          <Button size="large" disabled={saving} onClick={save}>
            Salva
          </Button>
        </div>
      }
    >
      <div className={cx(dialogs.form, styles.photoForm)}>
        <Avatar name={name} color={shownColor} photoUrl={shownPhoto} size="xl" />
        <div className={styles.photoActions}>
          <label className={styles.photoAction} htmlFor="pf-camera">
            <span className={styles.quickIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
                <circle cx="12" cy="12.5" r="3.5" />
              </svg>
            </span>
            Scatta una foto
          </label>
          <input id="pf-camera" className={avatarStyles.fileInput} type="file" accept="image/*" capture="user" onChange={(e) => void choose(e.target.files?.[0])} />
          <label className={styles.photoAction} htmlFor="pf-galleria">
            <span className={styles.quickIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
                <circle cx="9" cy="10" r="1.7" />
                <path d="m4.5 17 4.5-4.2 3.5 3 3-2.6L20 16.5" />
              </svg>
            </span>
            Scegli dalla galleria
          </label>
          <input id="pf-galleria" className={avatarStyles.fileInput} type="file" accept="image/*" onChange={(e) => void choose(e.target.files?.[0])} />
        </div>
        <p className={dialogs.timeGroupTitle}>Oppure usa le iniziali, con un colore</p>
        <Swatches
          value={shownPhoto ? null : shownColor}
          onPick={(i) => {
            setPicked(i);
            setPhoto(null);
            setKeepOld(false);
          }}
        />
        <p className={dialogs.hint}>Chiedi prima il permesso a {first}: la foto resta nel gestionale e non compare nella pagina pubblica.</p>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </ResponsiveDialog>
  );
}
