import { MODES, SCENARIOS, REALITIES, PHASES } from './schema.ts';
import type { CommandState, ParseResult, Stage } from './schema.ts';

const MAX_URL_BYTES = 8192;
const SINGLETON_KEYS = new Set([
  'loc', 'seen', 'time', 'mode', 'scenario', 'outfit', 'stage',
  'reality', 'reason', 'arousal', 'shame', 'commands', 'thought', 'phase',
]);

/** Parse one complete snapshot. Never recover values from a previous request. */
export function parseStatus(url: URL): ParseResult {
  if (new TextEncoder().encode(url.href).byteLength > MAX_URL_BYTES) {
    return { ok: false, status: 414, message: '상태 URL이 허용 길이를 초과했습니다.' };
  }

  const params = url.searchParams;
  const encountered = new Set<string>();
  for (const key of params.keys()) {
    if (!SINGLETON_KEYS.has(key)) continue;
    if (encountered.has(key)) {
      return { ok: false, status: 400, message: '중복된 상태 항목이 있습니다.' };
    }
    encountered.add(key);
  }

  const issues: string[] = [];
  const noteInvalid = (key: string, raw: string | null) => {
    issues.push(`${key}:${raw === null || raw === '' ? 'missing' : raw === 'unknown' ? 'unknown' : 'invalid'}`);
  };
  const text = (key: string, optional = false): string | null => {
    const raw = params.get(key);
    if (raw === null || raw.trim() === '') {
      if (!optional) noteInvalid(key, raw);
      return null;
    }
    // Preserve the original whitespace and punctuation of nonempty text.
    return raw;
  };
  const enumeration = <T extends readonly string[]>(key: string, values: T): T[number] | null => {
    const raw = params.get(key);
    if (raw !== null && values.includes(raw)) return raw as T[number];
    noteInvalid(key, raw);
    return null;
  };
  const integer = (key: string, max: number, step: number): number | null => {
    const raw = params.get(key);
    if (raw !== null && /^(0|[1-9][0-9]*)$/.test(raw)) {
      const value = Number(raw);
      if (Number.isSafeInteger(value) && value <= max && value % step === 0) return value;
    }
    noteInvalid(key, raw);
    return null;
  };

  const loc = text('loc');
  const seen = text('seen', true);
  const time = text('time');
  const mode = enumeration('mode', MODES);
  const scenario = enumeration('scenario', SCENARIOS);
  const outfit = text('outfit');
  let stage: Stage | null = params.get('stage') === 'na' ? 'na' : integer('stage', 4, 1) as Stage | null;
  // Only known scenarios can establish a contradictory combination. Do not
  // guess a scenario from mode, or erase a valid stage when scenario is unknown.
  if (stage !== null && scenario !== null) {
    const valid = scenario === 'daily' ? stage === 0
      : scenario === 'corruption' ? stage !== 'na'
      : stage === 'na';
    if (!valid) {
      stage = null;
      issues.push('stage:scenario-mismatch');
    }
  }
  const reality = enumeration('reality', REALITIES);
  const reason = text('reason', true);
  const arousal = integer('arousal', 100, 10);
  const shame = integer('shame', 100, 10);
  const rawCommands = params.get('commands');
  const items = params.getAll('cmd').filter(item => item.trim() !== '');
  const commands: CommandState = { status: rawCommands === 'known' ? 'known' : 'unknown', items };
  if (rawCommands !== 'known') noteInvalid('commands', rawCommands);
  if (rawCommands === 'unknown' && items.length > 0) issues.push('commands:conflict');
  const thought = text('thought');
  const phase = enumeration('phase', PHASES);

  // URLSearchParams has already decoded exactly once. XML escaping belongs to
  // the renderer, not the transport parser. No game rules or logging here.
  return { ok: true, state: {
    loc, seen, time, mode, scenario, outfit, stage, reality, reason,
    arousal, shame, commands, thought, phase, issues,
  } };
}
