const MODULE_CATALOG = {
  reset_pressure: '3分钟压力呼吸重置，适合高唤醒、焦虑、紧绷',
  reset_overload: '3分钟信息过载重置，适合混乱、选择太多、无法收束',
  reset_sleep: '5分钟睡眠恢复重置，适合疲惫、透支、睡前高唤醒',
  reset_emotion: '4分钟情绪整合，适合关系冲突、委屈、愤怒',
  reset_coherence: '3分钟专注校准，适合学习与注意力涣散',
  music_pressure: '压力释放与自然白噪音音景',
  music_sleep: '睡前修复与低刺激音景',
  music_focus: '深度专注场景音乐',
  flow: '最小行动与专注回合',
  architect: '状态教练继续追问、澄清与决策',
  journal: '语音日志、个人档案与复盘',
  classics: '儒释道经典与现代译文阅读',
  visual: '视觉状态诊断与非语言觉察',
}

const SYSTEM_PROMPT = `你是 HOS 人类操作系统的状态教练与模块编排器。
你的任务不是泛泛安慰，而是：
1. 从用户此刻的语言、已有状态数据和近期轨迹中识别核心需要；
2. 区分高唤醒、信息过载、启动阻滞、恢复不足、学习塑形、情绪整合；
3. 只从给定模块中选择三个最合适的模块，按“先调状态、再澄清、后行动/巩固”的顺序编排；
4. 回应要温暖、清楚、克制，不诊断疾病，不宣称读取了不存在的声学特征；
5. 每一步必须足够小，能在用户当前能量下开始。

可调用模块：
${Object.entries(MODULE_CATALOG).map(([id, description]) => `${id}: ${description}`).join('\n')}

只返回 JSON，不要 Markdown。结构必须是：
{
  "stateLabel": "2-8个汉字",
  "mode": "stabilize|clarify|execute|recover|learn|reflect",
  "confidence": 60-95的整数,
  "coreNeed": "8-18个汉字",
  "response": "先准确复述用户处境，再给安全感，1-2句",
  "hypothesis": "对当前状态机制的可校准理解，1-2句",
  "bodyStep": "一个身体先行动作",
  "actionStep": "一个此刻可执行动作",
  "reflectionStep": "一个结束后的反馈动作",
  "reframe": "不贴标签的重构句",
  "question": "只问一个能明显提高判断准确度的问题",
  "commitment": "20字以内的最小承诺",
  "recommendedModules": ["三个不重复的模块ID"],
  "rationale": "解释为什么按这个顺序，1-2句"
}

如果文本出现明确自伤、自杀或伤害他人的风险，不要进行普通成长训练；mode 使用 stabilize，response 要鼓励用户立即联系身边可信任的人和当地紧急/专业支持，recommendedModules 以 architect、journal 为主。`

const ALLOWED_MODES = new Set(['stabilize', 'clarify', 'execute', 'recover', 'learn', 'reflect'])
const ALLOWED_MODULES = new Set(Object.keys(MODULE_CATALOG))
const GITHUB_ORIGIN = 'https://qiuyang668899-ux.github.io'

function corsHeaders(request) {
  const origin = request.headers.get('Origin')
  const ownOrigin = new URL(request.url).origin
  const allowedOrigin = origin === GITHUB_ORIGIN || origin === ownOrigin ? origin : null
  return {
    ...(allowedOrigin ? { 'Access-Control-Allow-Origin': allowedOrigin } : {}),
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

function json(request, value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(request) },
  })
}

function text(value, fallback, maxLength) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : fallback
}

function parseModelJson(content) {
  const cleaned = String(content ?? '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  return JSON.parse(cleaned)
}

function sanitizeInsight(raw) {
  const mode = ALLOWED_MODES.has(raw?.mode) ? raw.mode : 'clarify'
  const recommendedModules = Array.isArray(raw?.recommendedModules)
    ? [...new Set(raw.recommendedModules.filter((id) => ALLOWED_MODULES.has(id)))].slice(0, 3)
    : []
  const defaults = mode === 'stabilize'
    ? ['reset_pressure', 'music_pressure', 'architect']
    : mode === 'recover'
      ? ['reset_sleep', 'music_sleep', 'architect']
      : mode === 'execute'
        ? ['flow', 'music_focus', 'journal']
        : mode === 'learn'
          ? ['reset_coherence', 'flow', 'journal']
          : mode === 'reflect'
            ? ['reset_emotion', 'architect', 'classics']
            : ['reset_overload', 'architect', 'flow']
  for (const id of defaults) {
    if (recommendedModules.length >= 3) break
    if (!recommendedModules.includes(id)) recommendedModules.push(id)
  }
  return {
    engine: 'deepseek',
    stateLabel: text(raw?.stateLabel, '需要再收束', 16),
    mode,
    confidence: Math.max(60, Math.min(95, Math.round(Number(raw?.confidence) || 72))),
    coreNeed: text(raw?.coreNeed, '安全、清晰与可开始', 36),
    response: text(raw?.response, '我听见了。我们先不解决全部，只找到最影响此刻状态的那一层。', 240),
    hypothesis: text(raw?.hypothesis, '这更像是一个可以被调节的临时状态，而不是你的固定属性。', 240),
    bodyStep: text(raw?.bodyStep, '做一次缓慢、完整的呼气。', 120),
    actionStep: text(raw?.actionStep, '只写下此刻唯一要处理的一件事。', 160),
    reflectionStep: text(raw?.reflectionStep, '结束后留下一个感受词。', 120),
    reframe: text(raw?.reframe, '这不是你不行，而是系统需要换一种运行方式。', 160),
    question: text(raw?.question, '此刻最影响你的，是身体紧绷、事情太多，还是无法开始？', 160),
    commitment: text(raw?.commitment, '只完成一个最小动作', 40),
    recommendedModules,
    rationale: text(raw?.rationale, '先恢复可调节的状态，再收束问题，最后用行动反馈巩固。', 220),
  }
}

async function handleCoach(request, env) {
  if (!env.DEEPSEEK_API_KEY) return json(request, { error: 'AI coach is not configured' }, 503)
  const contentLength = Number(request.headers.get('Content-Length') || 0)
  if (contentLength > 24_000) return json(request, { error: 'Request is too large' }, 413)

  let payload
  try {
    payload = await request.json()
  } catch {
    return json(request, { error: 'Invalid JSON' }, 400)
  }
  const userText = text(payload?.text, '', 4000)
  if (!userText) return json(request, { error: 'Missing user state' }, 400)

  const userPayload = {
    source: payload?.source === 'voice' ? 'voice' : 'text',
    currentExpression: userText,
    stateContext: payload?.context ?? null,
    recentUserMessages: Array.isArray(payload?.recentUserMessages) ? payload.recentUserMessages.slice(-4) : [],
  }
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(userPayload) },
      ],
      thinking: { type: 'enabled' },
      reasoning_effort: 'high',
      response_format: { type: 'json_object' },
      max_tokens: 1400,
      stream: false,
    }),
  })
  if (!response.ok) {
    const detail = await response.text()
    console.error('DeepSeek API error', response.status, detail.slice(0, 400))
    return json(request, { error: 'AI analysis is temporarily unavailable' }, 502)
  }
  const completion = await response.json()
  try {
    const raw = parseModelJson(completion?.choices?.[0]?.message?.content)
    return json(request, sanitizeInsight(raw))
  } catch (error) {
    console.error('DeepSeek response parse error', error)
    return json(request, { error: 'AI analysis could not be organized' }, 502)
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS' && url.pathname === '/api/hos-coach') {
      return new Response(null, { status: 204, headers: corsHeaders(request) })
    }
    if (request.method === 'POST' && url.pathname === '/api/hos-coach') {
      try {
        return await handleCoach(request, env)
      } catch (error) {
        console.error('HOS coach worker error', error)
        return json(request, { error: 'AI coach is temporarily unavailable' }, 500)
      }
    }
    return env.ASSETS.fetch(request)
  },
}

