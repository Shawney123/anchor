import { motion } from 'motion/react'
import { Compass, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { setLastDiagnosis } from '../../data/prefs'
import { generateCandidates, type PolicyDraft } from '../../domain/candidate'
import { diagnose, type DayProfile } from '../../domain/diagnose'
import { AddPolicySheet } from '../components/PolicySheet'
import { Button, Card, CardTitle, Chip, Field, SectionLabel } from '../components/primitives'
import { toast } from '../components/toast'

const YESTERDAY_PICKS = [
  { id: 'late', label: '睡得晚' },
  { id: 'sofa', label: '躺着刷手机' },
  { id: 'bed', label: '手机带上床' },
  { id: 'noddl', label: '没有明确任务' },
  { id: 'focus3', label: '专注块 ≥ 3' },
  { id: 'lowmood', label: '情绪低落' },
]

const WEEK_PICKS = [
  { id: 'late4', label: '4 天以上晚睡' },
  { id: 'sofa3', label: '3 天以上沙发刷手机' },
  { id: 'wake9', label: '2 天以上 9 点后才起' },
  { id: 'lowfocus', label: '几乎没有整块专注时间' },
  { id: 'lowmood', label: '情绪低落的天数较多' },
]

export function DiagnosePage() {
  const [yesterday, setYesterday] = useState<string[]>([])
  const [week, setWeek] = useState<string[]>([])
  const [problem, setProblem] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [draft, setDraft] = useState<PolicyDraft | null>(null)

  const days = useMemo<DayProfile[]>(() => {
    const list: DayProfile[] = []
    for (let i = 0; i < 7; i += 1) {
      list.push({
        sleepHour: week.includes('late4') ? 24.5 : 23,
        wakeHour: week.includes('wake9') ? 9.5 : 7.5,
        sofaScrolling: week.includes('sofa3'),
        phoneInBed: week.includes('sofa3'),
        hasDdl: true,
        focusBlocks: week.includes('lowfocus') ? 0 : 2,
        exercise: false,
        mood: week.includes('lowmood') ? 'low' : 'flat',
      })
    }
    const last = list[list.length - 1]
    last.sleepHour = yesterday.includes('late') ? 24.5 : last.sleepHour
    last.sofaScrolling = yesterday.includes('sofa') || last.sofaScrolling
    last.phoneInBed = yesterday.includes('bed') || last.phoneInBed
    last.hasDdl = !yesterday.includes('noddl')
    last.focusBlocks = yesterday.includes('focus3') ? 3 : yesterday.includes('noddl') ? 0 : 1
    last.mood = yesterday.includes('lowmood') ? 'low' : last.mood
    return list
  }, [yesterday, week])

  const report = useMemo(() => diagnose(days), [days])
  const candidates = useMemo(
    () => generateCandidates(problem || buildProblemText(days), 3),
    [problem, days],
  )

  function toggle(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
  }

  function saveSummary() {
    setLastDiagnosis({
      dailyTitle: report.daily.title,
      weeklyTitle: report.weekly.title,
      at: Date.now(),
    })
    toast('诊断结果已记下')
  }

  function openDraft(d: PolicyDraft) {
    setDraft(d)
    setAddOpen(true)
  }

  const closeAdd = () => {
    setAddOpen(false)
    setDraft(null)
  }

  const ready = yesterday.length > 0 || week.length > 0

  return (
    <div className="stack-lg">
      <header className="page-head">
        <div className="page-head__title">
          <div className="upper-label">诊断</div>
          <div className="h1">你在哪个尺度上被锁死</div>
        </div>
      </header>

      <div className="body-sm text-2" style={{ lineHeight: 1.7 }}>
        大尺度的负面稳态，靠小尺度的意志硬扛是扛不动的。
        先看清楚自己的剧本，再决定要把约束力投在哪一个节点上。
      </div>

      <Card>
        <CardTitle extra={ready ? <Chip tone="accent">已填写</Chip> : <Chip>可选</Chip>}>
          最近的情况
        </CardTitle>

        <span className="caption">昨天</span>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {YESTERDAY_PICKS.map((c) => (
            <button
              key={c.id}
              type="button"
              className="a-pick"
              aria-pressed={yesterday.includes(c.id)}
              onClick={() => setYesterday((s) => toggle(s, c.id))}
            >
              {c.label}
            </button>
          ))}
        </div>

        <span className="caption" style={{ display: 'block', marginTop: 16 }}>
          这一周
        </span>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {WEEK_PICKS.map((c) => (
            <button
              key={c.id}
              type="button"
              className="a-pick"
              aria-pressed={week.includes(c.id)}
              onClick={() => setWeek((s) => toggle(s, c.id))}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Card>

      {ready ? (
        <>
          <SectionLabel>日级稳态</SectionLabel>
          <motion.div className="script-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="script-card__title">{report.daily.title}</div>
            <div className="body-sm text-2" style={{ marginTop: 10, lineHeight: 1.7 }}>
              {report.daily.desc}
            </div>
            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <Chip tone="info">置信度 {Math.round(report.daily.confidence * 100)}%</Chip>
              {report.signals.map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
            </div>
          </motion.div>

          <SectionLabel>周级稳态</SectionLabel>
          <motion.div className="script-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="script-card__title">{report.weekly.title}</div>
            <div className="body-sm text-2" style={{ marginTop: 10, lineHeight: 1.7 }}>
              {report.weekly.desc}
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <Chip tone="info">置信度 {Math.round(report.weekly.confidence * 100)}%</Chip>
            </div>
          </motion.div>

          {report.nodes.length ? (
            <>
              <SectionLabel>有效干预节点</SectionLabel>
              <Card>
                {report.nodes.map((n) => (
                  <div key={n.title} className="a-row" style={{ alignItems: 'flex-start' }}>
                    <Sparkles size={16} className="accent" style={{ marginTop: 4, flex: 'none' }} />
                    <div className="grow">
                      <div style={{ fontWeight: 600 }}>{n.title}</div>
                      <div className="caption text-3" style={{ marginTop: 2, lineHeight: 1.55 }}>
                        {n.why}
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="ghost" size="sm" block style={{ marginTop: 12 }} onClick={saveSummary}>
                  记下这个诊断
                </Button>
              </Card>
            </>
          ) : null}
        </>
      ) : null}

      <SectionLabel>国策设计器</SectionLabel>
      <Card>
        <CardTitle>描述一个你想改掉的问题</CardTitle>
        <Field
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          placeholder="例如：晚上躺床上总要刷一小时手机"
          hint="离线本地引擎，不联网、不需要任何密钥"
        />

        <div className="stack" style={{ gap: 10, marginTop: 14 }}>
          {candidates.map((c, i) => (
            <motion.div
              key={`${c.name}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: i * 0.05 }}
              className="a-verdict"
              style={{ cursor: 'pointer' }}
              onClick={() => openDraft(c)}
            >
              <div className="row-between">
                <div className="h3 grow truncate">{c.name}</div>
                <Chip tone="accent">
                  {c.type === 'passive' ? '被动' : c.type === 'semi_passive' ? '半被动' : c.type === 'active' ? '主动' : '机制'}
                </Chip>
              </div>
              <div className="a-verdict__cost" style={{ color: 'var(--text-2)' }}>
                {c.triggerSpec} → {c.criterion}
              </div>
              <div className="caption text-3" style={{ marginTop: 6 }}>
                {c.rationale}
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="row" style={{ gap: 10 }}>
          <Compass size={18} className="accent" style={{ flex: 'none' }} />
          <div className="body-sm text-2" style={{ lineHeight: 1.7 }}>
            本页的诊断与候选全部在本地完成，不联网、不上传。
            它不是诊断工具，只是把你已经知道的事情，用可执行的规则重新排列一遍。
          </div>
        </div>
      </Card>

      <AddPolicySheet open={addOpen} onClose={closeAdd} draft={draft} />
    </div>
  )
}

function buildProblemText(days: DayProfile[]): string {
  const tags: string[] = []
  const sofa = days.filter((d) => d.sofaScrolling).length
  const bed = days.filter((d) => d.phoneInBed).length
  const late = days.filter((d) => d.sleepHour >= 23.5).length
  const lowFocus = days.filter((d) => d.focusBlocks <= 1).length
  if (sofa) tags.push('沙发 刷手机 手机 短视频')
  if (bed) tags.push('熬夜 晚睡 睡前 手机')
  if (late) tags.push('熬夜 晚睡 起不来 起床')
  if (lowFocus) tags.push('拖延 启动困难 分心')
  return tags.join(' ')
}
