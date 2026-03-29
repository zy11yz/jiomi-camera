export type ShootingMode = 'selfie' | 'portrait' | 'food' | 'night' | 'travel'

export type SceneType =
  | 'indoor'
  | 'cafe'
  | 'street'
  | 'night'
  | 'backlight'
  | 'portrait'
  | 'group'
  | 'food'
  | 'travel'

export type SubjectType = 'person' | 'group' | 'food' | 'landscape' | 'none'

export interface BoundingBox {
  x: number      // 0..1 normalized
  y: number
  w: number
  h: number
}

export interface PoseAnalysis {
  detected: boolean
  keypoints: { name: string; x: number; y: number; score: number }[]
  issues: PoseIssue[]
}

export type PoseIssue =
  | 'chin_down'
  | 'shoulder_flat'
  | 'arms_stiff'
  | 'head_cut'
  | 'too_front_facing'
  | 'legs_stiff'

export interface CompositionAnalysis {
  subjectBox: BoundingBox | null
  faceBox: BoundingBox | null
  issues: CompositionIssue[]
}

export type CompositionIssue =
  | 'subject_too_small'
  | 'subject_too_large'
  | 'face_cut'
  | 'headroom_bad'
  | 'background_cluttered'
  | 'off_center'

export interface LightingAnalysis {
  avgBrightness: number   // 0..255
  faceBrightness: number | null
  backgroundBrightness: number | null
  issues: LightingIssue[]
}

export type LightingIssue =
  | 'face_too_dark'
  | 'backlight'
  | 'overexposed'
  | 'too_dark'

export interface FrameAnalysis {
  scene: SceneType
  subject: SubjectType
  pose: PoseAnalysis
  composition: CompositionAnalysis
  lighting: LightingAnalysis
  timestamp: number
}

export interface Suggestion {
  id: string
  priority: number      // 1=critical, 2=important, 3=enhancement
  category: 'pose' | 'composition' | 'lighting' | 'system'
  text: string
  emoji: string
}
