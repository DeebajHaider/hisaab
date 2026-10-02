import { esc, formatNumber } from "./transaction-export";
import type { TransactionWithRelations } from "@/queries/use-transactions";

const HEADER = [
  "date",
  "category",
  "item",
  "unit",
  "person",
  "amount",
  "rate",
  "qty",
  "notes",
];

/**
 * Serialize Ledger rows to a CSV string. Richer than buildTransactionCSV
 * (transaction-export.ts) — includes unit and person, which
 * TransactionWithRelations already carries from the joined query — but
 * shares the same raw-value conventions (plain numbers via formatNumber,
 * ISO dates as-is, no locale formatting) since this is for spreadsheet
 * analysis, not re-import.
 */
export function buildLedgerCSV(transactions: TransactionWithRelations[]): string {
  const lines = [HEADER.join(",")];

  for (const t of transactions) {
    lines.push(
      [
        esc(t.date),
        esc(t.category?.name ?? ""),
        esc(t.item?.name ?? ""),
        esc(t.item?.unit ?? ""),
        esc(t.person?.name ?? ""),
        esc(formatNumber(t.amount)),
        esc(t.rate === null ? "" : formatNumber(t.rate)),
        esc(t.qty === null ? "" : formatNumber(t.qty)),
        esc(t.notes ?? ""),
      ].join(","),
    );
  }

  return lines.join("\n") + "\n";
}
