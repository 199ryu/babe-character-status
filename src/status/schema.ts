export const MODES = ['daily', 'hero', 'fallen', 'ally', 'dark'] as const;
export const SCENARIOS = ['daily', 'corruption', 'ally', 'reversal'] as const;
export const REALITIES = ['clear', 'hazy', 'swapped', 'lost'] as const;
export const PHASES = ['normal', 'after'] as const;

export type Mode = typeof MODES[number];
export type Scenario = typeof SCENARIOS[number];
export type Reality = typeof REALITIES[number];
export type Phase = typeof PHASES[number];
export type Stage = 0 | 1 | 2 | 3 | 4 | 'na';
export type CommandState = { status: 'known' | 'unknown'; items: string[] };
export interface StatusState {
  loc: string | null;
  seen: string | null;
  time: string | null;
  mode: Mode | null;
  scenario: Scenario | null;
  outfit: string | null;
  stage: Stage | null;
  reality: Reality | null;
  reason: string | null;
  arousal: number | null;
  shame: number | null;
  commands: CommandState;
  thought: string | null;
  phase: Phase | null;
  issues: string[];
}
export type ParseResult = { ok: true; state: StatusState } | { ok: false; status: 400 | 414; message: string };
