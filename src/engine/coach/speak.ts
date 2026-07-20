import { COACH } from '../../strings/coach';
import type { Voice } from '../../types';

export function speak(
  triggerId: string,
  voice: Voice,
  ctx: Record<string, string | number | undefined>,
): string {
  const map = COACH[triggerId];
  let template = map?.[voice] ?? map?.real ?? `{${triggerId}}`;
  for (const [k, v] of Object.entries(ctx)) {
    template = template.replaceAll(`{${k}}`, String(v ?? ''));
  }
  return template;
}

export function interpolate(template: string, ctx: Record<string, string | number | undefined>): string {
  let out = template;
  for (const [k, v] of Object.entries(ctx)) {
    out = out.replaceAll(`{${k}}`, String(v ?? ''));
  }
  return out;
}
