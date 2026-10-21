import { AnimatePresence, motion } from 'motion/react'
import { Anchor, Check, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { store, useProjection } from '../../data/store'
import { currentChain } from '../../domain/projection'
import { ChainStartSheet } from '../components/ChainStartSheet'
import { PrecedentSheet } from '../components/PrecedentSheet'
import { Ring } from '../components/Ring'
import { toast } from '../components/toast'
import { Button, Card, CardTitle, Chip, EmptyState } from '../components/primitives'
import { fmtClock, fmtDuration, haptic, useNow } from '../utils'

export function ChainPage({ onClose }: { onClose: () => void }) {
  const p = useProjection()
  const now = useNow(1000)
  const [startOpen, setStartOpen] = useState(false)
  const [verdictOpen, setVerdictOpen] = useState(false)

  const chain = currentChain(p)
  const anchor = chain ? p.anchors[chain.anchorId] : null
  const elapsed = chain?.startedAt ? now - chain.startedAt : 0

  // 链进行中保持屏幕常亮，避免锁屏错过到点与结算
  useEffect(() => {
    if (!chain || !p.settings.keepAwake) return
    let lock: WakeLockSentinel | null = null
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinel> } }
    const request = async () => {
      try {
        lock = await nav.wakeLock?.request('screen')
      } catch {
        /* 忽略 */
      }
    }
    void request()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release?.()
    }
  }, [chain, p.settings.keepAwake])

  if (!chain) {
    return (
      <div className="stack-lg">
        <header className="page-head">
          <div className="page-head__title">
            <div className="upper-label">链</div>
            <div className="h1">现在没有进行中的链</div>
          </div>
          <button type="button" className="a-icon-btn" aria-label="关闭" onClick={onClose}>
            <X size={22} strokeWidth={1.75} />
          </button>
        </header>
        <Card>
          <EmptyState
            title="链是空的"
            desc="落座之后，每完成一个专注单元就会累积一个节点。节点越多，那个座位就越坐不得了。"
            action={
              <Button size="lg" onClick={() => setStartOpen(true)}>
                落座
              </Button>
            }
          />
        </Card>
        <ChainStartSheet open={startOpen} onClose={() => setStartOpen(false)} />
      </div>
    )
  }

  const targetMs = chain.focusMinutes * 60_000
  const progress = Math.min(1, elapsed / targetMs)

  const endChain = () => {
    const nodes = chain.completedNodes
    store.endChain(chain.id)
    haptic([18, 30, 18])
    toast(nodes > 0 ? `本链结束，${nodes} 个节点` : '本链结束')
    onClose()
  }

  const completeNode = () => {
    store.completeNode(chain.id, elapsed)
    haptic(14)
    toast(`节点 #${chain.completedNodes + 1} 完成`)
  }

  return (
    <div className="stack-lg">
      <header className="page-head">
        <div className="page-head__title">
          <div className="upper-label">链 · 进行中</div>
          <div className="h1 truncate">{chain.taskText}</div>
        </div>
        <button type="button" className="a-icon-btn" aria-label="关闭" onClick={onClose}>
          <X size={22} strokeWidth={1.75} />
        </button>
      </header>

      <Card accent>
        <div className="countdown">
          <Ring progress={progress} size={176} color="var(--accent)">
            <div style={{ textAlign: 'center' }}>
              <div className="today-hero__big">{fmtDuration(elapsed)}</div>
              <div className="caption text-3" style={{ marginTop: 6 }}>
                目标 {chain.focusMinutes} 分钟
              </div>
            </div>
          </Ring>

          <div className="row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Chip tone="accent">
              <Anchor size={12} />
              {anchor?.name ?? '未指定锚点'}
            </Chip>
            <Chip>判定：{chain.criterion}</Chip>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle
          extra={<Chip tone={chain.resets ? 'danger' : 'default'}>清零 {chain.resets} 次</Chip>}
        >
          链节
        </CardTitle>
        {chain.nodes.length ? (
          <div className="stack" style={{ gap: 0 }}>
            <AnimatePresence initial={false}>
              {chain.nodes.map((n) => (
                <motion.div
                  key={n.no}
                  className="a-row"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, delay: Math.min(0.3, n.no * 0.05) }}
                >
                  <span className="policy-dot policy-dot--lit" />
                  <span className="mono accent">#{n.no}</span>
                  <span className="grow truncate body-sm">{chain.taskText}</span>
                  <span className="caption text-3 mono">{fmtDuration(n.durationMs)}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="body-sm text-3">
            还没有节点。完成第一个专注单元后，这里会记下不可篡改的工作量证明。
          </div>
        )}
        <div className="row" style={{ gap: 8, marginTop: 12 }}>
          <Button variant="ghost" className="grow" size="sm" onClick={completeNode}>
            <Check size={15} />
            完成一个节点
          </Button>
        </div>
      </Card>

      <Card>
        <CardTitle>本链判例</CardTitle>
        {Object.keys(p.allowedBehaviors).length ? (
          <div className="stack" style={{ gap: 6 }}>
            <div className="caption text-3">已永久允许（全局生效）</div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
              {Object.keys(p.allowedBehaviors).map((k) => (
                <Chip key={k} tone="danger">
                  {k}
                </Chip>
              ))}
            </div>
          </div>
        ) : (
          <div className="body-sm text-3">本链尚未判定过任何中断。</div>
        )}
        <div className="row" style={{ gap: 8, marginTop: 14 }}>
          <Button variant="ghost" className="grow" onClick={() => setVerdictOpen(true)}>
            判定一次中断
          </Button>
          <Button variant="quiet" className="grow" onClick={endChain}>
            结束本链
          </Button>
        </div>
      </Card>

      {chain.startedAt ? (
        <div className="caption text-3" style={{ textAlign: 'center' }}>
          开始于 {fmtClock(chain.startedAt)}
        </div>
      ) : null}

      <PrecedentSheet open={verdictOpen} onClose={() => setVerdictOpen(false)} chainId={chain.id} />
    </div>
  )
}
