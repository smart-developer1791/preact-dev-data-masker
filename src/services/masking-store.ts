import { del, get, set } from 'idb-keyval'
import {
  maskingWorkspaceSchema,
  type MaskingWorkspace,
} from '../domain/masking'

async function fetchSample(sampleUrl: string) {
  const response = await fetch(sampleUrl)
  if (!response.ok)
    throw new Error('Could not load the sample masking workspace.')
  return maskingWorkspaceSchema.parse(await response.json())
}

export async function loadWorkspace(storageKey: string, sampleUrl: string) {
  const saved = await get<unknown>(storageKey)
  if (saved !== undefined) {
    const parsed = maskingWorkspaceSchema.safeParse(saved)
    if (parsed.success) return parsed.data
    await del(storageKey)
  }
  return fetchSample(sampleUrl)
}

export async function saveWorkspace(
  storageKey: string,
  workspace: MaskingWorkspace,
) {
  await set(storageKey, maskingWorkspaceSchema.parse(workspace))
}

export async function resetWorkspace(storageKey: string, sampleUrl: string) {
  await del(storageKey)
  return fetchSample(sampleUrl)
}
