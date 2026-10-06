/** The note a transaction gets when logged from a template: the template's
 *  label if it has one (so "Spar" shows up on the entry), else its own note. */
export function templateNote(template: {
  label: string | null;
  notes: string | null;
}): string | null {
  const label = template.label?.trim();
  if (label) return label;
  return template.notes?.trim() || null;
}
