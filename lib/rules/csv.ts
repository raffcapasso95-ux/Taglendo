/** CSV per Excel italiano: separatore “;”, BOM iniziale, fine riga CRLF. */

/** Una cella che inizia con = + - @ (o tab/ritorno) verrebbe letta come formula: la si disinnesca con un apice. */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text) && !(typeof value === "number")) text = `'${text}`;
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const csvRow = (cells: Array<string | number | null | undefined>) => cells.map(csvCell).join(";");

export const csvFile = (rows: string[]) => `﻿${rows.join("\r\n")}\r\n`;

/** 2026-10-20 → 20/10/2026 */
export const csvDate = (date: string | null | undefined) => (date ? `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}` : "");

export const csvEuros = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

/** Nome del file: senza accenti né simboli. */
export const csvFileName = (base: string, date: string) =>
  `${base.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "clienti"}-${date}.csv`;
