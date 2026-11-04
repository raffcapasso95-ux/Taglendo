import Link from "next/link";
import type { ComponentProps } from "react";
import type { ButtonSize, ButtonVariant } from "./Button";
import { cx } from "./cx";
import styles from "./Button.module.css";

type Props = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

/** Un collegamento con l'aspetto di un Button (un <a>, non un <button> dentro un <a>). */
export function ButtonLink({ variant = "primary", size = "medium", fullWidth = false, className, ...rest }: Props) {
  return (
    <Link
      className={cx(styles.button, styles[variant], styles[size], fullWidth && styles.full, className)}
      {...rest}
    />
  );
}
