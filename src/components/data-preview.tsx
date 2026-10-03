import { Eye, EyeOff } from 'lucide-preact'
import { applyMasking, type MaskingWorkspace } from '../domain/masking'

export function DataPreview({
  workspace,
  revealOriginal,
  onReveal,
}: {
  workspace: MaskingWorkspace
  revealOriginal: boolean
  onReveal: (value: boolean) => void
}) {
  const masked = applyMasking(workspace)
  const rows = revealOriginal ? workspace.rows : masked.rows
  const fields = revealOriginal ? workspace.fields : masked.fields

  return (
    <section class="min-w-0 border-y border-slate-200 bg-white sm:border">
      <header class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div>
          <h2 class="font-bold">Dataset preview</h2>
          <p class="mt-1 text-xs text-slate-500">
            {rows.length} rows · {fields.length} exported columns
          </p>
        </div>
        <button
          class="inline-flex h-9 items-center gap-2 border border-slate-300 px-3 text-xs font-bold hover:bg-slate-50"
          type="button"
          onClick={() => onReveal(!revealOriginal)}
          aria-pressed={revealOriginal}
        >
          {revealOriginal ? <EyeOff size={15} /> : <Eye size={15} />}
          {revealOriginal ? 'Hide originals' : 'Reveal originals'}
        </button>
      </header>
      {revealOriginal && (
        <div class="border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900">
          Original sensitive values are visible in this local preview.
        </div>
      )}
      <div class="max-w-full overflow-auto">
        <table class="min-w-[920px] w-full border-collapse text-left text-xs">
          <thead class="sticky top-0 z-10 bg-slate-100 text-slate-600">
            <tr>
              <th class="w-12 border-b border-r border-slate-200 px-3 py-3">
                #
              </th>
              {fields.map((field) => (
                <th
                  class="min-w-36 border-b border-r border-slate-200 px-3 py-3 font-mono"
                  key={field}
                >
                  {field}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 30).map((row, index) => (
              <tr
                class="odd:bg-white even:bg-slate-50 hover:bg-emerald-50"
                key={index}
              >
                <td class="border-r border-b border-slate-100 px-3 py-3 text-slate-400">
                  {index + 1}
                </td>
                {fields.map((field) => (
                  <td
                    class="max-w-64 truncate border-r border-b border-slate-100 px-3 py-3 font-mono"
                    title={row[field]}
                    key={field}
                  >
                    {row[field]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
