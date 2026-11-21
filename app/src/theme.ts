// Same palette as the web dex: a dark board with a brass accent and one colour per move type.
export const colors = {
  bg: '#0e1320',
  bg2: '#141b2c',
  panel: '#182033',
  screen: '#0c1a21',
  line: '#2a3552',
  ink: '#e7eaf3',
  muted: '#8d97b0',
  brass: '#d9b46c',
  brassSoft: 'rgba(217, 180, 108, 0.16)',
  gap: '#f2766d',
  sub: '#f2766d',
  sweep: '#4fcbb2',
  pass: '#6fb2ff',
  move: '#b58df2',
  escape: '#a3adc4',
} as const;

export const typeColor = (t: 'sub' | 'sweep' | 'pass' | 'move' | 'escape') => colors[t];

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 6, md: 10, lg: 14 } as const;
