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
