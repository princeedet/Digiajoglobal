export const BRAND = {
  name: 'DigiAjo Global',
  tagline: 'Redefining Savings, empowering lives...',
  whatsappNumbers: ['08078926739'],
  whatsappLink: 'https://wa.me/2348078926739',
  address: 'Yomade Plaza, Behind Union Bank, Awoyaya, Ibeju-Lekki, Lagos.',
  registrationFee: '₦2,000',
} as const

export const COMPANY_BANK = {
  accountName: 'Betahealthplus Integrated Services Ltd',
  accountNumber: '3000716507',
  bankName: 'Moniepoint MFB',
} as const

export const NAIRA = (n: number) => '₦' + n.toLocaleString('en-NG')
