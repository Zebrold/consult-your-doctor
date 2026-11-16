import type { Metadata } from 'next'
import { Search } from 'lucide-react'
import { loadOrders, loadProducts } from '@/lib/equipment'
import { requireHospital } from '../_lib/hospital'
import { EquipmentShop } from '../_components/EquipmentShop'
import { DeskHead, HosBody, HosHeader } from '../_components/hos-ui'

export const metadata: Metadata = { title: 'Order equipment | Hospital Portal' }
export const dynamic = 'force-dynamic'

/**
 * Order equipment, after the DeskHosEquipment export: the Consult your Doctor team's catalogue of devices, supplies and
 * furniture, an order paid online, and the hospital's recent orders as the team confirms, ships and delivers them.
 */
export default async function HospitalEquipmentPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = ((await searchParams).q ?? '').trim().slice(0, 80)
  const { admin, user, hospital, staff } = await requireHospital()
  const [{ ready, products }, orders, { data: me }] = await Promise.all([
    loadProducts(admin),
    loadOrders(admin, hospital.id, 20),
    admin.from('profiles').select('email, phone_number').eq('id', user.id).maybeSingle(),
  ])
  const subtitle = 'Medical devices, supplies and furniture sourced by the Consult your Doctor team, delivered to your hospital'
  return (
    <>
      <HosHeader staff={staff} back={{ href: '/hospital/more', label: 'More' }} title="Order equipment" subtitle={subtitle}>
        <form action="/hospital/equipment" role="search" className="flex items-center gap-2.5 h-[46px] px-3.5 rounded-[14px] bg-white text-[#0B1B3F]">
          <Search className="w-[18px] h-[18px] text-[#5B667A] shrink-0" />
          <input name="q" type="search" defaultValue={query} aria-label="Search equipment and supplies" placeholder="Search equipment and supplies" className="flex-1 min-w-0 bg-transparent outline-none text-[14.5px] placeholder:text-[#7A8599]" />
        </form>
      </HosHeader>
      <HosBody>
        <DeskHead title="Order equipment" subtitle={subtitle} />
        {!ready ? (
          <p className="p-3.5 rounded-[14px] bg-[#FFF6E8] text-[13px] text-[#7A2E0E]">Equipment ordering is being set up. The catalogue shows here once it’s ready.</p>
        ) : (
          <EquipmentShop
            key={query}
            initialQuery={query}
            products={products}
            orders={orders}
            deliverTo={[hospital.name, hospital.address || hospital.city].filter(Boolean).join(', ')}
            payer={{ name: hospital.name, email: (me?.email as string | null) ?? hospital.email, phone: (me?.phone_number as string | null) ?? hospital.phone }}
          />
        )}
      </HosBody>
    </>
  )
}
