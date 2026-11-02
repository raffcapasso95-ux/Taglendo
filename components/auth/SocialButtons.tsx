import { signInWithProvider } from "@/lib/auth/actions";
import { authCopy } from "@/lib/copy/auth";
import { Button } from "@/components/ui";
import styles from "./SocialButtons.module.css";

const apple = process.env.NEXT_PUBLIC_AUTH_APPLE === "true";
const google = process.env.NEXT_PUBLIC_AUTH_GOOGLE === "true";

/** "oppure" + Apple e Google. Compaiono solo se il provider è acceso nelle variabili d'ambiente. */
export function SocialButtons({ next }: { next?: string }) {
  if (!apple && !google) return null;
  return (
    <>
      <div className={styles.or} role="separator">
        <span />
        {authCopy.signIn.or}
        <span />
      </div>
      <form action={signInWithProvider} className={styles.grid}>
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {apple ? (
          <Button type="submit" name="provider" value="apple" variant="secondary" size="large" fullWidth className={styles.provider}>
            Apple
          </Button>
        ) : null}
        {google ? (
          <Button type="submit" name="provider" value="google" variant="secondary" size="large" fullWidth className={styles.provider}>
            Google
          </Button>
        ) : null}
      </form>
    </>
  );
}
