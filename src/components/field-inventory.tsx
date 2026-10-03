import { CheckCircle2, Search, ShieldAlert } from 'lucide-preact'
import { detectFields, type MaskingWorkspace } from '../domain/masking'

export function FieldInventory({
  workspace,
  selectedField,
  query,
  onQuery,
  onSelect,
}: {
  workspace: MaskingWorkspace
  selectedField: string
  query: string
  onQuery: (value: string) => void
  onSelect: (field: string) => void
}) {
  const detections = new Map(
    detectFields(workspace).map((detection) => [detection.field, detection]),
  )
  const rules = new Map(workspace.rules.map((rule) => [rule.field, rule]))
  const visible = workspace.fields.filter((field) =>
    field.toLowerCase().includes(query.trim().toLowerCase()),
  )

  return (
    <aside class="border-y border-slate-200 bg-white sm:border">
      <header class="border-b border-slate-200 p-4">
        <h2 class="font-bold">Field inventory</h2>
        <p class="mt-1 text-xs text-slate-500">
          {workspace.fields.length} columns inspected
        </p>
        <label class="relative mt-4 block">
          <span class="sr-only">Search dataset fields</span>
          <Search
            class="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            size={15}
          />
          <input
            class="h-10 w-full border border-slate-300 bg-slate-50 pr-3 pl-9 text-sm"
            value={query}
            onInput={(event) => onQuery(event.currentTarget.value)}
            placeholder="Search fields"
          />
        </label>
      </header>
      <div class="divide-y divide-slate-100">
        {visible.map((field) => {
          const detection = detections.get(field)
          const rule = rules.get(field)
          return (
            <button
              class={`w-full border-l-4 p-3 text-left hover:bg-slate-50 ${selectedField === field ? 'border-emerald-600 bg-emerald-50/60' : 'border-transparent'}`}
              type="button"
              onClick={() => onSelect(field)}
              aria-pressed={selectedField === field}
              key={field}
            >
              <span class="flex items-start gap-3">
                {detection ? (
                  <ShieldAlert
                    class="mt-0.5 shrink-0 text-amber-600"
                    size={16}
                  />
                ) : (
                  <CheckCircle2
                    class="mt-0.5 shrink-0 text-slate-300"
                    size={16}
                  />
                )}
                <span class="min-w-0 flex-1">
                  <strong class="block truncate font-mono text-xs">
                    {field}
                  </strong>
                  <span class="mt-1 block truncate text-xs text-slate-400">
                    {detection?.category ?? 'No sensitive signal'}
                  </span>
                  <span class="mt-2 flex items-center justify-between gap-2 text-xs">
                    <span
                      class={
                        detection
                          ? 'font-bold text-amber-700'
                          : 'text-slate-400'
                      }
                    >
                      {detection
                        ? `${detection.confidence}% confidence`
                        : 'Low risk'}
                    </span>
                    <span
                      class={
                        rule?.enabled
                          ? 'font-bold text-emerald-700'
                          : 'text-slate-400'
                      }
                    >
                      {rule?.enabled ? 'Protected' : 'Unmasked'}
                    </span>
                  </span>
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
