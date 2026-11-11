export const PaymentStructure = {
  HOURLY: 'hourly',
  FIXED: 'fixed',
} as const;

export type PaymentStructure =
  (typeof PaymentStructure)[keyof typeof PaymentStructure];
