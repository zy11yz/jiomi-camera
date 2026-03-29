export type EventType =
  | 'session_start'
  | 'mode_selected'
  | 'suggestion_shown'
  | 'suggestion_dismissed'
  | 'photo_captured'
  | 'best_shot_viewed'
  | 'style_applied'
  | 'photo_saved'

export interface TelemetryEvent {
  type: EventType
  payload?: Record<string, unknown>
  timestamp: number
}

const events: TelemetryEvent[] = []

export function track(type: EventType, payload?: Record<string, unknown>) {
  const event: TelemetryEvent = { type, payload, timestamp: Date.now() }
  events.push(event)
  if (import.meta.env.DEV) {
    console.debug('[telemetry]', type, payload ?? '')
  }
}

export function getSessionEvents(): TelemetryEvent[] {
  return [...events]
}

export function getSuggestionAdoptionRate(): number {
  const shown = events.filter(e => e.type === 'suggestion_shown').length
  if (shown === 0) return 0
  const dismissed = events.filter(e => e.type === 'suggestion_dismissed').length
  return (shown - dismissed) / shown
}
