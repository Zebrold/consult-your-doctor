// The Help & Support page's questions (/contact), by topic. Every answer describes what the site really does
// (lib/assistant/knowledge.ts, the booking and payment code, and the Terms' cancellation section in lib/legal.ts).

export type HelpLink = { href: string; label: string }
export type HelpItem = { q: string; a: string; link?: HelpLink }
export type HelpTopic = { name: string; items: HelpItem[] }

export const HELP_TOPICS: HelpTopic[] = [
  {
    name: 'Bookings & appointments',
    items: [
      {
        q: 'How do I book an appointment?',
        a: 'Search for a doctor, hospital, speciality or lab test, choose an open time and pay the booking fee online. Your booking slip with your token number is sent to you on WhatsApp and by text message.',
        link: { href: '/search', label: 'Find a doctor or lab' },
      },
      {
        q: 'Do I need an account to book?',
        a: 'You sign in with your mobile number and a one-time code while you book. A new number gets an account straight away, so all your bookings, prescriptions and reports stay in one place.',
      },
      {
        q: 'How do I change or cancel an appointment?',
        a: 'Open the booking under Appointments and choose Help, or contact our team with your Booking ID. If you cancel at least 2 hours before your slot, the booking fee is refunded in full.',
        link: { href: '/patient/appointments', label: 'Your appointments' },
      },
      {
        q: 'What is the token number on my slip?',
        a: 'It is your place in the doctor’s queue for that day. Show your slip at the hospital’s front desk when you arrive.',
      },
      {
        q: 'Can I book for a family member?',
        a: 'Family accounts aren’t available yet. Each family member books and signs in with their own mobile number.',
      },
      {
        q: 'What should I bring to my appointment?',
        a: 'Your booking slip on your phone, a photo ID and any earlier reports or prescriptions that are relevant to the visit.',
      },
    ],
  },
  {
    name: 'Payments & refunds',
    items: [
      {
        q: 'My payment went through but the booking shows unpaid',
        a: 'Please don’t pay again. Contact our team with your Booking ID: we check the payment with the payment gateway and either confirm your booking or refund the amount.',
      },
      {
        q: 'Which payment methods can I use?',
        a: 'UPI, debit and credit cards, and net banking, through our secure payment gateway. Online you pay only the booking fee, with the payment convenience fee on it when there is one, shown at checkout.',
      },
      {
        q: 'Who receives my payment?',
        a: 'The booking fee you pay online goes to Consult your Doctor. The doctor’s consultation fee and any hospital services are paid at the hospital counter, and lab tests at the lab.',
      },
      {
        q: 'How do refunds work?',
        a: 'If you cancel at least 2 hours before your slot, or the doctor, hospital or lab cancels, the booking fee is refunded in full to the way you paid. Banks usually take 5–7 working days to show it.',
        link: { href: '/terms-of-use', label: 'Cancellations & refunds in our Terms' },
      },
      {
        q: 'Where can I find my payment receipt?',
        a: 'Payments & billing in your account lists every booking fee you paid, and each booking’s page shows its payment. If you added an email address, your booking email has it too.',
        link: { href: '/patient/insurance', label: 'Payments & billing' },
      },
    ],
  },
  {
    name: 'Reports & prescriptions',
    items: [
      {
        q: 'Where can I find my reports and prescriptions?',
        a: 'Sign in and open your Profile: prescriptions from your doctors and reports from your labs appear there as soon as they are sent. We also send them to you on WhatsApp.',
        link: { href: '/patient/profile', label: 'Your profile' },
      },
      {
        q: 'Can I download my prescription?',
        a: 'Yes. Every prescription is a PDF that you can open and download from your Profile.',
      },
      {
        q: 'When will my lab report be ready?',
        a: 'The lab uploads it once your tests are done. It appears in your Profile straight away, and we send it to you on WhatsApp, and by email if you added one.',
      },
      {
        q: 'Is home sample collection available?',
        a: 'At some labs, yes. Where a lab offers it, choose At home when you book; the lab’s collection fee is paid to the lab.',
      },
    ],
  },
  {
    name: 'Partner onboarding',
    items: [
      {
        q: 'I want to partner my hospital, lab or practice',
        a: 'Apply on the Partner with us page: there is a short form for doctors, hospitals and diagnostic centres. Our team checks your registration and gets in touch with you.',
        link: { href: '/corporate', label: 'Partner with us' },
      },
      {
        q: 'What do we need to apply?',
        a: 'Your organisation’s name and address, your registration or licence number and how to reach you. Doctors give their medical council and registration number.',
      },
      {
        q: 'After we apply, how do we go live?',
        a: 'Our team verifies your registration with the issuing authority. Once you are verified, we share your Staff ID and password, and your listing goes live for patients.',
      },
      {
        q: 'How do partners receive payments?',
        a: 'Patients pay consultation fees and test charges at your desk. For hospitals, payments taken with the desk’s UPI scanner reach Consult your Doctor and your part is added to your wallet, which you withdraw to your bank account or UPI ID.',
      },
      {
        q: 'Who should I contact for help with onboarding?',
        a: 'Talk to our team using the phone number or email below and mention that you are a partner.',
      },
    ],
  },
  {
    name: 'Account & privacy',
    items: [
      {
        q: 'I did not receive the sign-in code',
        a: 'Check that your mobile number is correct and wait a minute before asking for a new code. If it still does not arrive, contact our team.',
      },
      {
        q: 'How do I update my details?',
        a: 'Open Settings in your account and choose Change your details. Your mobile number is how you sign in; to change it, contact our team.',
        link: { href: '/patient/preferences', label: 'Settings' },
      },
      {
        q: 'Who can see my medical records?',
        a: 'Only you, and the doctors, hospitals and labs you book with.',
      },
      {
        q: 'How do I delete my account?',
        a: 'Contact our team from your registered mobile number or email and we will help you close your account.',
      },
    ],
  },
  {
    name: 'Legal',
    items: [
      { q: 'Terms & Conditions', a: 'The terms that apply when you use Consult your Doctor to book, pay and manage care.', link: { href: '/terms-of-use', label: 'Read the Terms & Conditions' } },
      { q: 'Privacy Policy', a: 'How we collect, use and protect your personal and health information.', link: { href: '/privacy-policy', label: 'Read the Privacy Policy' } },
      { q: 'Cookie Policy', a: 'How we use cookies on our website and how you can manage them.', link: { href: '/privacy-policy#cookies', label: 'Read about cookies' } },
      {
        q: 'Cancellation & Refund Policy',
        a: 'When bookings can be cancelled and how refunds are processed. It is section 5 of our Terms & Conditions.',
        link: { href: '/terms-of-use', label: 'Read the cancellation policy' },
      },
    ],
  },
]
