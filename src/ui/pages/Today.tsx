import { AnimatePresence, motion } from 'motion/react'
import { Anchor, ChevronRight, Clock, Settings as SettingsIcon, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getLastDiagnosis } from '../../data/prefs'
import { store, useProjection } from '../../data/store'
import { currentBooking, currentChain, todayPolicy } from '../../domain/projection'
import type { Route } from '../../router'
import { ChainStartSheet } from '../components/ChainStartSheet'
import { AddPolicySheet } from '../components/PolicySheet'
import { Ring } from '../components/Ring'
import { Sheet } from '../components/Sheet'
import { toast } from '../components/toast'
import { Button, Card, CardTitle, Chip, EmptyState, SectionLabel } from '../components/primitives'
import { haloVariants } from '../motion'
import { fmtDateLabel, fmtDuration, haptic, useNow } from '../utils'

export function TodayPage({ onNavigate }: { onNavigate: (r: Route) => void }) {
  const p = useProjection()
  const now = useNow(1000)
  const [startOpen, setStartOpen] = useState(false)
  const [settleOpen, setSettleOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [review, setReview] = useState('')
  const [halo, setHalo] = useState(0)

  const chain = currentChain(p)
  const booking = currentBooking(p)
  const lit = todayPolicy(p)
  const lastDiagnosis = getLastDiagnosis()

  const anchors = p.anchors
  const anchor = chain ? anchors[chain.anchorId] : null

  const hand = useMemo(
    () => Object.values(p.policies).filter((ps) => ps.state !== 'out'),
    [p.policies],
  )

  useEffect(() => {
    setReview(p.reviews[p.today] ?? '')
  }, [p.reviews, p.today])

  // 预约倒计时同步到标签页标题：切到后台也能看到还剩多久
  useEffect(() => {
    if (!booking || booking.status === 'missed' || booking.status === 'done') {
      document.title = 'Anchor · 自制力协议'
      return
    }
    const remain = booking.dueAt - Date.now()
    if (remain > 0) {
      document.title = `${fmtDuration(remain)} 后落座 · Anchor`
    }
    return () => {
      document.title = 'Anchor · 自制力协议'
    }
  }, [booking])

  const remaining = booking ? booking.dueAt - now : 0
  const bookingProgress = booking ? 1 - Math.max(0, remaining) / booking.delayMs : 0

  function land() {
    if (!booking) return
    store.startChain(booking.chainId)
    store.immediateBooking(booking.id)
    haptic(18)
    setHalo((h) => h + 1)
    toast('已落座')
  }

  return (
    <div className="stack-lg">
      <header className="page-head">
        <div className="page-head__title">
          <div className="caption text-3">{fmtDateLabel()}</div>
          <div className="h1">今天只做一件</div>
        </div>
        <button type="button" className="a-icon-btn" aria-label="设置" onClick={() => onNavigate('settings')}>
          <SettingsIcon size={22} strokeWidth={1.75} />
        </button>
      </header>

      {lastDiagnosis ? (
        <button type="button" className="a-chip a-chip--accent" onClick={() => onNavigate('diagnose')}>
          <Sparkles size={12} />
          日级稳态：{lastDiagnosis.dailyTitle.replace(/[《》]/g, '')}
        </button>
      ) : null}

      {/* ── 链卡 ── */}
      <AnimatePresence mode="wait">
        {booking && remaining > 0 ? (
          <motion.div key="booking" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card accent>
              <div className="countdown">
                <Ring progress={bookingProgress} size={168}>
                  <div style={{ textAlign: 'center' }}>
                    <div className={`countdown__num ${remaining < 60_000 ? 'countdown__num--urgent' : ''}`}>
                      {fmtDuration(remaining)}
                    </div>
                    <div className="caption text-3" style={{ marginTop: 6 }}>
                      {booking.signal}
                    </div>
                  </div>
                </Ring>
                <div className="body-sm text-2" style={{ textAlign: 'center', maxWidth: 280 }}>
                  预约已经生效。到点后你必须坐上那个座位——这是你与自己达成的跨时间协议。
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <Button variant="quiet" size="sm" onClick={() => store.deferBooking(booking.id)}>
                    顺延 5 分钟
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => store.missBooking(booking.id)}>
                    错过
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ) : booking && remaining <= 0 ? (
          <motion.div key="due" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <Card accent>
              <div className="countdown">
                <div className="upper-label">预约已到点</div>
                <div className="body-sm text-2" style={{ textAlign: 'center', maxWidth: 300 }}>
                  现在执行即时启动信号——坐上那个座位。启动阻力在这一刻是最低的。
                </div>
                <Button size="lg" block onClick={land}>
                  落座
                </Button>
                <button
                  type="button"
                  className="caption text-3"
                  onClick={() => store.deferBooking(booking.id)}
                >
                  这次真的做不到 —— 顺延 5 分钟
                </button>
              </div>
            </Card>
          </motion.div>
        ) : chain ? (
          <motion.div key="active" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card accent className="today-hero">
              <div className="today-hero__halo" />
              <div className="today-hero__anchor">
                <Anchor size={15} />
                {anchor?.name ?? '未指定锚点'}
              </div>
              <div className="today-hero__task">{chain.taskText}</div>
              <div className="row" style={{ gap: 10, marginTop: 10 }}>
                <Chip tone="accent">目标 #{chain.completedNodes + 1}</Chip>
                <Chip>已累计 {chain.completedNodes} 个节点</Chip>
                {chain.resets > 0 ? <Chip tone="danger">清零 {chain.resets} 次</Chip> : null}
              </div>
              <div className="row" style={{ gap: 8, marginTop: 16 }}>
                <Button className="grow" onClick={() => onNavigate('chain')}>
                  回到链
                </Button>
                <Button variant="ghost" className="grow" onClick={() => setStartOpen(true)}>
                  新开一条
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="today-hero">
              <AnimatePresence>
                <motion.div
                  key={halo}
                  className="today-hero__halo"
                  variants={haloVariants}
                  initial="initial"
                  animate="enter"
                  style={{ position: 'absolute' }}
                />
              </AnimatePresence>
              <div className="upper-label">链已空</div>
              <div className="today-hero__task">准备好一个座位了吗</div>
              <div className="body-sm text-2" style={{ marginTop: 8 }}>
                预约通常比「立刻开始」更容易按下 —— 这是线性时延原理：把决策平移到贴现权重平坦的那一段。
              </div>
              <div className="today-hero__cta">
                <Button variant="ghost" onClick={() => setStartOpen(true)}>
                  预约 15 分钟后
                </Button>
                <Button onClick={() => setStartOpen(true)}>立即落座</Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 今日结算 ── */}
      <Card>
        <CardTitle
          extra={
            lit ? (
              <Chip tone="success">已结算</Chip>
            ) : (
              <Chip>一天只加一个节点</Chip>
            )
          }
        >
          今日结算
        </CardTitle>

        {lit ? (
          <div className="settle settle--done">
            <span className="settle__dot" />
            <div className="grow">
              <div className="h3">{lit.policy.name}</div>
              <div className="caption text-3">
                累计 {lit.litCount} 天 · 熟练度 {lit.habituation}% · 等级 L{lit.level}
              </div>
            </div>
          </div>
        ) : (
          <button type="button" className="settle" onClick={() => setSettleOpen(true)}>
            <span className="settle__dot" />
            <div className="grow">
              <div className="h3">我今天做到了</div>
              <div className="caption text-3">选择今天兑现的那一条国策</div>
            </div>
            <ChevronRight size={18} className="text-3" />
          </button>
        )}
      </Card>

      {/* ── 一句话复盘 ── */}
      <Card>
        <CardTitle>一句话复盘</CardTitle>
        <textarea
          className="a-field"
          placeholder="今天最难的是……（可跳过）"
          value={review}
          onChange={(e) => setReview(e.target.value)}
          onBlur={() => store.setReview(review.trim())}
          style={{ minHeight: 72 }}
        />
      </Card>

      {/* ── 手牌 ── */}
      {!p.settings.simpleMode ? (
        <>
          <SectionLabel>手牌 · {hand.length}</SectionLabel>
          <Card>
            {hand.length ? (
              hand.slice(0, 5).map((ps) => (
                <div key={ps.policy.id} className="a-row">
                  <span className={`policy-dot policy-dot--${ps.state}`} />
                  <div className="grow truncate">{ps.policy.name}</div>
                  <span className="caption text-3">{ps.habituation}%</span>
                </div>
              ))
            ) : (
              <EmptyState
                icon={<Clock size={22} />}
                title="手牌是空的"
                desc="去「诊断」页找一个有效干预节点，生成你的第一条国策。"
              />
            )}
            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <Button variant="ghost" size="sm" className="grow" onClick={() => onNavigate('diagnose')}>
                去诊断
              </Button>
              <Button variant="ghost" size="sm" className="grow" onClick={() => setAddOpen(true)}>
                手动新建
              </Button>
            </div>
          </Card>
        </>
      ) : null}

      <ChainStartSheet open={startOpen} onClose={() => setStartOpen(false)} />
      <AddPolicySheet open={addOpen} onClose={() => setAddOpen(false)} />
      <SettleSheet open={settleOpen} onClose={() => setSettleOpen(false)} />
    </div>
  )
}

/* ──────────────────────────  今日结算选择  ────────────────────────── */

function SettleSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const p = useProjection()
  const [addOpen, setAddOpen] = useState(false)

  const candidates = Object.values(p.policies).filter((ps) => ps.state !== 'out')

  function pick(policyId: string) {
    if (!store.canLightToday()) {
      toast('今天已经点亮一个国策了')
      return
    }
    const ps = p.policies[policyId]
    store.lightPolicy(policyId, ps?.policy.parentId ?? null)
    haptic(14)
    toast(`已点亮「${ps?.policy.name ?? ''}」`)
    onClose()
  }

  return (
    <>
      <Sheet open={open} onClose={onClose} title="今天做到了哪一条">
        <div className="stack">
          {candidates.length ? (
            <div className="stack" style={{ gap: 8 }}>
              {candidates.map((ps) => (
                <button
                  key={ps.policy.id}
                  type="button"
                  className="a-verdict"
                  onClick={() => pick(ps.policy.id)}
                >
                  <div className="h3">{ps.policy.name}</div>
                  <div className="a-verdict__cost">
                    {ps.policy.triggerSpec} · 累计 {ps.litCount} 天 · 熟练度 {ps.habituation}%
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Clock size={22} />}
              title="还没有国策"
              desc="国策是你今天要兑现的那条规则。先造一条，或者去诊断页让它帮你找一个。"
            />
          )}
          <Button variant="ghost" block onClick={() => { onClose(); setAddOpen(true) }}>
            新建一条国策
          </Button>
        </div>
      </Sheet>
      <AddPolicySheet open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  )
}
