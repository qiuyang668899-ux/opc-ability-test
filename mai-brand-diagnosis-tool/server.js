const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const TARGET_SOURCE_COUNT = Number(process.env.TARGET_SOURCE_COUNT || 100);

const INDUSTRY_HINTS = {
  '金融/投资': ['金融', '金控', '投资', '基金', '资本', '保险', '银行', '证券', '财富', '理财'],
  '品牌营销服务': ['品牌', '营销', '广告', '内容', '设计', '媒体', 'GEO', '公关', '传播', '自媒体'],
  '文旅景区': ['文旅', '景区', '旅游', '游客', '街区', '老街', '古城', '夜游'],
  '家居建材': ['家具', '家居', '建材', '装修', '空间', '定制', '床垫', '沙发'],
  '科技软件': ['科技', '软件', '系统', '平台', 'AI', 'SaaS', '数据', '智能'],
  '农业食品': ['农业', '食品', '农产品', '粮油', '供应链', '生鲜']
};

function send(res, status, body, type = 'application/json;charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 2 * 1024 * 1024) reject(new Error('request too large'));
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function stripTags(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text, max = 800) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}...` : clean;
}

async function fetchText(url, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 AppleWebKit/537.36 Chrome/124 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.7'
      },
      redirect: 'follow'
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

function normalizeUrl(raw, base) {
  let url = String(raw || '').replace(/&amp;/g, '&');
  if (url.startsWith('//')) url = `https:${url}`;
  if (url.startsWith('/')) url = `${base}${url}`;
  return url;
}

function parseH3Results(html, baseUrl, query, engine) {
  const results = [];
  const blocks = String(html || '').match(/<h3[\s\S]*?<\/h3>/gi) || [];
  for (const block of blocks) {
    const link = block.match(/<a[^>]+href=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;
    const url = normalizeUrl(link[2], baseUrl);
    if (!/^https?:\/\//.test(url)) continue;
    const title = stripTags(link[3]);
    if (title) results.push({ title, url, snippet: '', query, engine });
    if (results.length >= 10) break;
  }
  return results;
}

function parseBingResults(html, query) {
  const blocks = String(html || '').split(/<li class="b_algo"[^>]*>/i).slice(1);
  const results = [];
  for (const block of blocks) {
    const link = block.match(/<h2[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;
    const title = stripTags(link[2]);
    const snippet = stripTags(block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '');
    if (title) results.push({ title, url: link[1], snippet, query, engine: 'Bing' });
    if (results.length >= 10) break;
  }
  return results;
}

async function searchOne(query) {
  const jobs = [
    fetchText(`https://cn.bing.com/search?q=${encodeURIComponent(query)}&ensearch=0`).then(html => parseBingResults(html, query)).catch(() => []),
    fetchText(`https://www.sogou.com/web?query=${encodeURIComponent(query)}`).then(html => parseH3Results(html, 'https://www.sogou.com', query, '搜狗')).catch(() => []),
    fetchText(`https://www.so.com/s?q=${encodeURIComponent(query)}`).then(html => parseH3Results(html, 'https://www.so.com', query, '360')).catch(() => [])
  ];
  const settled = await Promise.all(jobs);
  return settled.flat();
}

function aliasesOf(brandName) {
  const name = String(brandName || '').trim();
  const short = name.replace(/(股份有限公司|有限责任公司|集团有限公司|有限公司|集团|公司)$/g, '');
  const aliases = [name, short];
  if (/金控/.test(name)) aliases.push(name.replace(/金控/g, '金融控股'), short.replace(/金控/g, '金融控股'));
  if (/光谷/.test(name) && /金控|金融控股/.test(name)) aliases.push('武汉光谷金融控股集团', '武汉光谷金融控股集团有限公司');
  return [...new Set(aliases.filter(Boolean).filter(v => v.length >= 2))];
}

function buildQueries(brandName, material) {
  const aliases = aliasesOf(brandName);
  const suffixes = ['', ' 官网', ' 官方', ' 公司', ' 公司简介', ' 产品服务', ' 新闻', ' 媒体报道', ' 公众号', ' 抖音', ' 小红书', ' 企查查', ' 天眼查', ' 招聘', ' 案例'];
  const queries = [];
  for (const alias of aliases) for (const s of suffixes) queries.push(`${alias}${s}`.trim());
  const text = `${brandName} ${material || ''}`;
  if (/财|金融|投资|金控|财富|理财|基金/.test(text)) queries.push('地方金融控股集团 对标', '产业投资集团 对标', '财富管理 服务品牌', '金融知识 内容平台', '科技金融 服务平台');
  if (/品牌|营销|广告|内容|设计|GEO|AI|媒体/.test(text)) queries.push('品牌营销服务商', 'AI品牌营销 服务商', '内容营销 服务商', 'GEO优化 服务商', '品牌咨询公司 排名', '数字营销服务商');
  queries.push('行业代表品牌 排名', '品牌竞品对标', '中小品牌 增长案例');
  return [...new Set(queries)].slice(0, 42);
}

function matchScope(source, aliases) {
  const text = `${source.title} ${source.snippet} ${source.url}`.replace(/\s+/g, '');
  if (aliases.some(a => text.includes(a.replace(/\s+/g, '')))) return '品牌精确来源';
  if (/字典|拼音|部首|笔顺|百科/.test(text)) return '低相关候选来源';
  if (/竞品|对标|排名|榜单|代表|服务商|案例|集团|公司/.test(text)) return '行业/竞品发现';
  return '行业候选来源';
}

function uniqueByUrl(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = item.url.split('#')[0];
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function inferIndustry(text) {
  let best = ['其他行业', 0];
  for (const [industry, words] of Object.entries(INDUSTRY_HINTS)) {
    const score = words.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
    if (score > best[1]) best = [industry, score];
  }
  return best[0];
}

function safeJsonParse(text) {
  try { return JSON.parse(text); } catch {
    const match = String(text || '').match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI返回不是JSON');
    return JSON.parse(match[0]);
  }
}

async function callDeepSeek(payload) {
  if (!DEEPSEEK_API_KEY) return null;
  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      temperature: 0.15,
      max_tokens: 2600,
      response_format: { type: 'json_object' },
      thinking: { type: 'disabled' },
      messages: [
        { role: 'system', content: '你是品牌GEO诊断分析师。只输出JSON。严格区分品牌证据和行业背景证据。' },
        { role: 'user', content: JSON.stringify(payload, null, 2) }
      ]
    })
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`DeepSeek HTTP ${response.status}: ${truncate(text, 200)}`);
  const data = safeJsonParse(text);
  return safeJsonParse(data.choices?.[0]?.message?.content || '{}');
}

async function enrichBrand(brandName, material) {
  const aliases = aliasesOf(brandName);
  const queries = buildQueries(brandName, material);
  const batches = [];
  for (let i = 0; i < queries.length; i += 4) {
    const part = await Promise.all(queries.slice(i, i + 4).map(searchOne));
    batches.push(...part.flat());
  }
  const sources = uniqueByUrl(batches)
    .map(source => ({ ...source, scope: matchScope(source, aliases) }))
    .filter(source => !/字典|拼音|部首|笔顺/.test(`${source.title} ${source.snippet}`))
    .slice(0, TARGET_SOURCE_COUNT);
  const brandSources = sources.filter(s => s.scope === '品牌精确来源');
  const textPool = `${brandName}\n${material || ''}\n${brandSources.map(s => `${s.title} ${s.snippet}`).join('\n')}`;
  const ruleIndustry = inferIndustry(textPool);
  const stats = {
    resultCount: sources.length,
    brandResultCount: brandSources.length,
    discoveryCount: sources.filter(s => s.scope === '行业/竞品发现').length,
    supplementalCount: sources.filter(s => s.scope === '行业候选来源').length,
    targetSourceCount: TARGET_SOURCE_COUNT
  };
  const fallback = {
    industry: ruleIndustry,
    website: '未识别到官网',
    voice: brandSources.length ? `识别到${brandSources.length}条品牌精确来源。` : '未识别到品牌精确公开来源，建议补充品牌资料。',
    competitors: brandSources.length || material ? '待AI判断' : '待确认竞品1、待确认竞品2、待确认竞品3',
    strategyHints: []
  };
  const ai = await callDeepSeek({
    task: '基于来源做品牌诊断。品牌画像字段只能引用品牌精确来源；行业/竞品来源只能用于竞品和策略。没有品牌证据时要明确提示证据不足，不要硬猜官网。输出JSON字段：industry, stage, market, website, products, audience, voice, competitors, competitorBenchmarks, strategyFocus, riskNotes。',
    brandName,
    material: truncate(material, 4000),
    stats,
    sources: sources.map((s, index) => ({ index: index + 1, scope: s.scope, title: s.title, url: s.url, snippet: truncate(s.snippet, 220), engine: s.engine }))
  }).catch(error => ({ error: error.message }));
  return {
    brandName,
    mode: 'online',
    ai: { configured: Boolean(DEEPSEEK_API_KEY), used: Boolean(ai && !ai.error), model: DEEPSEEK_MODEL, error: ai?.error || '' },
    searchStats: stats,
    profile: {
      industry: { value: ai?.industry?.value || ai?.industry || fallback.industry, confidence: ai?.industry?.confidence || 60, sources: brandSources.slice(0, 2) },
      stage: { value: ai?.stage?.value || ai?.stage || '待确认', confidence: ai?.stage?.confidence || 45, sources: brandSources.slice(0, 2) },
      market: { value: ai?.market?.value || ai?.market || '待确认', confidence: ai?.market?.confidence || 45, sources: brandSources.slice(0, 2) },
      website: { value: ai?.website?.value || ai?.website || fallback.website, confidence: ai?.website?.confidence || 30, sources: brandSources.slice(0, 1) },
      products: { value: ai?.products?.value || ai?.products || '待补充品牌资料', confidence: ai?.products?.confidence || 40, sources: brandSources.slice(0, 2) },
      audience: { value: ai?.audience?.value || ai?.audience || '待补充目标客户信息', confidence: ai?.audience?.confidence || 40, sources: brandSources.slice(0, 2) },
      voice: { value: ai?.voice?.value || ai?.voice || fallback.voice, confidence: ai?.voice?.confidence || 45, sources: brandSources.slice(0, 3) },
      competitors: { value: ai?.competitors?.value || ai?.competitors || fallback.competitors, confidence: ai?.competitors?.confidence || 45, sources: sources.filter(s => s.scope === '行业/竞品发现').slice(0, 3) }
    },
    competitorBenchmarks: Array.isArray(ai?.competitorBenchmarks) ? ai.competitorBenchmarks.slice(0, 3) : [],
    strategyHints: Array.isArray(ai?.strategyFocus) ? ai.strategyFocus.slice(0, 5) : [],
    riskNotes: Array.isArray(ai?.riskNotes) ? ai.riskNotes.slice(0, 5) : [],
    sources
  };
}

function serveStatic(req, res) {
  const parsed = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.normalize(path.join(ROOT, pathname));
  if (!filePath.startsWith(ROOT)) return send(res, 403, 'Forbidden', 'text/plain;charset=utf-8');
  fs.readFile(filePath, (error, data) => {
    if (error) return send(res, 404, 'Not found', 'text/plain;charset=utf-8');
    const type = pathname.endsWith('.html') ? 'text/html;charset=utf-8' : pathname.endsWith('.css') ? 'text/css;charset=utf-8' : 'application/octet-stream';
    send(res, 200, data, type);
  });
}

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, '');
  if (req.url === '/api/health') return send(res, 200, JSON.stringify({ ok: true, service: 'mai-brand-diagnosis-tool', ai: { configured: Boolean(DEEPSEEK_API_KEY), model: DEEPSEEK_MODEL } }));
  if (req.url === '/api/enrich' && req.method === 'POST') {
    try {
      const body = JSON.parse((await readBody(req)) || '{}');
      const brandName = String(body.brandName || '').trim();
      const material = String(body.material || '').trim();
      if (brandName.length < 2) throw new Error('请输入品牌名或公司名');
      const result = await enrichBrand(brandName, material);
      return send(res, 200, JSON.stringify(result));
    } catch (error) {
      return send(res, 500, JSON.stringify({ error: error.message || '诊断失败' }));
    }
  }
  serveStatic(req, res);
}).listen(PORT, HOST, () => {
  console.log(`AI品牌诊断系统已启动：http://${HOST === '0.0.0.0' ? '127.0.0.1' : HOST}:${PORT}`);
});
