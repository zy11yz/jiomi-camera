import type { PoseDetector, Pose } from '@tensorflow-models/pose-detection'
import { PoseAnalysis, PoseIssue, BoundingBox } from '../config/types'

let detector: PoseDetector | null = null
let loadPromise: Promise<PoseDetector> | null = null

export async function getPoseDetector(): Promise<PoseDetector> {
  if (detector) return detector
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    const poseDetection = await import('@tensorflow-models/pose-detection')
    await import('@tensorflow/tfjs-backend-webgl')
    const tf = await import('@tensorflow/tfjs-core')
    await tf.ready()

    const d = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      }
    )
    detector = d
    return d
  })()

  return loadPromise
}

export async function detectPose(
  videoElement: HTMLVideoElement
): Promise<{ analysis: PoseAnalysis; subjectBox: BoundingBox | null; faceBox: BoundingBox | null }> {
  const d = await getPoseDetector()
  let poses: Pose[] = []
  try {
    poses = await d.estimatePoses(videoElement)
  } catch {
    return {
      analysis: { detected: false, keypoints: [], issues: [] },
      subjectBox: null,
      faceBox: null,
    }
  }

  if (!poses.length || !poses[0].keypoints?.length) {
    return {
      analysis: { detected: false, keypoints: [], issues: [] },
      subjectBox: null,
      faceBox: null,
    }
  }

  const kps = poses[0].keypoints
  const vw = videoElement.videoWidth || 640
  const vh = videoElement.videoHeight || 480

  // Normalize keypoints to 0..1
  const normalized = kps.map(kp => ({
    name: kp.name ?? '',
    x: kp.x / vw,
    y: kp.y / vh,
    score: kp.score ?? 0,
  }))

  const get = (name: string) => normalized.find(k => k.name === name)
  const conf = (name: string) => (get(name)?.score ?? 0) > 0.3

  const issues: PoseIssue[] = []

  // Head cut: nose near or above top edge
  const nose = get('nose')
  if (nose && conf('nose') && nose.y < 0.05) {
    issues.push('head_cut')
  }

  // Chin down: nose y > eyes y by large amount (face tilted down)
  const leftEye = get('left_eye')
  const rightEye = get('right_eye')
  if (nose && leftEye && rightEye && conf('nose') && conf('left_eye')) {
    const eyeY = (leftEye.y + rightEye.y) / 2
    if (nose.y > eyeY + 0.06) {
      issues.push('chin_down')
    }
  }

  // Shoulder flat (too frontal): both shoulders at near-same y and x-span too symmetric
  const leftShoulder = get('left_shoulder')
  const rightShoulder = get('right_shoulder')
  if (leftShoulder && rightShoulder && conf('left_shoulder') && conf('right_shoulder')) {
    const yDiff = Math.abs(leftShoulder.y - rightShoulder.y)
    const xSpan = Math.abs(leftShoulder.x - rightShoulder.x)
    if (yDiff < 0.02 && xSpan > 0.25) {
      issues.push('shoulder_flat')
    }
  }

  // Arms stiff: wrists close to hips
  const leftWrist = get('left_wrist')
  const rightWrist = get('right_wrist')
  const leftHip = get('left_hip')
  const rightHip = get('right_hip')
  if (leftWrist && leftHip && conf('left_wrist') && conf('left_hip')) {
    const dist = Math.hypot(leftWrist.x - leftHip.x, leftWrist.y - leftHip.y)
    if (dist < 0.08) issues.push('arms_stiff')
  } else if (rightWrist && rightHip && conf('right_wrist') && conf('right_hip')) {
    const dist = Math.hypot(rightWrist.x - rightHip.x, rightWrist.y - rightHip.y)
    if (dist < 0.08) issues.push('arms_stiff')
  }

  // Subject bounding box from visible keypoints
  const visible = normalized.filter(k => k.score > 0.3)
  let subjectBox: BoundingBox | null = null
  let faceBox: BoundingBox | null = null

  if (visible.length >= 2) {
    const xs = visible.map(k => k.x)
    const ys = visible.map(k => k.y)
    const minX = Math.max(0, Math.min(...xs) - 0.05)
    const minY = Math.max(0, Math.min(...ys) - 0.05)
    const maxX = Math.min(1, Math.max(...xs) + 0.05)
    const maxY = Math.min(1, Math.max(...ys) + 0.05)
    subjectBox = { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
  }

  // Face box from nose + eyes
  if (nose && conf('nose')) {
    const faceKps = [nose, leftEye, rightEye].filter(k => k && (k.score ?? 0) > 0.3) as typeof normalized
    if (faceKps.length >= 2) {
      const fxs = faceKps.map(k => k.x)
      const fys = faceKps.map(k => k.y)
      const pad = 0.05
      const fx = Math.max(0, Math.min(...fxs) - pad)
      const fy = Math.max(0, Math.min(...fys) - pad)
      const fw = Math.min(1, Math.max(...fxs) + pad) - fx
      const fh = Math.min(1, Math.max(...fys) + pad * 2) - fy
      faceBox = { x: fx, y: fy, w: fw, h: fh }
    }
  }

  return {
    analysis: { detected: true, keypoints: normalized, issues },
    subjectBox,
    faceBox,
  }
}
