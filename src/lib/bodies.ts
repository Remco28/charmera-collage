/**
 * Camera body colorways for the app chrome, after the Charmera's body styles.
 * Picking one re-tints the page accent; it never touches the exported sheet.
 */
export type BodyId = 'sunny' | 'cherry' | 'cobalt' | 'midnight' | 'pop' | 'silver' | 'clear';

export interface Body {
  id: BodyId;
  name: string;
  /** Camera shell color. */
  shell: string;
  /** Page accent (buttons, selection) and the ink that reads on it. */
  accent: string;
  accentInk: string;
  /** Rainbow band across the front, as on the striped bodies. */
  stripes: boolean;
}

/** The Fling-era rainbow, used for stripes and confetti. */
export const RAINBOW = ['#e8402f', '#f68a1e', '#ffc61a', '#8a3fd1', '#2c6fe0'];

export const BODIES: Body[] = [
  { id: 'sunny', name: 'Sunny', shell: '#ffc61a', accent: '#ffc61a', accentInk: '#1d1a24', stripes: true },
  { id: 'cherry', name: 'Cherry', shell: '#ef4130', accent: '#ef4130', accentInk: '#ffffff', stripes: false },
  { id: 'cobalt', name: 'Cobalt', shell: '#2c6fe0', accent: '#2c6fe0', accentInk: '#ffffff', stripes: true },
  { id: 'midnight', name: 'Midnight', shell: '#1d1a24', accent: '#1d1a24', accentInk: '#ffffff', stripes: true },
  { id: 'pop', name: 'Pop', shell: '#fbf8ef', accent: '#ef4130', accentInk: '#ffffff', stripes: false },
  { id: 'silver', name: 'Silver', shell: '#c9ccd4', accent: '#8a3fd1', accentInk: '#ffffff', stripes: true },
  { id: 'clear', name: 'Clear', shell: 'rgba(214,236,244,0.55)', accent: '#5fc4dc', accentInk: '#1d1a24', stripes: false },
];

export function bodyById(id: BodyId): Body {
  return BODIES.find((b) => b.id === id) ?? BODIES[0];
}
