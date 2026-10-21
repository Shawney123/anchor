import { Download, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { loadEvents } from '../../data/db'
import { applyTheme, getLastExportAt, getTheme, setLastExportAt, type ThemePref } from '../../data/prefs'
import { store, useProjection } from '../../data/store'
import { backupAgeDays, downloadText, exportFilename, parseImport, serializeExport } from '../../data/transfer'
import { Sheet } from '../components/Sheet'
import { Button, Card, CardTitle, Chip, Field, SectionLabel, Segmented } from '../components/primitives'
import { toast } from '../components/toast'
import { APP_VERSION } from '../../version'

const SOURCE_URL = 'https://www.zhihu.com/question/19888447/answer/1930799480401293785'

export function SettingsPage() {
  const p = useProjection()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dangerOpen, setDangerOpen] = useState(false)
  const [theme, setTheme] = useState<ThemePref>(() => getTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const lastExport = getLastExportAt()
  const age = backupAgeDays(lastExport)

  async function doExport() {
    try {
      const all = await loadEvents()
      const text = serializeExport(all)
      downloadText(exportFilename(), text)
      setLastExportAt(Date.now())
      toast('已导出备份文件')
    } catch {
      toast('导出失败，请重试')
    }
  }

  async function doImport(file: File) {
    try {
      const text = await file.text()
      const result = parseImport(text)
      if (!result.ok) {
        toast(result.error ?? '导入失败')
        return
      }
      await store.importEvents(result.events)
      toast(`已恢复 ${result.count} 条事件`)
    } catch {
      toast('读取文件失败')
    }
  }

  async function wipe() {
    await store.clearAll()
    setDangerOpen(false)
    toast('已清空本地数据')
  }

  return (
    <div className="stack-lg">
      <header className="page-head">
        <div className="page-head__title">
          <div className="upper-label">设置</div>
          <div className="h1">Anchor · 自制力协议</div>
        </div>
      </header>

      <div className="brand-block">
        <span className="brand-block__mark">Anchor</span>
        <span className="brand-block__sub">A PROTOCOL FOR SELF-CONTROL</span>
      </div>

      <SectionLabel>使用方式</SectionLabel>
      <Card>
        <div className="stack" style={{ gap: 6 }}>
          <span className="caption">主题</span>
          <Segmented
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'system', label: '跟随系统' },
              { value: 'dark', label: '常暗' },
              { value: 'light', label: '常亮' },
            ]}
          />
          <div className="caption text-3">暗色是这套界面的默认设计态 —— 晚上坐在桌前启动任务时，它更接近你需要的界面。</div>
        </div>

        <div className="stack" style={{ gap: 6, marginTop: 16 }}>
          <span className="caption">难度档位</span>
          <Segmented
            value={p.settings.difficulty}
            onChange={(v) => store.setDifficulty(v)}
            options={[
              { value: 'easy', label: 'Easy' },
              { value: 'medium', label: 'Medium' },
              { value: 'hard', label: 'Hard' },
            ]}
          />
          <div className="caption text-3">
            {p.settings.difficulty === 'easy'
              ? '只给你 3–5 条被动国策，专注单元 25 分钟。'
              : p.settings.difficulty === 'hard'
                ? '从傻瓜国策起步，不主动抛高阻力目标，先把下限守住。'
                : '标准配置：完整国策树 + 完整链机制。'}
          </div>
        </div>

        <div className="setting-row">
          <div className="grow">
            <div style={{ fontWeight: 600 }}>轻量模式</div>
            <div className="caption text-3">隐藏国策树与诊断，只留今日结算与链</div>
          </div>
          <button
            type="button"
            className="switch"
            data-on={p.settings.simpleMode}
            aria-label="轻量模式"
            onClick={() => store.updateSettings({ simpleMode: !p.settings.simpleMode })}
          >
            <span className="switch__knob" />
          </button>
        </div>

        <div className="setting-row">
          <div className="grow">
            <div style={{ fontWeight: 600 }}>页内通知</div>
            <div className="caption text-3">预约到点时用系统通知提醒（页面需保持开启）</div>
          </div>
          <button
            type="button"
            className="switch"
            data-on={p.settings.notifications}
            aria-label="页内通知"
            onClick={() => store.updateSettings({ notifications: !p.settings.notifications })}
          >
            <span className="switch__knob" />
          </button>
        </div>

        <div className="setting-row">
          <div className="grow">
            <div style={{ fontWeight: 600 }}>保持屏幕常亮</div>
            <div className="caption text-3">链进行中不让屏幕熄灭</div>
          </div>
          <button
            type="button"
            className="switch"
            data-on={p.settings.keepAwake}
            aria-label="保持屏幕常亮"
            onClick={() => store.updateSettings({ keepAwake: !p.settings.keepAwake })}
          >
            <span className="switch__knob" />
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="stack" style={{ gap: 10 }}>
            <Field
              label="单个专注单元（分钟）"
              value={String(p.settings.focusMinutes)}
              inputMode="numeric"
              onChange={(e) =>
                store.updateSettings({ focusMinutes: Number(e.target.value.replace(/[^\d]/g, '')) || 60 })
              }
            />
            <Field
              label="预约延迟（分钟）"
              value={String(p.settings.bookingDelay)}
              inputMode="numeric"
              onChange={(e) =>
                store.updateSettings({ bookingDelay: Number(e.target.value.replace(/[^\d]/g, '')) || 15 })
              }
            />
          </div>
        </div>
      </Card>

      <SectionLabel>数据</SectionLabel>
      <Card>
        <CardTitle
          extra={
            age === null ? (
              <Chip tone="danger">尚未备份</Chip>
            ) : age > 30 ? (
              <Chip tone="danger">{age} 天未备份</Chip>
            ) : (
              <Chip tone="success">{age} 天前备份</Chip>
            )
          }
        >
          本地存储
        </CardTitle>
        <div className="body-sm text-2" style={{ lineHeight: 1.7 }}>
          所有数据只存在这台设备上，没有账号、没有云同步。Anchor 也不做第三方追踪。
          换手机或清缓存前，记得先导出一次。
        </div>

        <div className="row" style={{ gap: 8, marginTop: 14 }}>
          <Button variant="ghost" className="grow" onClick={() => void doExport()}>
            <Download size={16} />
            导出备份
          </Button>
          <Button variant="ghost" className="grow" onClick={() => fileRef.current?.click()}>
            <Upload size={16} />
            导入恢复
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void doImport(f)
            e.target.value = ''
          }}
        />
      </Card>

      <SectionLabel>方法论出处</SectionLabel>
      <Card>
        <div className="source-note">
          本产品的三个核心机制 —— <strong>神圣座位</strong>、<strong>下必为例</strong>、
          <strong>线性时延</strong> —— 以及国策树、递归回溯、崩塌调试、熟练度不清零，
          均来自：
          <br />
          《自制力问题的两代自控技术：链式时延协议（CTDP）与递归稳态迭代协议（RSIP）》
          <br />
          作者：edmond
          <br />
          <a href={SOURCE_URL} target="_blank" rel="noreferrer noopener">
            {SOURCE_URL}
          </a>
          <br />
          <br />
          原文以 MIT 式授权释出，可自由使用与改编。文中提到的严重神经性与病理性问题需诉诸专业医学途径 ——
          Anchor 是约束力工程工具，不是医疗器械，不提供治疗。
        </div>
      </Card>

      <SectionLabel>危险操作</SectionLabel>
      <Card danger>
        <Button variant="danger" block onClick={() => setDangerOpen(true)}>
          <Trash2 size={16} />
          清空全部本地数据
        </Button>
      </Card>

      <div className="caption text-3" style={{ textAlign: 'center', paddingBottom: 8 }}>
        Anchor v{APP_VERSION} · 本地优先 · 不联网 · 不追踪
      </div>

      <Sheet open={dangerOpen} onClose={() => setDangerOpen(false)} title="清空全部本地数据">
        <div className="stack">
          <div className="body-sm danger" style={{ lineHeight: 1.7 }}>
            这会删除这条链上的全部事件：国策树、熟练度、永久豁免、判例记录。
            无法撤销。确定之前，先导出一次备份。
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Button variant="quiet" className="grow" onClick={() => setDangerOpen(false)}>
              取消
            </Button>
            <Button variant="ghost" className="grow" onClick={() => void doExport()}>
              先导出
            </Button>
            <Button variant="danger" className="grow" onClick={() => void wipe()}>
              确认清空
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  )
}
