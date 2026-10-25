import { buildCoachSnapshot } from '../engines/coachEngine'
import { localReport, weeklyContext, type GrowthReport, type ReviewInput } from '../engines/growthReview'
import { requestHOSCoachAnalysis } from './aiCoachService'

export async function analyzeGrowthReview(input: ReviewInput, signal: AbortSignal): Promise<GrowthReport> {
  const report = localReport(input)
  const context = input.includeHistory ? weeklyContext(input.week) : null
  const text = `请作为每周成长复盘教练，帮助我从经历形成一个可证伪的小实验。只依据下述材料，不推断疾病、人格或照片状态，不编造历史、成功率或因果关系。若证据不足明确说不足。仍按既有 JSON 格式输出：response 复述本周；hypothesis 写模式线索和所据事件；question 写一个盲点提问；reframe 写“如果当时换一个动作，可能怎样”的反事实而非断言；actionStep 写下周一个两分钟起步的可执行实验；commitment 最小动作；reflectionStep 写如何记录结果。\n${JSON.stringify({ week: input.week, direction: input.dimension, goal: input.goal.slice(0,400), events: input.events.slice(0,800), emotions: input.emotions.slice(0,400), decisions: input.decisions.slice(0,400), body: input.body.slice(0,400), artifact: input.artifact.slice(0,250), history: context ? { journalExcerpts: context.journals.slice(0,5).map(x => (x.organizedText || x.rawFragment || x.trigger).slice(0,160)), measuredFocusMinutes: context.flowMinutes, dailyData: context.evidence.slice(0,7).map(({date,sleepHours,exerciseMinutes,deepWorkMinutes,recoveryMinutes})=>({date,sleepHours,exerciseMinutes,deepWorkMinutes,recoveryMinutes})) } : undefined })}`
  const result = await requestHOSCoachAnalysis({ text, source: 'text', snapshot: buildCoachSnapshot(), context: { purpose: 'weekly_review', scope: 'only_user_selected_review_material' }, signal })
  return { ...report, engine: 'deepseek', pattern: result.hypothesis, blindSpot: result.question, counterfactual: result.reframe, experiment: result.actionStep, response: result.response }
}
