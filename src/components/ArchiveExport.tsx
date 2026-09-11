import { Download, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { loadState, type JournalEntry } from '../stores/useStore'

const keys = ['journal', 'voiceJournal', 'voiceDraft', 'voiceMemory', 'dailyCheckIn', 'practiceOutcomes', 'cultivationPracticeRecords', 'mindMatterPracticeRecords', 'mindMatterActiveSession', 'flowSessions', 'regulationJourneyHistory', 'activeRegulationJourney', 'classicPracticeNotes', 'classicFavorites', 'classicPracticeCompletions', 'classicReadingProgress', 'completeReadingProgress', 'cultivationReadingProgress', 'activation', 'coachFeedback', 'ritualRecords', 'ritualProfile', 'evolutionFeedback'] as const
export default function ArchiveExport() {
  const [message, setMessage] = useState('')
  const download = (format: 'json' | 'md') => {
    try {
      const date = new Date().toLocaleDateString('en-CA')
      const data = Object.fromEntries(keys.map((key) => [key, loadState<unknown>(key, null)]))
      const journal = (data.journal ?? []) as JournalEntry[]
      const body = format === 'json' ? JSON.stringify({ application: 'HOS', version: 1, exportedAt: new Date().toISOString(), data }, null, 2)
        : ['# HOS · 我的个人日志', `导出日期：${date}。此文件含私人记录，请妥善保存。`, ...journal.map((entry) => `## ${new Date(entry.timestamp).toLocaleString('zh-CN')} · ${entry.trigger}\n\n${entry.organizedText || entry.newResponse}\n\n${entry.analysis || ''}\n\n### 原始表达\n\n${entry.rawFragment || entry.oldPattern}`)].join('\n\n---\n\n')
      const url = URL.createObjectURL(new Blob([body], { type: format === 'json' ? 'application/json;charset=utf-8' : 'text/markdown;charset=utf-8' }))
      const link = document.createElement('a'); link.href = url; link.download = `HOS-个人档案-${date}.${format}`; link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessage('已生成下载文件。请保存在你信任的位置。')
    } catch { setMessage('暂时无法导出，请检查浏览器是否允许下载。') }
  }
  return <section className="archive-export"><header><ShieldCheck size={18} /><strong>你的记录，由你保管</strong></header><p>记录保存在当前浏览器，清除数据或换设备不会自动同步。定期导出一份，避免丢失。备份不包含密钥或原始音频。</p><div><button onClick={() => download('md')}><Download size={15} />导出可读日记</button><button onClick={() => download('json')}>备份完整记录</button></div>{message && <p role="status">{message}</p>}</section>
}
