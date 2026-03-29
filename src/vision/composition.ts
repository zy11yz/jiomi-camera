import { CompositionAnalysis, BoundingBox } from '../config/types'

export function analyzeComposition(
  subjectBox: BoundingBox | null,
  faceBox: BoundingBox | null
): CompositionAnalysis {
  const issues: CompositionAnalysis['issues'] = []

  if (!subjectBox) {
    return { subjectBox: null, faceBox: null, issues }
  }

  const area = subjectBox.w * subjectBox.h

  // Subject too small
  if (area < 0.05) {
    issues.push('subject_too_small')
  }

  // Subject too large (filling > 95% frame)
  if (area > 0.9) {
    issues.push('subject_too_large')
  }

  // Face cut at top edge
  if (faceBox && faceBox.y < 0.03) {
    issues.push('face_cut')
  }

  // Head room: face too close to top
  if (faceBox) {
    const faceTop = faceBox.y
    if (faceTop < 0.05 && faceTop >= 0.03) {
      issues.push('headroom_bad')
    }
  }

  // Off center: subject center deviates too much
  const cx = subjectBox.x + subjectBox.w / 2
  if (cx < 0.2 || cx > 0.8) {
    issues.push('off_center')
  }

  return { subjectBox, faceBox, issues }
}
