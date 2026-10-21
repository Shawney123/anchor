import { ShieldAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { store, useProjection } from '../../data/store'
import { NON_NEGOTIABLE } from '../../domain/types'
import { Sheet } from '../components/Sheet'
import { Button, Card, Chip, EmptyState, SectionLabel } from '../components/primitives'
import { toast } from '../components/toast'
import { haptic } from '../utils'
import { relativeTime } from '../utils'

export function LedgerPage() {
  const p = useProjection()
  const [resetOpen, setResetOpen] = useState(false)

  const grants = useMemo(
    () =>
      Object.entries(p.allowedBehaviors)
        .map(([key, at]) => ({
          key,
          at,
          count: p.allowanceLog.filter((l) => l.behaviorKey === key).length,
        }))
        .sort((a, b) => b.at - a.at),
    [p.allowedBehaviors, p.allowanceLog],
  )

  const todayLog = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    return p.allowanceLog.filter((l) => l.at >= start.getTime())
  }, [p.allowanceLog])

  function doReset() {
    store.resetAllPrecedents()
    setResetOpen(false)
    haptic([24, 40, 24])
    toast('全部永久豁免已清空 —— 判定标准重新收紧')
  }

  return (
    <div className="stack-lg">
      <header className="page-head">
        <div className="page-head__title">
          <div className="upper-label">判例</div>
          <div className="h1">你放过自己什么</div>
        </div>
      </header>

      <div className="body-sm text-2" style={{ lineHeight: 1.7 }}>
        「下必为例」：一旦允许某个行为，它就永久合法了 —— 除非你自己把整本账本清空。
        这条规则的存在，是为了让例外从「我可以通融一下」变成「我必须承担一次永久性的损失」。
      </div>

      <SectionLabel>永久豁免 · {grants.length}</SectionLabel>

      {grants.length ? (
        <div className="stack" style={{ gap: 10 }}>
          {grants.map((g) => (
            <div key={g.key} className="ledger-item ledger-item--risk">
              <div className="row-between">
                <div className="h3 grow truncate">{g.key}</div>
                <Chip tone="danger">永久</Chip>
              </div>
              <div className="caption text-3" style={{ marginTop: 6 }}>
                授予于 {relativeTime(g.at)} · 累计放行 {g.count} 次
              </div>
              <div className="caption text-3" style={{ marginTop: 2 }}>
                这条豁免让「最好的状态」的判定标准永久放宽。
              </div>
            </div>
          ))}
          <Button variant="danger" block onClick={() => setResetOpen(true)}>
            清空全部永久豁免
          </Button>
          <div className="caption text-3" style={{ textAlign: 'center' }}>
            豁免不可单条撤销 —— 这正是它有约束力的原因。
          </div>
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<ShieldAlert size={22} />}
            title="账本是干净的"
            desc="还没有任何永久豁免。当你在链中判定一次中断时，如果选择「永久允许」，它就会出现在这里。"
          />
        </Card>
      )}

      <SectionLabel>永久禁止</SectionLabel>
      <Card>
        <div className="body-sm text-2" style={{ marginBottom: 10 }}>
          以下行为不提供「永久允许」选项 —— 系统不会用它们给真实伤害开口子。
        </div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {NON_NEGOTIABLE.map((n) => (
            <span key={n} className="a-chip a-chip--danger">
              {n}
            </span>
          ))}
        </div>
      </Card>

      <SectionLabel>今日放行 · {todayLog.length}</SectionLabel>
      <Card>
        {todayLog.length ? (
          todayLog.map((l, i) => (
            <div key={`${l.behaviorKey}-${l.at}-${i}`} className="a-row">
              <span className="policy-dot policy-dot--out" />
              <span className="grow truncate body-sm">{l.behaviorKey}</span>
              <span className="caption text-3 mono">
                {new Date(l.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        ) : (
          <div className="body-sm text-3">今天还没有放行记录。</div>
        )}
      </Card>

      <Sheet open={resetOpen} onClose={() => setResetOpen(false)} title="清空全部永久豁免">
        <div className="stack">
          <div className="body-sm text-2" style={{ lineHeight: 1.7 }}>
            这会一次性删除 {grants.length} 条永久豁免。所有链的判定标准会立刻收紧 ——
            那些被永久放行的行为，从下一条链开始重新算违规。
          </div>
          <div className="body-sm danger">
            正在进行的链可能会因此清零。这是有意的摩擦：清空账本，是把约束力重新握回手里的唯一方式。
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Button variant="quiet" className="grow" onClick={() => setResetOpen(false)}>
              取消
            </Button>
            <Button variant="danger" className="grow" onClick={doReset}>
              确认清空
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  )
}
