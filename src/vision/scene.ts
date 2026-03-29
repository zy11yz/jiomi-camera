import { SceneType } from '../config/types'

export interface ScenePrediction {
  scene: SceneType
  confidence: number
}

/**
 * Mock scene classifier using simple pixel statistics.
 * In production: replace with MobileNetV3 / ONNX model.
 */
export function predictScene(
  imageData: ImageData,
  hint?: string
): ScenePrediction {
  const pixels = imageData.data
  let totalR = 0, totalG = 0, totalB = 0
  const n = pixels.length / 4

  for (let i = 0; i < pixels.length; i += 4) {
    totalR += pixels[i]
    totalG += pixels[i + 1]
    totalB += pixels[i + 2]
  }

  const avgR = totalR / n
  const avgG = totalG / n
  const avgB = totalB / n
  const brightness = (avgR + avgG + avgB) / 3

  // Simple heuristic rules
  if (hint === 'food') {
    return { scene: 'food', confidence: 0.9 }
  }
  if (hint === 'night' || brightness < 50) {
    return { scene: 'night', confidence: 0.85 }
  }
  if (brightness > 200) {
    return { scene: 'backlight', confidence: 0.7 }
  }
  // Warm tones -> cafe
  if (avgR > avgB + 30 && avgG > avgB + 10 && brightness > 80) {
    return { scene: 'cafe', confidence: 0.65 }
  }
  // Blue/cool -> street/travel
  if (avgB > avgR + 10 && brightness > 100) {
    return { scene: 'street', confidence: 0.6 }
  }

  return { scene: 'indoor', confidence: 0.55 }
}
