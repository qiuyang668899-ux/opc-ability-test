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
6. 当前表达和用户纠正优先于历史记录；历史只是参考，不能把推测当诊断。对于缺少信息的情况先提出一个具体问题。不要用确定口吻推断内心、声线或人格。
7. 优先回应用户提到的真实任务，不把应用默认任务替换成用户目标。不要声称意念、频率能改变物质或治疗疾病；传统修习作为文化与自我觉察呈现。

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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
  }
}

function json(request, value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...corsHeaders(request) },
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
  if (!raw || !ALLOWED_MODES.has(raw.mode) || !['stateLabel', 'response', 'hypothesis', 'actionStep'].every((key) => typeof raw[key] === 'string' && raw[key].trim())) throw new Error('Incomplete model response')
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

// A durable, atomic reservation bounds spend even across concurrent Workers.
// Store no journal text, raw IP address or audio; the daily network ID is HMACed.
async function reserveAnalysis(request, env) {
  if (!env.DB) return { error: 'Usage protection unavailable', code: 'usage_unavailable', status: 503 }
  const now = Date.now()
  const day = new Date(now).toISOString().slice(0, 10)
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.DEEPSEEK_API_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const ip = request.headers.get('CF-Connecting-IP') || 'unidentified-shared-network'
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${day}:${ip}`))
  const bucket = Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('')
  const limit = (value, fallback, max) => Math.max(1, Math.min(max, Math.floor(Number(value)) || fallback))
  const globalLimit = limit(env.AI_GLOBAL_DAILY_LIMIT, 300, 2000)
  const clientLimit = limit(env.AI_CLIENT_DAILY_LIMIT, 30, 200)
  const results = await env.DB.batch([
    env.DB.prepare('DELETE FROM ai_usage WHERE created_at < ?').bind(now - 172800000),
    env.DB.prepare(`INSERT INTO ai_usage (id, day, bucket, created_at)
      SELECT ?, ?, ?, ? WHERE
        (SELECT COUNT(*) FROM ai_usage WHERE day = ?) < ?
        AND (SELECT COUNT(*) FROM ai_usage WHERE day = ? AND bucket = ?) < ?
        AND (SELECT COUNT(*) FROM ai_usage WHERE created_at >= ? AND bucket = ?) < 4
        AND (SELECT COUNT(*) FROM ai_usage WHERE created_at >= ?) < 20
      RETURNING id`).bind(crypto.randomUUID(), day, bucket, now, day, globalLimit, day, bucket, clientLimit, now - 60000, bucket, now - 60000),
  ])
  if (!results[1]?.results?.length) return { error: 'Usage limit reached', code: 'usage_limit', status: 429 }
  return null
}

async function handleCoach(request, env) {
  if (!env.DEEPSEEK_API_KEY) return json(request, { error: 'AI coach is not configured' }, 503)
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return json(request, { error: 'JSON required' }, 415)
  const contentLength = Number(request.headers.get('Content-Length') || 0)
  if (contentLength > 24_000) return json(request, { error: 'Request is too large' }, 413)

  let payload
  try {
    // Enforce the actual body limit even when Content-Length is omitted.
    const reader = request.body?.getReader()
    if (!reader) return json(request, { error: 'Missing body' }, 400)
    const chunks = []
    let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 24_000) { await reader.cancel(); return json(request, { error: 'Request is too large' }, 413) }
      chunks.push(value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
    payload = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return json(request, { error: 'Invalid JSON' }, 400)
  }
  const userText = text(payload?.text, '', 4000)
  if (!userText) return json(request, { error: 'Missing user state' }, 400)
  const usageError = await reserveAnalysis(request, env)
  if (usageError) return json(request, usageError, usageError.status)

  const userPayload = {
    source: payload?.source === 'voice' ? 'voice' : 'text',
    currentExpression: userText,
    stateContext: payload?.context ?? null,
    recentUserMessages: Array.isArray(payload?.recentUserMessages) ? payload.recentUserMessages.filter((item) => typeof item === 'string').slice(-4).map((item) => item.slice(0, 800)) : [],
  }
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.DEEPSEEK_MODEL || 'deepseek-flash',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(userPayload) },
      ],
      thinking: { type: 'disabled' },
      response_format: { type: 'json_object' },
      max_tokens: 1400,
      stream: false,
    }),
    signal: AbortSignal.timeout(25_000),
  })
  if (!response.ok) {
    const code = response.status === 402 ? 'provider_balance' : response.status === 401 ? 'provider_auth' : response.status === 429 ? 'provider_busy' : 'provider_unavailable'
    return json(request, { error: 'AI analysis is temporarily unavailable', code }, response.status === 429 ? 429 : 502)
  }
  const completion = await response.json()
  try {
    if (completion?.choices?.[0]?.finish_reason === 'length') throw new Error('Truncated response')
    const raw = parseModelJson(completion?.choices?.[0]?.message?.content)
    return json(request, sanitizeInsight(raw))
  } catch {
    return json(request, { error: 'AI analysis could not be organized' }, 502)
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/api/hos-coach') {
      const origin = request.headers.get('Origin')
      if (origin && origin !== GITHUB_ORIGIN && origin !== url.origin) return json(request, { error: 'Origin is not allowed' }, 403)
      if (request.method === 'GET') return json(request, { ready: Boolean(env.DEEPSEEK_API_KEY && env.DB), engine: 'deepseek', protected: Boolean(env.DB) }, env.DEEPSEEK_API_KEY && env.DB ? 200 : 503)
    }
    if (request.method === 'OPTIONS' && url.pathname === '/api/hos-coach') {
      return new Response(null, { status: 204, headers: corsHeaders(request) })
    }
    if (request.method === 'POST' && url.pathname === '/api/hos-coach') {
      try {
        return await handleCoach(request, env)
      } catch (error) {
        return json(request, { error: 'AI coach is temporarily unavailable', code: error?.name === 'TimeoutError' ? 'provider_timeout' : 'service_unavailable' }, error?.name === 'TimeoutError' ? 504 : 503)
      }
    }
    return env.ASSETS ? env.ASSETS.fetch(request) : json(request, { error: 'Not found' }, 404)
  },
}
