import type { Metadata } from 'next'
import { loadOrders, loadProducts } from '@/lib/equipment'
import { requireHospital } from '../_lib/hospital'
import { EquipmentShop } from '../_components/EquipmentShop'
import { DeskHead, HosBackHeader, HosBody } from '../_components/hos-ui'

export const metadata: Metadata = { title: 'Order equipment | Hospital Portal' }
export const dynamic = 'force-dynamic'

/**
 * Order equipment, after the DeskHosEquipment export: the Consult your Doctor team's catalogue of devices, supplies and
 * furniture, an order paid online, and the hospital's recent orders as the team confirms, ships and delivers them.
 */
export default async function HospitalEquipmentPage() {
  const { admin, user, hospital } = await requireHospital()
  const [{ ready, products }, orders, { data: me }] = await Promise.all([
    loadProducts(admin),
    loadOrders(admin, hospital.id, 20),
    admin.from('profiles').select('email, phone_number').eq('id', user.id).maybeSingle(),
  ])
  const subtitle = 'Medical devices, supplies and furniture sourced by the Consult your Doctor team, delivered to your hospital'
  return (
    <>
      <HosBackHeader backHref="/hospital/more" backLabel="Back to more" title="Order equipment">
        <p className="mt-2.5 mx-1.5 text-[13px] leading-[1.5] text-[#DCE6FF]">{subtitle}</p>
      </HosBackHeader>
      <HosBody>
        <DeskHead title="Order equipment" subtitle={subtitle} />
        {!ready ? (
          <p className="p-3.5 rounded-[14px] bg-[#FFF6E8] text-[13px] text-[#7A2E0E]">Equipment ordering is being set up. The catalogue shows here once it’s ready.</p>
        ) : (
          <EquipmentShop
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
