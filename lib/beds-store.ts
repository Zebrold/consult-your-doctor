import type { Bed, Admission } from '@/lib/beds'

export type StoredDischarge = Admission & { bed: string }

type HospitalBedsStore = {
  beds: Record<string, Bed[]>
  discharges: Record<string, StoredDischarge[]>
}

// In-memory universal store (zero node.js fs dependencies, works seamlessly on Vercel, Node, and browser runtimes)
const globalStore: HospitalBedsStore = {
  beds: {},
  discharges: {},
}

function defaultBedsFor(_hospitalId: string): Bed[] {
  return []
}

function defaultDischargesFor(_hospitalId: string): StoredDischarge[] {
  return []
}

export function getStoredBeds(hospitalId: string): Bed[] {
  if (!globalStore.beds[hospitalId] || !globalStore.beds[hospitalId].length) {
    globalStore.beds[hospitalId] = defaultBedsFor(hospitalId)
  }
  return globalStore.beds[hospitalId]
}

export function saveStoredBeds(hospitalId: string, beds: Bed[]): void {
  globalStore.beds[hospitalId] = beds
}

export function getStoredDischarges(hospitalId: string): StoredDischarge[] {
  if (!globalStore.discharges[hospitalId]) {
    globalStore.discharges[hospitalId] = defaultDischargesFor(hospitalId)
  }
  return globalStore.discharges[hospitalId]
}

export function addStoredDischarge(hospitalId: string, discharge: StoredDischarge): void {
  const list = globalStore.discharges[hospitalId] || []
  globalStore.discharges[hospitalId] = [discharge, ...list].slice(0, 50)
}
