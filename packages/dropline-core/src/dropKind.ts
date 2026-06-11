export const DROP_KINDS = ['drop2', 'drop3', 'drop4', 'drop5', 'drop6'] as const;
export type DropKind = (typeof DROP_KINDS)[number];

export const DROP_KIND_META: Record<DropKind, { title: string; description: string }> = {
  drop2: { title: 'Drop 2', description: 'One Sentence' },
  drop3: { title: 'Drop 3', description: 'One Paragraph' },
  drop4: { title: 'Drop 4', description: 'Rest period notes (bullets only)' },
  drop5: { title: 'Drop 5', description: 'Up to 500 words (warning only)' },
  drop6: { title: 'Drop 6', description: 'Full chapter' },
};

export function isDropKind(value: string): value is DropKind {
  return (DROP_KINDS as readonly string[]).includes(value);
}
