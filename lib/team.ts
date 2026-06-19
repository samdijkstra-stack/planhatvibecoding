// The CSMs that can be @mentioned in comments. Only Sam has a real login;
// the others are data-only teammates for the demo.
export const TEAM_MEMBERS: Array<{ name: string; role: string; initial: string }> = [
  { name: 'Sam Dijkstra', role: 'CS Manager', initial: 'S' },
  { name: 'Lina Carlsson', role: 'Senior CSM', initial: 'L' },
  { name: 'Daniel Park', role: 'Senior CSM', initial: 'D' },
  { name: 'Maya Lopez', role: 'CSM', initial: 'M' },
];

export const TEAM_NAMES = TEAM_MEMBERS.map((m) => m.name);

// Extract @mentions from a comment body by matching against known team names.
export function extractMentions(body: string): string[] {
  return TEAM_NAMES.filter((name) => body.includes(`@${name}`));
}
