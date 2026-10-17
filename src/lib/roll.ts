/**
 * Split photos about to join the roll into those that fit under the cap and
 * those that don't. Every way of adding photos goes through this, against the
 * roll as it is at that moment, so the cap can't be passed by two adds racing.
 */
export function fitRoll<T>(current: number, incoming: T[], max: number): { kept: T[]; dropped: T[] } {
  const room = Math.max(0, max - current);
  return { kept: incoming.slice(0, room), dropped: incoming.slice(room) };
}
