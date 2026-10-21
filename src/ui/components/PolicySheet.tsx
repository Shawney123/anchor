import { useEffect, useState } from 'react'
import { store, useProjection } from '../../data/store'
import type { PolicyDraft } from '../../domain/candidate'
import type { PolicyType } from '../../domain/types'
import { toast } from './toast'
import { Sheet } from './Sheet'
import { MiniRing } from './Ring'
import { Button, Chip, Field, KV, Segmented, TextArea } from './primitives'
import { GRADE_LABEL, TYPE_LABEL, gradeTone } from './labels'
import { haptic } from '../utils'

/* ──────────────────────────  国策详情  ────────────────────────── */

export function PolicySheet({
  policyId,
  open,
  onClose,
}: {
  policyId: string | null
  open: boolean
  onClose: () => void
}) {
  const p = useProjection()
  const ps = policyId ? p.policies[policyId] : null
  const [editing, setEditing] = useState(false)

  if (!ps) return null
  const { policy } = ps

  function light() {
    if (!store.canLightToday()) {
      toast('今天已经点亮一个国策了 —— 一天只加一个节点')
      return
    }
    store.lightPolicy(policy.id, policy.parentId ?? null)
    haptic(14)
    toast(`已点亮「${policy.name}」`)
    onClose()
  }

  function extinguish() {
    store.extinguishPolicy(policy.id, 'manual')
    toast('已放回手牌，熟练度保留')
    onClose()
  }

  function remove() {
    store.deletePolicy(policy.id)
    toast('已删除')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose}>
      {editing ? (
        <div className="stack">
          <div className="h2">编辑国策</div>
          <Field
            label="名称"
            defaultValue={policy.name}
            onChange={(e) => store.updatePolicy(policy.id, { name: e.target.value })}
          />
          <Field
            label="触发条件"
            defaultValue={policy.triggerSpec}
            onChange={(e) => store.updatePolicy(policy.id, { triggerSpec: e.target.value })}
          />
          <TextArea
            label="判定标准"
            defaultValue={policy.criterion}
            onChange={(e) => store.updatePolicy(policy.id, { criterion: e.target.value })}
          />
          <div className="row" style={{ gap: 8 }}>
            <Button variant="quiet" className="grow" onClick={() => setEditing(false)}>
              完成
            </Button>
          </div>
        </div>
      ) : (
        <div className="stack">
          <div className="row-between">
            <div className="grow">
              <div className="h2">{policy.name}</div>
              <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <Chip tone="accent">{TYPE_LABEL[policy.type]}</Chip>
                <Chip>等级 L{ps.level}</Chip>
                <Chip tone={ps.state === 'lit' ? 'success' : ps.state === 'out' ? 'danger' : 'default'}>
                  {ps.state === 'lit' ? '已点亮' : ps.state === 'out' ? '已熄灭' : '手牌'}
                </Chip>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <MiniRing progress={ps.habituation / 100} size={40} stroke={3} />
              <div className="caption text-3" style={{ marginTop: 4 }}>
                {ps.habituation}%
              </div>
            </div>
          </div>

          <div>
            <KV k="触发" v={policy.triggerSpec} />
            <KV k="判定" v={policy.criterion} />
            <KV k="杠杆率" v={<Chip tone={gradeTone(policy.lever)}>{GRADE_LABEL[policy.lever]}</Chip>} />
            <KV k="阻力" v={<Chip tone={gradeTone(policy.resistance)}>{GRADE_LABEL[policy.resistance]}</Chip>} />
            <KV k="维护成本" v={<Chip tone={gradeTone(policy.maintenance)}>{GRADE_LABEL[policy.maintenance]}</Chip>} />
            <KV k="累计天数" v={`${ps.litCount} 天`} />
            {policy.source ? <KV k="出处" v={<span className="text-2">{policy.source}</span>} /> : null}
          </div>

          {policy.rationale ? (
            <div className="body-sm text-2" style={{ lineHeight: 1.65 }}>
              {policy.rationale}
            </div>
          ) : null}

          {ps.state === 'out' && ps.extinguishCause ? (
            <div className="body-sm" style={{ color: 'var(--danger)' }}>
              ✕ 已熄灭（{causeLabel(ps.extinguishCause)}）—— 熟练度与判例都保留着，重新点亮即可继续。
            </div>
          ) : null}

          <div className="stack" style={{ gap: 8 }}>
            {ps.state !== 'lit' ? (
              <Button block size="lg" onClick={light}>
                我今天做到了
              </Button>
            ) : (
              <Button block variant="quiet" onClick={light}>
                今天也做到了（+1）
              </Button>
            )}
            <div className="row" style={{ gap: 8 }}>
              <Button variant="ghost" size="sm" className="grow" onClick={() => setEditing(true)}>
                编辑
              </Button>
              {ps.state !== 'candidate' ? (
                <Button variant="ghost" size="sm" className="grow" onClick={extinguish}>
                  放回手牌
                </Button>
              ) : null}
              <Button variant="danger" size="sm" onClick={remove}>
                删除
              </Button>
            </div>
          </div>
        </div>
      )}
    </Sheet>
  )
}

function causeLabel(cause: string): string {
  switch (cause) {
    case 'violation':
      return '自身违规'
    case 'parent':
      return '父节点熄灭，连锁带崩'
    case 'group':
      return '所在组超过容错名额'
    case 'expiry':
      return '冻结到期未满足'
    default:
      return '手动放回手牌'
  }
}

/* ──────────────────────────  新建国策  ────────────────────────── */

export function AddPolicySheet({
  open,
  onClose,
  draft,
}: {
  open: boolean
  onClose: () => void
  draft?: PolicyDraft | null
}) {
  const p = useProjection()
  const [name, setName] = useState(draft?.name ?? '')
  const [trigger, setTrigger] = useState(draft?.triggerSpec ?? '')
  const [criterion, setCriterion] = useState(draft?.criterion ?? '以最好的状态完成这件事')
  const [type, setType] = useState<PolicyType>(draft?.type ?? 'semi_passive')
  const [parentId, setParentId] = useState<string>('')

  // 候选草案变化时同步表单（初值只在首次挂载时生效，必须显式同步）
  useEffect(() => {
    setName(draft?.name ?? '')
    setTrigger(draft?.triggerSpec ?? '')
    setCriterion(draft?.criterion ?? '以最好的状态完成这件事')
    setType(draft?.type ?? 'semi_passive')
    setParentId('')
  }, [draft])

  function reset() {
    setName('')
    setTrigger('')
    setCriterion('以最好的状态完成这件事')
    setType('semi_passive')
    setParentId('')
  }

  function close() {
    reset()
    onClose()
  }

  function save(andLight: boolean) {
    if (!name.trim()) {
      toast('先给这条国策起个名字')
      return
    }
    const id = store.createPolicy({
      name: name.trim(),
      type,
      triggerKind: 'event',
      triggerSpec: trigger.trim() || '触发条件待补',
      criterion: criterion.trim() || '以最好的状态完成这件事',
      lever: draft?.lever ?? 'medium',
      resistance: draft?.resistance ?? 'low',
      maintenance: draft?.maintenance ?? 'low',
      rationale: draft?.rationale,
      source: draft?.source ?? '自建',
      difficulty: draft?.difficulty ?? 'easy',
      parentId: parentId || null,
    })
    if (andLight) {
      if (!store.canLightToday()) {
        toast('国策已入库，但今天已经点亮一个了')
      } else {
        store.lightPolicy(id, parentId || null)
        haptic(14)
      }
    } else {
      toast('国策已入库')
    }
    close()
  }

  const litPolicies = Object.values(p.policies).filter((ps) => ps.state === 'lit')

  return (
    <Sheet open={open} onClose={close} title={draft ? '把这条国策点亮' : '新建国策'}>
      <div className="stack">
        {draft?.rationale ? (
          <div className="body-sm text-2" style={{ lineHeight: 1.65 }}>
            {draft.rationale}
          </div>
        ) : null}

        <Field label="名称" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：睡前手机放客厅" />

        <Field
          label="触发条件"
          value={trigger}
          onChange={(e) => setTrigger(e.target.value)}
          placeholder="例如：准备睡觉时"
          hint="优先用必然发生的事件锚，而不是含糊的时间点"
        />

        <TextArea label="判定标准" value={criterion} onChange={(e) => setCriterion(e.target.value)} />

        <div className="stack" style={{ gap: 6 }}>
          <span className="caption">类型</span>
          <Segmented
            value={type}
            onChange={setType}
            options={[
              { value: 'passive', label: '被动' },
              { value: 'semi_passive', label: '半被动' },
              { value: 'active', label: '主动' },
              { value: 'mechanic', label: '机制' },
            ]}
          />
          <div className="caption text-3">
            {type === 'passive'
              ? '在特定条件下「不做某事」，不需要执行，维护成本最低'
              : type === 'semi_passive'
                ? '「如果 A 就 B」，行为挂靠在必然发生的触发上'
                : type === 'active'
                  ? '需要你主动投入——阻力最大，系统会持续提示它的维护成本'
                  : '像告示牌一样杵在那里的机制，使用时才生效'}
          </div>
        </div>

        {litPolicies.length ? (
          <div className="stack" style={{ gap: 6 }}>
            <span className="caption">挂在哪个国策下（可留空）</span>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                className="a-pick"
                aria-pressed={parentId === ''}
                onClick={() => setParentId('')}
              >
                作为根节点
              </button>
              {litPolicies.slice(0, 6).map((ps) => (
                <button
                  key={ps.policy.id}
                  type="button"
                  className="a-pick"
                  aria-pressed={parentId === ps.policy.id}
                  onClick={() => setParentId(ps.policy.id)}
                >
                  {ps.policy.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="row" style={{ gap: 8 }}>
          <Button variant="quiet" className="grow" onClick={() => save(false)}>
            只入库
          </Button>
          <Button className="grow" onClick={() => save(true)}>
            点亮它
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
