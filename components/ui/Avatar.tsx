import { avatarColor, clientInitials } from "@/lib/rules/avatar";
import { cx } from "./cx";
import styles from "./Avatar.module.css";

type AvatarSize = "sm" | "md" | "lg" | "xl";

type Props = {
  name: string;
  /** Colore scelto (0–4); senza, si ricava dal nome. */
  color?: number | null;
  /** Foto del cliente (indirizzo già firmato), se c'è. */
  photoUrl?: string | null;
  size?: AvatarSize;
  /** Testo al posto delle iniziali (per esempio «+»). */
  text?: string;
  className?: string;
};

const COLOR_CLASS = ["c0", "c1", "c2", "c3", "c4"] as const;

/** Iniziali su un colore, o la foto. Decorativo: il nome sta sempre scritto accanto. */
export function Avatar({ name, color, photoUrl, size = "md", text, className }: Props) {
  return (
    <span
      className={cx(styles.avatar, styles[COLOR_CLASS[avatarColor(name, color)]!], styles[size], photoUrl && styles.photo, className)}
      style={photoUrl ? { backgroundImage: `url("${photoUrl}")` } : undefined}
      aria-hidden="true"
    >
      {photoUrl ? null : (text ?? clientInitials(name))}
    </span>
  );
}
