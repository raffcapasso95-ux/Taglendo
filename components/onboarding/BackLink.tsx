import { ButtonLink } from "@/components/ui";
import { onboardingCopy } from "@/lib/copy/onboarding";
import styles from "./Frame.module.css";

/** "Indietro": nei design c'è solo su desktop; sul telefono si torna con il gesto del sistema. */
export function BackLink({ step }: { step: number }) {
  return (
    <ButtonLink href={`/primo-avvio/${step - 1}`} variant="secondary" size="large" className={styles.back}>
      {onboardingCopy.back}
    </ButtonLink>
  );
}
