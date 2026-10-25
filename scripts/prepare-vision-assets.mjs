import { cpSync, mkdirSync, existsSync } from 'node:fs'
const dir = 'public/vision'
mkdirSync(dir, { recursive: true })
cpSync('node_modules/@mediapipe/tasks-vision/vision_bundle.js', `${dir}/vision_bundle.js`)
cpSync('node_modules/@mediapipe/tasks-vision/wasm', `${dir}/wasm`, { recursive: true })
if (!existsSync(`${dir}/pose_landmarker_lite.task`)) throw new Error('Missing versioned local pose model. See public/vision/NOTICE.txt.')
console.log('Local vision runtime ready; camera frames never need a remote inference endpoint.')
