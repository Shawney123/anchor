import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { store, useProjection } from '../../data/store'
import { COMMON_BEHAVIORS, NON_NEGOTIABLE } from '../../domain/types'
import { lineReveal, pulseOnce } from '../motion'
import { Sheet } from './Sheet'
import { Button, Field } from './primitives'
import { haptic } from '../utils'
import { toast } from './toast'

type Stage = 'pick' | 'verdict' | 'granted'

/**
 * 判例二选一 —— 下必为例原则的产品形态。
 * 代价写在按钮内部，不藏在二级弹窗里：让当下这一刻的决策显式承担长远代价。
 */
export function PrecedentSheet({
  open,
  onClose,
  chainId,
}: {
  open: boolean
  onClose: () => void
  chainId: string
}) {
  const p = useProjection()
  const [stage, setStage] = useState<Stage>('pick')
  const [behavior, setBehavior] = useState<string>('')
  const [custom, setCustom] = useState('')
  const [grantedKey, setGrantedKey] = useState<string>('')

  const alreadyAllowed = useMemo(
    () => (behavior ? Object.prototype.hasOwnProperty.call(p.allowedBehaviors, behavior) : false),
    [behavior, p.allowedBehaviors],
  )
  const isNonNegotiable = NON_NEGOTIABLE.includes(behavior)

  const affected = useMemo(() => {
    if (!behavior) return []
    return Object.values(p.policies)
      .filter((ps) => ps.policy.criterion.includes(behavior) || ps.policy.criterion.includes('最好的状态'))
      .map((ps) => ps.policy.name)
      .slice(0, 4)
  }, [behavior, p.policies])

  function reset() {
    setStage('pick')
    setBehavior('')
    setCustom('')
    setGrantedKey('')
  }

  function close() {
    reset()
    onClose()
  }

  function confirmBehavior() {
    const b = (custom.trim() || behavior).trim()
    if (!b) return
    setBehavior(b)
    setStage('verdict')
  }

  function judgeViolation() {
    store.resetChain(chainId)
    haptic([24, 40, 24])
    toast('本链已清零，从 #1 重新开始')
    close()
  }

  function grantForever() {
    store.grantPrecedent(behavior, chainId)
    setGrantedKey(behavior)
    setStage('granted')
    haptic(18)
  }

  return (
    <Sheet open={open} onClose={close} title="判定一次中断">
      {stage === 'pick' ? (
        <div className="stack">
          <div className="body-sm text-2">
            这次发生了什么？选一个，或自己写。选择后你可以决定：它算违规，还是从今往后永久合法。
          </div>

          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            {COMMON_BEHAVIORS.map((b) => (
              <button
                key={b}
                type="button"
                className="a-pick"
                aria-pressed={behavior === b}
                onClick={() => {
                  setBehavior(b)
                  setCustom('')
                }}
              >
                {b}
              </button>
            ))}
          </div>

          <Field
            label="其他行为"
            placeholder="例如：临时接了个工作电话"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value)
              setBehavior('')
            }}
          />

          <Button block size="lg" disabled={!(custom.trim() || behavior)} onClick={confirmBehavior}>
            下一步
          </Button>
        </div>
      ) : null}

      {stage === 'verdict' ? (
        <div className="stack">
          <div className="body-sm text-2">
            判据：<span className="accent">以最好的状态专注</span>
          </div>

          {alreadyAllowed ? (
            <div className="a-verdict">
              <div className="h3">「{behavior}」已永久允许</div>
              <div className="a-verdict__cost">
                这条豁免是你此前授予的，本次不再计入违规。本链继续。
              </div>
            </div>
          ) : (
            <>
              <button type="button" className="a-verdict" onClick={judgeViolation}>
                <div className="h3">判定违规</div>
                <div className="a-verdict__cost">
                  本链清零，从 #1 重新开始。已经积累的熟练度与判例不受影响。
                </div>
              </button>

              {isNonNegotiable ? (
                <div className="a-verdict a-verdict--risk" style={{ cursor: 'default' }}>
                  <div className="h3 danger">这一项不可永久豁免</div>
                  <div className="a-verdict__cost">
                    「{behavior}」属于不可豁免清单：它不会被写成「永久合法」，只能判定违规。
                  </div>
                </div>
              ) : (
                <motion.button
                  type="button"
                  className="a-verdict a-verdict--risk"
                  onClick={grantForever}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="h3 danger">永久允许「{behavior}」</div>
                  <div className="a-verdict__cost">
                    此后所有链中该行为均合法，「最好的状态」的判定标准将永久放宽。
                    {affected.length ? ` 影响：${affected.join('、')}。` : ''}
                  </div>
                </motion.button>
              )}
            </>
          )}

          <div className="row" style={{ gap: 8 }}>
            <Button variant="quiet" className="grow" onClick={() => setStage('pick')}>
              返回
            </Button>
            {alreadyAllowed ? (
              <Button className="grow" onClick={close}>
                知道了
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {stage === 'granted' ? (
        <div className="stack">
          <motion.div
            className="a-verdict a-verdict--risk"
            variants={pulseOnce}
            initial="initial"
            animate="animate"
          >
            <div className="h3 danger">已永久允许「{grantedKey}」</div>
            <div className="a-verdict__cost">这条豁免不可单条撤销。</div>
          </motion.div>

          <div className="stack" style={{ gap: 6 }}>
            <AnimatePresence>
              {affected.length ? (
                <>
                  <motion.div variants={lineReveal(0)} initial="initial" animate="animate" className="caption">
                    受影响的判定标准
                  </motion.div>
                  {affected.map((name, i) => (
                    <motion.div key={name} variants={lineReveal(i + 1)} initial="initial" animate="animate" className="body-sm">
                      · {name}
                    </motion.div>
                  ))}
                </>
              ) : (
                <motion.div variants={lineReveal(0)} initial="initial" animate="animate" className="body-sm text-2">
                  之后你在链中做这件事，不会再被判定为违规。
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Button block size="lg" onClick={close}>
            继续
          </Button>
        </div>
      ) : null}
    </Sheet>
  )
}
