import type { OnlinePayable } from "@/lib/pricing";

/** "₹100.00": a checkout amount, always with paise. */
export const checkoutAmount = (amount: number) =>
  `₹${(Math.round(amount * 100) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * What the patient pays online, as the checkout table: the booking fee, the payment convenience fee on it, and the total
 * payable. Shown wherever a payment is about to start, so the amount on the Pay button is never a surprise.
 */
export function PayableTable({ payable, item = "Appointment booking fee", className = "" }: { payable: OnlinePayable; item?: string; className?: string }) {
  const cell = "px-3.5 py-2.5 border-t border-[#E3E8F0]";
  return (
    <table className={`w-full text-[13.5px] text-[#27324A] border border-[#E3E8F0] rounded-[12px] border-separate border-spacing-0 overflow-hidden ${className}`}>
      <thead>
        <tr className="bg-[#F6F8FC] text-[#0B1B3F]">
          <th scope="col" className="px-3.5 py-2.5 text-left font-extrabold">Checkout item</th>
          <th scope="col" className="px-3.5 py-2.5 text-right font-extrabold border-l border-[#E3E8F0]">Amount</th>
        </tr>
      </thead>
      <tbody className="tabular-nums">
        <tr>
          <td className={cell}>{item}</td>
          <td className={`${cell} border-l text-right whitespace-nowrap`}>{checkoutAmount(payable.bookingFee)}</td>
        </tr>
        {payable.convenience > 0 && (
          <tr>
            <td className={cell}>Payment convenience fee</td>
            <td className={`${cell} border-l text-right whitespace-nowrap`}>{checkoutAmount(payable.convenience)}</td>
          </tr>
        )}
        <tr className="font-extrabold text-[#0B1B3F]">
          <td className={cell}>Total payable</td>
          <td className={`${cell} border-l text-right whitespace-nowrap text-[#2A4DD0]`}>{checkoutAmount(payable.total)}</td>
        </tr>
      </tbody>
    </table>
  );
}
