import fs from 'fs'
import path from 'path'
import type { Bed, Admission } from '@/lib/beds'

export type StoredDischarge = Admission & { bed: string }

type HospitalBedsStore = {
  beds: Record<string, Bed[]>
  discharges: Record<string, StoredDischarge[]>
}

const STORE_PATH = path.resolve(process.cwd(), 'supabase', '.temp', 'beds-data.json')

function defaultBedsFor(hospitalId: string): Bed[] {
  const now = Date.now()
  return [
    {
      id: `bed-gw-1-${hospitalId.slice(0, 4)}`,
      ward: 'General Ward',
      label: 'Bed 101',
      type: 'general',
      dailyRate: 1500,
      status: 'available',
      admission: {
        id: `adm-1-${hospitalId.slice(0, 4)}`,
        bedId: `bed-gw-1-${hospitalId.slice(0, 4)}`,
        patient: { id: 'patient-demo-1', name: 'Ramesh Sharma', phone: '+91 98765 43210' },
        doctor: { id: 'doc-demo-1', name: 'Dr. Priya Mehta' },
        reason: 'Post-operative observation',
        notes: 'Vitals stable. IV fluids ongoing.',
        admittedAt: new Date(now - 2 * 86400000).toISOString(),
        expectedDischarge: new Date(now + 86400000).toISOString().slice(0, 10),
        dischargedAt: null,
      },
    },
    {
      id: `bed-gw-2-${hospitalId.slice(0, 4)}`,
      ward: 'General Ward',
      label: 'Bed 102',
      type: 'general',
      dailyRate: 1500,
      status: 'available',
      admission: null,
    },
    {
      id: `bed-gw-3-${hospitalId.slice(0, 4)}`,
      ward: 'General Ward',
      label: 'Bed 103',
      type: 'general',
      dailyRate: 1500,
      status: 'available',
      admission: null,
    },
    {
      id: `bed-gw-4-${hospitalId.slice(0, 4)}`,
      ward: 'General Ward',
      label: 'Bed 104',
      type: 'general',
      dailyRate: 1500,
      status: 'cleaning',
      admission: null,
    },
    {
      id: `bed-icu-1-${hospitalId.slice(0, 4)}`,
      ward: 'ICU',
      label: 'ICU Bed 1',
      type: 'icu',
      dailyRate: 6500,
      status: 'available',
      admission: {
        id: `adm-2-${hospitalId.slice(0, 4)}`,
        bedId: `bed-icu-1-${hospitalId.slice(0, 4)}`,
        patient: { id: 'patient-demo-2', name: 'Sunita Verma', phone: '+91 91234 56780' },
        doctor: { id: 'doc-demo-2', name: 'Dr. Rajesh Nair' },
        reason: 'Cardiac monitoring',
        notes: 'Continuous monitoring. SpO2 98%.',
        admittedAt: new Date(now - 86400000).toISOString(),
        expectedDischarge: null,
        dischargedAt: null,
      },
    },
    {
      id: `bed-icu-2-${hospitalId.slice(0, 4)}`,
      ward: 'ICU',
      label: 'ICU Bed 2',
      type: 'icu',
      dailyRate: 6500,
      status: 'available',
      admission: null,
    },
    {
      id: `bed-er-1-${hospitalId.slice(0, 4)}`,
      ward: 'Emergency',
      label: 'ER Bay 1',
      type: 'emergency',
      dailyRate: 2500,
      status: 'available',
      admission: null,
    },
    {
      id: `bed-er-2-${hospitalId.slice(0, 4)}`,
      ward: 'Emergency',
      label: 'ER Bay 2',
      type: 'emergency',
      dailyRate: 2500,
      status: 'available',
      admission: null,
    },
    {
      id: `bed-mat-1-${hospitalId.slice(0, 4)}`,
      ward: 'Maternity',
      label: 'Maternity 1',
      type: 'maternity',
      dailyRate: 3500,
      status: 'available',
      admission: null,
    },
  ]
}

function defaultDischargesFor(hospitalId: string): StoredDischarge[] {
  const now = Date.now()
  return [
    {
      id: `dis-1-${hospitalId.slice(0, 4)}`,
      bedId: `bed-gw-2-${hospitalId.slice(0, 4)}`,
      bed: 'General Ward • Bed 102',
      patient: { id: 'patient-demo-3', name: 'Amitabh Sen', phone: '+91 98765 43211' },
      doctor: { id: 'doc-demo-1', name: 'Dr. Priya Mehta' },
      reason: 'Dengue recovery',
      notes: 'Discharged in stable condition. Follow-up after 1 week.',
      admittedAt: new Date(now - 5 * 86400000).toISOString(),
      expectedDischarge: null,
      dischargedAt: new Date(now - 86400000).toISOString(),
    },
  ]
}

function readStore(): HospitalBedsStore {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'))
      return { beds: data.beds || {}, discharges: data.discharges || {} }
    }
  } catch (err) {
    console.warn('[readStore error]:', err)
  }
  return { beds: {}, discharges: {} }
}

function writeStore(store: HospitalBedsStore): void {
  try {
    const dir = path.dirname(STORE_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8')
  } catch (err) {
    console.warn('[writeStore error]:', err)
  }
}

export function getStoredBeds(hospitalId: string): Bed[] {
  const store = readStore()
  if (!store.beds[hospitalId] || !store.beds[hospitalId].length) {
    store.beds[hospitalId] = defaultBedsFor(hospitalId)
    writeStore(store)
  }
  return store.beds[hospitalId]
}

export function saveStoredBeds(hospitalId: string, beds: Bed[]): void {
  const store = readStore()
  store.beds[hospitalId] = beds
  writeStore(store)
}

export function getStoredDischarges(hospitalId: string): StoredDischarge[] {
  const store = readStore()
  if (!store.discharges[hospitalId]) {
    store.discharges[hospitalId] = defaultDischargesFor(hospitalId)
    writeStore(store)
  }
  return store.discharges[hospitalId]
}

export function addStoredDischarge(hospitalId: string, discharge: StoredDischarge): void {
  const store = readStore()
  const list = store.discharges[hospitalId] || []
  store.discharges[hospitalId] = [discharge, ...list].slice(0, 50)
  writeStore(store)
}
