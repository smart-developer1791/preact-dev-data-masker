import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-preact'
import {
  detectFields,
  privacyStats,
  type MaskingWorkspace,
} from '../domain/masking'

export function PrivacySummary({ workspace }: { workspace: MaskingWorkspace }) {
  const stats = privacyStats(workspace)
  const active = new Set(
    workspace.rules.filter((rule) => rule.enabled).map((rule) => rule.field),
  )
  const exposed = detectFields(workspace).filter(
    (detection) => !active.has(detection.field),
  )
  return (
    <section class="mt-4 border-y border-slate-200 bg-white sm:border">
      <header class="border-b border-slate-200 p-4">
        <h2 class="flex items-center gap-2 font-bold">
          <ShieldCheck size={17} /> Privacy readiness
        </h2>
        <p class="mt-1 text-xs text-slate-500">
          Coverage of detected sensitive fields
        </p>
      </header>
      <div class="p-4">
        <div class="flex items-end justify-between">
          <strong class="text-3xl text-emerald-700">{stats.coverage}%</strong>
          <span class="text-xs text-slate-500">
            {stats.protected}/{stats.detected} protected
          </span>
        </div>
        <div class="mt-3 h-2 bg-slate-200">
          <div
            class="h-full bg-emerald-600"
            style={{ width: `${stats.coverage}%` }}
          />
        </div>
        <div class="mt-4 space-y-2">
          {exposed.map((detection) => (
            <div
              class="flex gap-2 border border-amber-200 bg-amber-50 p-3 text-amber-900"
              key={detection.field}
            >
              <AlertTriangle class="shrink-0" size={16} />
              <p class="min-w-0 text-xs">
                <strong class="break-all">{detection.field}</strong> is still
                unprotected.
              </p>
            </div>
          ))}
          {!exposed.length && (
            <div class="flex gap-2 border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
              <CheckCircle2 class="shrink-0" size={16} />
              <p class="text-xs">
                Every detected sensitive field has an active rule.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
