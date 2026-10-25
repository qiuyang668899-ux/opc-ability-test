/* global Vision */
/* eslint-env worker */
let model
self.onmessage = async ({ data }) => {
  if (data.type === 'init') {
    try {
      importScripts('vision_bundle.js')
      const files = await Vision.FilesetResolver.forVisionTasks(new URL('wasm/', self.location.href).href)
      model = await Vision.PoseLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: new URL('pose_landmarker_lite.task', self.location.href).href, delegate: 'CPU' },
        runningMode: 'VIDEO', numPoses: 1, minPoseDetectionConfidence: .6,
        minPosePresenceConfidence: .6, minTrackingConfidence: .6, outputSegmentationMasks: false,
      })
      self.postMessage({ type: 'ready' })
    } catch { self.postMessage({ type: 'error', message: '本机姿态模型未能启动，请使用新版 Chrome 或 Edge，刷新后重试。' }) }
  } else if (data.type === 'frame') {
    try {
      if (!model) throw new Error('not ready')
      const result = model.detectForVideo(data.bitmap, data.timestamp)
      self.postMessage({ type: 'pose', landmarks: result.landmarks[0] || [], timestamp: data.timestamp })
    } catch { self.postMessage({ type: 'error', message: '本机识别已停止。相机将关闭，可以重新开启。' }) }
    finally { data.bitmap?.close() }
  }
}
