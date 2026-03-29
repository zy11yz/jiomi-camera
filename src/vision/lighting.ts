import { LightingAnalysis, BoundingBox } from '../config/types'

export function analyzeLighting(
  imageData: ImageData,
  faceBox: BoundingBox | null
): LightingAnalysis {
  const { width, height, data } = imageData
  let totalBrightness = 0
  const n = data.length / 4

  for (let i = 0; i < data.length; i += 4) {
    totalBrightness += (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114)
  }
  const avgBrightness = totalBrightness / n

  let faceBrightness: number | null = null
  let backgroundBrightness: number | null = null

  if (faceBox) {
    const fx = Math.floor(faceBox.x * width)
    const fy = Math.floor(faceBox.y * height)
    const fw = Math.floor(faceBox.w * width)
    const fh = Math.floor(faceBox.h * height)

    let sum = 0, count = 0
    for (let y = fy; y < Math.min(fy + fh, height); y++) {
      for (let x = fx; x < Math.min(fx + fw, width); x++) {
        const idx = (y * width + x) * 4
        sum += data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114
        count++
      }
    }
    faceBrightness = count > 0 ? sum / count : null

    // Background: top strip above face
    let bgSum = 0, bgCount = 0
    const bgY = Math.max(0, fy - fh)
    for (let y = bgY; y < fy; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        bgSum += data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114
        bgCount++
      }
    }
    backgroundBrightness = bgCount > 0 ? bgSum / bgCount : null
  }

  const issues: LightingAnalysis['issues'] = []

  if (avgBrightness < 40) {
    issues.push('too_dark')
  } else if (avgBrightness > 220) {
    issues.push('overexposed')
  }

  if (faceBrightness !== null) {
    if (faceBrightness < 60) {
      issues.push('face_too_dark')
    }
    if (backgroundBrightness !== null && backgroundBrightness > faceBrightness + 70) {
      issues.push('backlight')
    }
  }

  return { avgBrightness, faceBrightness, backgroundBrightness, issues }
}
