import { type BiText } from '../stores/useStore';

// Bilingual display: always show both CN and EN
export function bi(text: BiText): string {
  return `${text.zh} / ${text.en}`;
}

// Display bilingual with line break (for headings)
export function biLine(text: BiText): [string, string] {
  return [text.zh, text.en];
}

// Common UI texts
export const UI = {
  appName: { zh: 'HOS', en: 'OS' },
  home: { zh: '主页', en: 'Home' },
  architect: { zh: '架构师', en: 'Architect' },
  journal: { zh: '日志', en: 'Journal' },
  bioSync: { zh: '生物同步', en: 'Bio-Sync' },
  systemReset: { zh: '系统重置', en: 'System Reset' },
  emergencyProtocol: { zh: '紧急微干预协议', en: 'Emergency Micro-Intervention' },
  streakDays: { zh: '连续记录', en: 'Streak' },
  days: { zh: '天', en: 'Days' },
  depthMode: { zh: '深度模式', en: 'Depth Mode' },
  locked: { zh: '锁定中', en: 'Locked' },
  unlocked: { zh: '已解锁', en: 'Unlocked' },
  needLogs: { zh: '需 {n} 条日志以解锁', en: 'Need {n} logs to unlock' },
  coreModules: { zh: '核心模块', en: 'Core Modules' },
  aiArchitect: { zh: 'AI 架构师', en: 'AI Architect' },
  aiArchitectDesc: { zh: '认知镜像 & 智慧引导', en: 'Cognitive Mirror & Wisdom Guide' },
  visualDiag: { zh: '视觉诊断', en: 'Visual Diagnosis' },
  visualDiagDesc: { zh: '摄像头生物反馈分析', en: 'Camera Biofeedback Analysis' },
  patternRewrite: { zh: '模式重写', en: 'Pattern Rewrite' },
  patternRewriteDesc: { zh: '触发器-响应 日志', en: 'Trigger-Response Log' },
  bioSyncModule: { zh: '生物同步 V2.0', en: 'Bio-Sync V2.0' },
  bioSyncDesc: { zh: '昼夜节律 & 能量管理', en: 'Circadian Rhythm & Energy' },
  moodMusic: { zh: '心境音乐', en: 'Mood Music' },
  moodMusicDesc: { zh: '专注、修复、睡眠、创造状态音场', en: 'Focus, repair, sleep, creative sound fields' },
  integration: { zh: '系统整合度', en: 'System Integration' },
  inputPlaceholder: { zh: '输入认知数据...', en: 'Enter cognitive data...' },
  triggerStress: { zh: '触发：压力过载', en: 'Trigger: Stress Overload' },
  triggerDelay: { zh: '触发：拖延', en: 'Trigger: Procrastination' },
  execute: { zh: '执行', en: 'Execute' },
  launch: { zh: '启动', en: 'Launch' },
  rewriteMode: { zh: '重写模式', en: 'Rewrite Mode' },
  habitRemodel: { zh: '习惯重塑', en: 'Habit Remodel' },
  fastIntervention: { zh: '快速行为干预', en: 'Fast Behavioral Intervention' },
  triggerEvent: { zh: '触发事件', en: 'Trigger Event' },
  oldProgram: { zh: '旧有程序（自动反应）', en: 'Old Program (Auto Response)' },
  hosProtocol: { zh: 'HOS 协议', en: 'HOS Protocol' },
  somaticMarker: { zh: '躯体标记', en: 'Somatic Marker' },
  cogDistortion: { zh: '认知扭曲', en: 'Cognitive Distortion' },
  heartBrain: { zh: '心脑谐振', en: 'Heart-Brain Coherence' },
  currentPhase: { zh: '当前阶段', en: 'Current Phase' },
  energyState: { zh: '当前能量状态', en: 'Current Energy' },
  systemDiag: { zh: '系统诊断', en: 'System Diagnosis' },
  recommendProtocol: { zh: '推荐协议', en: 'Recommended Protocol' },
  practicalTools: { zh: '实用工具', en: 'Practical Tools' },
  inhale: { zh: '吸气', en: 'Inhale' },
  exhale: { zh: '呼气', en: 'Exhale' },
  holdBreath: { zh: '止息', en: 'Hold' },
  realTimeMonitor: { zh: '实时监控', en: 'Real-time Monitor' },
  running: { zh: '运行中', en: 'Running' },
  resolution: { zh: '分辨率', en: 'Resolution' },
  sensor: { zh: '传感器', en: 'Sensor' },
  online: { zh: '在线', en: 'Online' },
  analyzing: { zh: '正在分析生物特征...', en: 'Analyzing biometrics...' },
  diagComplete: { zh: '诊断完成', en: 'Diagnosis Complete' },
  visualFeature: { zh: '视觉特征', en: 'Visual Feature' },
  bioFeature: { zh: '生物反馈特征', en: 'Bio Feedback Feature' },
  stopConnection: { zh: '终止连线', en: 'Stop Connection' },
  videoLink: { zh: '视频链路', en: 'Video Link' },
  hosKernel: { zh: 'HOS_核心', en: 'HOS_Kernel' },
  musicPlayer: { zh: '心境调频', en: 'Mood Tuning' },
} as const;

export const EMOTIONS: Record<string, BiText> = {
  calm: { zh: '平静', en: 'Calm' },
  anxious: { zh: '焦虑', en: 'Anxious' },
  focused: { zh: '专注', en: 'Focused' },
  fatigued: { zh: '疲劳', en: 'Fatigued' },
  excited: { zh: '兴奋', en: 'Excited' },
  confused: { zh: '困惑', en: 'Confused' },
  stressed: { zh: '压抑', en: 'Stressed' },
};

export const VISUAL_FEATURES: Record<string, BiText> = {
  calm: { zh: '眼神平和', en: 'Peaceful gaze' },
  anxious: { zh: '眉间紧缩', en: 'Furrowed brows' },
  focused: { zh: '目光聚焦', en: 'Focused gaze' },
  fatigued: { zh: '眼睑下垂', en: 'Drooping eyelids' },
  excited: { zh: '瞳孔放大', en: 'Dilated pupils' },
  confused: { zh: '眼神游离', en: 'Wandering gaze' },
  stressed: { zh: '面部紧张', en: 'Facial tension' },
};
