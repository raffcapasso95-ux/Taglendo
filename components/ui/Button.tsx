import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "accent" | "danger";
export type ButtonSize = "small" | "medium" | "large";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  /** small 44 px · medium 48 px (standard) · large 52 px (azioni principali su telefono e nelle finestre) */
  size?: ButtonSize;
  fullWidth?: boolean;
};

export function Button({
  variant = "primary",
  size = "medium",
  fullWidth = false,
  type = "button",
  className,
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={cx(
        styles.button,
        styles[variant],
        styles[size],
        fullWidth && styles.full,
        className,
      )}
      {...rest}
    />
  );
}
