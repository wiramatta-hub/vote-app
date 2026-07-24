export const REPRESENTATIVES = [
  'คุณภูวกฤต์',
  'คุณประกิจ',
  'คุณกมลรัตน์',
  'คุณอริยะ',
  'คุณอัญชลี',
] as const;

export type RepresentativeName = (typeof REPRESENTATIVES)[number];
export type RepresentativeDecision = 'approve' | 'reject';

export interface RepresentativeVote {
  representative: RepresentativeName;
  decision: RepresentativeDecision;
}

export function normalizeRepresentativeVotes(value: unknown): RepresentativeVote[] {
  if (!Array.isArray(value)) return [];

  const names = new Set<string>(REPRESENTATIVES);
  const entries = new Map<RepresentativeName, RepresentativeVote>();

  for (const item of value) {
    if (!item || typeof item !== 'object') continue;

    const representative = String((item as { representative?: unknown }).representative ?? '');
    const decision = String((item as { decision?: unknown }).decision ?? '');

    if (!names.has(representative)) continue;
    if (decision !== 'approve' && decision !== 'reject') continue;

    entries.set(representative as RepresentativeName, {
      representative: representative as RepresentativeName,
      decision,
    });
  }

  return REPRESENTATIVES
    .map((representative) => entries.get(representative))
    .filter((vote): vote is RepresentativeVote => Boolean(vote));
}

export function hasCompleteRepresentativeVotes(votes: RepresentativeVote[]) {
  return votes.length === REPRESENTATIVES.length;
}