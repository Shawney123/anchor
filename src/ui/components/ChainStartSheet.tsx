import { useState } from 'react'
import { store, useProjection } from '../../data/store'
import { Sheet } from './Sheet'
import { Button, Field, Segmented, TextArea } from './primitives'
import { toast } from './toast'
import { haptic } from '../utils'

const ANCHOR_KINDS = [
  { value: 'object', label: '实物' },
  { value: 'place', label: '场所' },
  { value: 'ritual', label: '仪式' },
] as const

/**
 * 神圣座位：绑定一个看得见摸得着的实体锚点。
 * 链一旦落座，它的每一个节点都是不可篡改的工作量证明。
 */
export function ChainStartSheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const p = useProjection()
  const [anchorId, setAnchorId] = useState<string>('')
  const [newAnchor, setNewAnchor] = useState('')
  const [anchorKind, setAnchorKind] = useState<'object' | 'place' | 'ritual'>('object')
  const [task, setTask] = useState('')
  const [criterion, setCriterion] = useState('以最好的状态专注')
  const [minutes, setMinutes] = useState(String(p.settings.focusMinutes))

  const anchors = Object.values(p.anchors)

  function reset() {
    setAnchorId('')
    setNewAnchor('')
    setAnchorKind('object')
    setTask('')
    setCriterion('以最好的状态专注')
    setMinutes(String(p.settings.focusMinutes))
  }

  function close() {
    reset()
    onClose()
  }

  function resolveAnchor(): string | null {
    if (anchorId) return anchorId
    const name = newAnchor.trim()
    if (!name) {
      toast('先指定你的「神圣座位」')
      return null
    }
    return store.createAnchor(name, anchorKind)
  }

  function startNow() {
    const aid = resolveAnchor()
    if (!aid) return
    if (!task.trim()) {
      toast('写一句这次要完成什么')
      return
    }
    const chainId = store.createChain({
      anchorId: aid,
      taskText: task.trim(),
      criterion: criterion.trim(),
      focusMinutes: Number(minutes) || p.settings.focusMinutes,
    })
    store.startChain(chainId)
    haptic(18)
    toast('已落座')
    close()
  }

  function startBooking() {
    const aid = resolveAnchor()
    if (!aid) return
    if (!task.trim()) {
      toast('写一句这次要完成什么')
      return
    }
    const chainId = store.createChain({
      anchorId: aid,
      taskText: task.trim(),
      criterion: criterion.trim(),
      focusMinutes: Number(minutes) || p.settings.focusMinutes,
    })
    const delayMin = p.settings.bookingDelay
    store.createBooking(chainId, delayMin * 60_000, `预约信号 · ${delayMin} 分钟后`)
    haptic(14)
    toast(`已预约 ${delayMin} 分钟后`)
    close()
  }

  return (
    <Sheet open={open} onClose={close} title="落座">
      <div className="stack">
        <div className="body-sm text-2">
          神圣座位是这个协议的支点：一旦坐上去，就必须以最好的状态完成一件事。
        </div>

        {anchors.length ? (
          <div className="stack" style={{ gap: 6 }}>
            <span className="caption">选择你的锚点</span>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              {anchors.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="a-pick"
                  aria-pressed={anchorId === a.id}
                  onClick={() => {
                    setAnchorId(a.id)
                    setNewAnchor('')
                  }}
                >
                  {a.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <Field
          label="新建锚点"
          value={newAnchor}
          onChange={(e) => {
            setNewAnchor(e.target.value)
            setAnchorId('')
          }}
          placeholder="例如：书房那张桌子 / 那顶蓝帽子"
          hint="看得见、摸得着的实物最好；仪式也可以"
        />

        <div className="stack" style={{ gap: 6 }}>
          <span className="caption">锚点类型</span>
          <Segmented
            value={anchorKind}
            onChange={setAnchorKind}
            options={ANCHOR_KINDS.map((k) => ({ value: k.value, label: k.label }))}
          />
        </div>

        <Field
          label="这次要完成什么"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="例如：读完《复杂系统导论》第 4 章"
        />

        <TextArea label="判定标准" value={criterion} onChange={(e) => setCriterion(e.target.value)} />

        <Field
          label="单个专注单元（分钟）"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value.replace(/[^\d]/g, ''))}
          inputMode="numeric"
        />

        <div className="row" style={{ gap: 8 }}>
          <Button variant="ghost" className="grow" onClick={startBooking}>
            预约 {p.settings.bookingDelay} 分钟后
          </Button>
          <Button className="grow" onClick={startNow}>
            立即落座
          </Button>
        </div>
        <div className="caption text-3">
          预约的启动阻力更低 —— 决策被平移到贴现权重平坦的那一段。
        </div>
      </div>
    </Sheet>
  )
}
