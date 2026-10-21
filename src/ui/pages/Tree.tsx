import { AnimatePresence, motion } from 'motion/react'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useProjection } from '../../data/store'
import type { PolicyState } from '../../domain/projection'
import { AddPolicySheet, PolicySheet } from '../components/PolicySheet'
import { MiniRing } from '../components/Ring'
import { Button, Card, CardTitle, Chip, EmptyState, Segmented } from '../components/primitives'
import { nodeLightVariants, nodeOutVariants } from '../motion'
import { haptic } from '../utils'

const NODE_H = 40
const GAP_X = 26
const GAP_Y = 58
const CHAR_W = 13

interface LayoutNode {
  id: string
  x: number
  y: number
  w: number
  depth: number
  state: PolicyState['state']
  habituation: number
}

function widthOf(name: string): number {
  let w = 0
  for (const ch of name) w += /[\u4e00-\u9fa5]/.test(ch) ? CHAR_W : CHAR_W * 0.58
  return Math.max(104, Math.min(220, w + 34))
}

function layoutTree(policies: ReturnType<typeof useProjection>['policies']) {
  const childrenOf = new Map<string, string[]>()
  const roots: string[] = []
  for (const ps of Object.values(policies)) {
    const parent = ps.policy.parentId
    if (parent && policies[parent]) {
      const arr = childrenOf.get(parent) ?? []
      arr.push(ps.policy.id)
      childrenOf.set(parent, arr)
    } else {
      roots.push(ps.policy.id)
    }
  }

  const nodes = new Map<string, LayoutNode>()
  let cursor = 0

  const walk = (id: string, depth: number) => {
    const ps = policies[id]
    if (!ps) return
    const kids = childrenOf.get(id) ?? []
    const w = widthOf(ps.policy.name)
    let x: number
    if (!kids.length) {
      x = cursor * (180 + GAP_X)
      cursor += 1
    } else {
      const xs = kids.map((k) => {
        walk(k, depth + 1)
        return nodes.get(k)?.x ?? 0
      })
      x = xs.reduce((s, v) => s + v, 0) / xs.length
    }
    nodes.set(id, { id, x, y: depth * (NODE_H + GAP_Y), w, depth, state: ps.state, habituation: ps.habituation })
  }

  roots.forEach((r) => walk(r, 0))

  const list = [...nodes.values()]
  const minX = list.length ? Math.min(...list.map((n) => n.x - n.w / 2)) : 0
  const maxX = list.length ? Math.max(...list.map((n) => n.x + n.w / 2)) : 0
  for (const n of list) n.x -= minX

  const edges: { from: string; to: string }[] = []
  for (const ps of Object.values(policies)) {
    const parent = ps.policy.parentId
    if (parent && nodes.has(parent) && nodes.has(ps.policy.id)) {
      edges.push({ from: parent, to: ps.policy.id })
    }
  }

  return {
    nodes: list,
    edges,
    width: Math.max(320, maxX - minX + 24),
    height: list.length ? Math.max(...list.map((n) => n.y)) + NODE_H + 24 : 160,
  }
}

export function TreePage() {
  const p = useProjection()
  const [view, setView] = useState<'tree' | 'list'>('tree')
  const [selected, setSelected] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const layout = useMemo(() => layoutTree(p.policies), [p.policies])

  const ordered = useMemo(() => {
    const depthOf = new Map<string, number>()
    const calc = (id: string, d: number): number => {
      depthOf.set(id, d)
      const ps = p.policies[id]
      const parent = ps?.policy.parentId
      if (parent && p.policies[parent] && !depthOf.has(parent)) calc(parent, d + 1)
      return d
    }
    for (const ps of Object.values(p.policies)) if (!depthOf.has(ps.policy.id)) calc(ps.policy.id, 0)
    return Object.values(p.policies).sort((a, b) => {
      const d = (depthOf.get(a.policy.id) ?? 0) - (depthOf.get(b.policy.id) ?? 0)
      if (d !== 0) return d
      return b.litCount - a.litCount
    })
  }, [p.policies])

  const lit = Object.values(p.policies).filter((ps) => ps.state === 'lit').length
  const out = Object.values(p.policies).filter((ps) => ps.state === 'out').length
  const avgHabit = Object.values(p.policies).length
    ? Math.round(
        Object.values(p.policies).reduce((s, ps) => s + ps.habituation, 0) / Object.values(p.policies).length,
      )
    : 0

  return (
    <div className="stack-lg">
      <header className="page-head">
        <div className="page-head__title">
          <div className="upper-label">国策树</div>
          <div className="h1">把约束力钉在节点上</div>
        </div>
        <button type="button" className="a-icon-btn" aria-label="新建国策" onClick={() => setAddOpen(true)}>
          <Plus size={22} strokeWidth={1.75} />
        </button>
      </header>

      <div className="row-between">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'tree', label: '树形' },
            { value: 'list', label: '列表' },
          ]}
        />
        <div className="row" style={{ gap: 6 }}>
          <Chip tone="accent">点亮 {lit}</Chip>
          <Chip>熄灭 {out}</Chip>
          <Chip>熟练度 {avgHabit}%</Chip>
        </div>
      </div>

      {Object.keys(p.policies).length === 0 ? (
        <Card>
          <EmptyState
            title="树还是空的"
            desc="国策是「如果 A 就 B」的规则。每天点亮一个，节点会自动组织成树 —— 熄掉一个父节点，它的子孙会连锁熄灭，但熟练度不会丢。"
            action={
              <Button size="lg" onClick={() => setAddOpen(true)}>
                新建第一条国策
              </Button>
            }
          />
        </Card>
      ) : view === 'tree' ? (
        <div className="tree-wrap">
          <svg width={layout.width} height={layout.height} style={{ display: 'block' }}>
            <AnimatePresence>
              {layout.edges.map((e) => {
                const a = layout.nodes.find((n) => n.id === e.from)
                const b = layout.nodes.find((n) => n.id === e.to)
                if (!a || !b) return null
                const x1 = a.x
                const y1 = a.y + NODE_H
                const x2 = b.x
                const y2 = b.y
                const midY = (y1 + y2) / 2
                return (
                  <motion.path
                    key={`${e.from}-${e.to}`}
                    className="tree-edge"
                    d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.34, ease: [0.2, 0, 0, 1] }}
                  />
                )
              })}
            </AnimatePresence>

            {layout.nodes.map((n) => {
              const ps = p.policies[n.id]
              if (!ps) return null
              const litNode = n.state === 'lit'
              return (
                <motion.g
                  key={n.id}
                  className="tree-node"
                  variants={litNode ? nodeLightVariants : nodeOutVariants}
                  initial="initial"
                  animate="animate"
                  onClick={() => {
                    haptic(10)
                    setSelected(n.id)
                  }}
                >
                  <rect
                    x={n.x - n.w / 2}
                    y={n.y}
                    width={n.w}
                    height={NODE_H}
                    rx={13}
                    fill={litNode ? 'var(--accent-soft)' : 'var(--surface-2)'}
                    stroke={litNode ? 'var(--accent-line)' : 'var(--border)'}
                    strokeWidth={1.2}
                  />
                  {litNode ? (
                    <circle cx={n.x - n.w / 2 + 14} cy={n.y + NODE_H / 2} r={4} fill="var(--accent)" />
                  ) : null}
                  <text
                    x={n.x + (litNode ? 4 : -n.w / 2 + 14)}
                    y={n.y + NODE_H / 2 + 4}
                    textAnchor={litNode ? 'middle' : 'start'}
                    className={`tree-node__label ${n.state === 'out' ? 'tree-node--out' : ''}`}
                  >
                    {ps.policy.name.length > 11 ? `${ps.policy.name.slice(0, 11)}…` : ps.policy.name}
                  </text>
                </motion.g>
              )
            })}
          </svg>
        </div>
      ) : (
        <Card flat>
          {ordered.map((ps) => (
            <button key={ps.policy.id} type="button" className="policy-row" onClick={() => setSelected(ps.policy.id)}>
              <span className={`policy-dot policy-dot--${ps.state}`} />
              <div className="grow">
                <div className="truncate" style={{ fontWeight: 600 }}>
                  {ps.policy.name}
                </div>
                <div className="caption text-3 truncate">{ps.policy.triggerSpec}</div>
              </div>
              <MiniRing progress={ps.habituation / 100} size={26} stroke={2.5} />
              <span className="caption text-3 mono">{ps.habituation}%</span>
            </button>
          ))}
        </Card>
      )}

      <Card>
        <CardTitle>关于这棵树</CardTitle>
        <div className="body-sm text-2" style={{ lineHeight: 1.7 }}>
          每天最多点亮一个国策，它会挂在昨天点亮的那个下面 —— 于是路径会自己长出来。
          熄掉一个节点，它的子孙会连锁熄灭；但每一个节点的熟练度都留在原地，
          重新点亮时你不需要从零开始。
        </div>
      </Card>

      <PolicySheet policyId={selected} open={!!selected} onClose={() => setSelected(null)} />
      <AddPolicySheet open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
