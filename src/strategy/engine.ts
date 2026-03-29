import { FrameAnalysis, Suggestion } from '../config/types'
import rules from '../config/rules.json'

type RuleCategory = 'pose' | 'composition' | 'lighting'
type RuleSet = Record<string, { enabled: boolean; text: string; emoji: string; priority: number }>

const allRules: Record<RuleCategory, RuleSet> = {
  pose: rules.pose as RuleSet,
  composition: rules.composition as RuleSet,
  lighting: rules.lighting as RuleSet,
}

interface EngineState {
  lastSuggestions: Suggestion[]
  lastSwitchTime: number
  issueStableCount: Record<string, number>
  suppressedUntil: Record<string, number>
}

const state: EngineState = {
  lastSuggestions: [],
  lastSwitchTime: 0,
  issueStableCount: {},
  suppressedUntil: {},
}

const policy = rules.suggestionPolicy

function makeSuggestion(category: RuleCategory, issueId: string): Suggestion | null {
  const rule = allRules[category]?.[issueId]
  if (!rule || !rule.enabled) return null
  return {
    id: `${category}:${issueId}`,
    priority: rule.priority,
    category,
    text: rule.text,
    emoji: rule.emoji,
  }
}

export function rankSuggestions(analysis: FrameAnalysis): Suggestion[] {
  const now = Date.now()
  const candidates: Suggestion[] = []

  // Gather all active issues
  const activeIssues: { category: RuleCategory; id: string }[] = []
  for (const id of analysis.lighting.issues) {
    activeIssues.push({ category: 'lighting', id })
  }
  for (const id of analysis.composition.issues) {
    activeIssues.push({ category: 'composition', id })
  }
  for (const id of analysis.pose.issues) {
    activeIssues.push({ category: 'pose', id })
  }

  // Update stable frame counts - increment present issues, reset absent ones
  const activeSet = new Set(activeIssues.map(i => `${i.category}:${i.id}`))
  for (const key of Object.keys(state.issueStableCount)) {
    if (!activeSet.has(key)) {
      state.issueStableCount[key] = 0
    }
  }
  for (const { category, id } of activeIssues) {
    const key = `${category}:${id}`
    state.issueStableCount[key] = (state.issueStableCount[key] ?? 0) + 1
  }

  // Only promote stable issues
  for (const { category, id } of activeIssues) {
    const key = `${category}:${id}`
    if ((state.issueStableCount[key] ?? 0) < policy.stableFramesRequired) continue
    if (now < (state.suppressedUntil[key] ?? 0)) continue

    const s = makeSuggestion(category, id)
    if (s) candidates.push(s)
  }

  // Sort by priority asc (1=critical first)
  candidates.sort((a, b) => a.priority - b.priority)

  // Rate limit switching
  if (
    now - state.lastSwitchTime < policy.minSwitchIntervalMs &&
    state.lastSuggestions.length > 0
  ) {
    // Keep last suggestions if they're still active
    const stillActive = state.lastSuggestions.filter(s =>
      candidates.some(c => c.id === s.id)
    )
    if (stillActive.length > 0) return stillActive.slice(0, 2)
  }

  const result = candidates.slice(0, policy.maxPrimary + policy.maxSecondary)
  if (result.length > 0) {
    state.lastSuggestions = result
    state.lastSwitchTime = now
  } else {
    state.lastSuggestions = []
  }

  return result
}

export function suppressSuggestion(id: string) {
  state.suppressedUntil[id] = Date.now() + policy.suppressAfterAdoptMs
}

export function resetEngineState() {
  state.lastSuggestions = []
  state.lastSwitchTime = 0
  state.issueStableCount = {}
  state.suppressedUntil = {}
}
