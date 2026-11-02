/** Unisce classi CSS ignorando i valori vuoti. */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
