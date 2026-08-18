// Zone map for accurate Delhivery B2C Surface Express rate calculation
export const ZONE_RATES: Record<string, { zone: string; baseFreight: number; days: string }> = {
  // Zone A — Rajasthan (Home)
  'Rajasthan': { zone: 'A (Home)', baseFreight: 40, days: '2-3 Days' },
  // Zone B — North India
  'Delhi': { zone: 'B (North)', baseFreight: 49, days: '3-4 Days' },
  'New Delhi': { zone: 'B (North)', baseFreight: 49, days: '3-4 Days' },
  'Haryana': { zone: 'B (North)', baseFreight: 49, days: '3-4 Days' },
  'Uttar Pradesh': { zone: 'B (North)', baseFreight: 49, days: '3-5 Days' },
  'Punjab': { zone: 'B (North)', baseFreight: 49, days: '3-4 Days' },
  'Madhya Pradesh': { zone: 'B (North)', baseFreight: 49, days: '4-5 Days' },
  'Chandigarh': { zone: 'B (North)', baseFreight: 49, days: '3-4 Days' },
  // Zone C — Metro / South / West
  'Maharashtra': { zone: 'C (West/Metro)', baseFreight: 65, days: '4-5 Days' },
  'Gujarat': { zone: 'C (West)', baseFreight: 65, days: '4-5 Days' },
  'Karnataka': { zone: 'C (South)', baseFreight: 65, days: '4-6 Days' },
  'Tamil Nadu': { zone: 'C (South)', baseFreight: 65, days: '4-6 Days' },
  'Telangana': { zone: 'C (South)', baseFreight: 65, days: '4-6 Days' },
  'Andhra Pradesh': { zone: 'C (South)', baseFreight: 65, days: '4-6 Days' },
  'Goa': { zone: 'C (West)', baseFreight: 65, days: '4-6 Days' },
  // Zone D — East India
  'West Bengal': { zone: 'D (East)', baseFreight: 79, days: '5-7 Days' },
  'Odisha': { zone: 'D (East)', baseFreight: 79, days: '5-7 Days' },
  'Bihar': { zone: 'D (East)', baseFreight: 79, days: '5-7 Days' },
  'Jharkhand': { zone: 'D (East)', baseFreight: 79, days: '5-7 Days' },
  'Chhattisgarh': { zone: 'D (East)', baseFreight: 79, days: '5-7 Days' },
  'Assam': { zone: 'D (East)', baseFreight: 79, days: '6-8 Days' },
  'Himachal Pradesh': { zone: 'D (North-Hill)', baseFreight: 79, days: '5-7 Days' },
  'Uttarakhand': { zone: 'D (North-Hill)', baseFreight: 79, days: '5-7 Days' },
  // Zone E — Remote / North East / South Far
  'Kerala': { zone: 'E (Far South)', baseFreight: 99, days: '6-8 Days' },
  'Jammu and Kashmir': { zone: 'E (Special)', baseFreight: 99, days: '7-10 Days' },
  'Jammu & Kashmir': { zone: 'E (Special)', baseFreight: 99, days: '7-10 Days' },
  'Ladakh': { zone: 'E (Special)', baseFreight: 99, days: '8-12 Days' },
  'Sikkim': { zone: 'E (Special)', baseFreight: 99, days: '7-10 Days' },
  'Meghalaya': { zone: 'E (North East)', baseFreight: 99, days: '7-10 Days' },
  'Mizoram': { zone: 'E (North East)', baseFreight: 99, days: '7-10 Days' },
  'Nagaland': { zone: 'E (North East)', baseFreight: 99, days: '7-10 Days' },
  'Arunachal Pradesh': { zone: 'E (North East)', baseFreight: 99, days: '7-10 Days' },
  'Manipur': { zone: 'E (North East)', baseFreight: 99, days: '7-10 Days' },
  'Tripura': { zone: 'E (North East)', baseFreight: 99, days: '7-10 Days' },
};

// Helper: Calculate live Delhivery charges breakdown
export function getDelhiveryChargesBreakdown(state: string, isCOD: boolean, codAmount: number, weightKg = 0.85) {
  const zInfo = ZONE_RATES[state] || { zone: 'C (Standard)', baseFreight: 65, days: '4-6 Days' };
  const baseFreight = zInfo.baseFreight;
  // COD Handling fee: ₹35 or 1.5% of COD amount, whichever is higher
  const codFee = isCOD ? Math.max(35, Math.round(codAmount * 0.015)) : 0;
  const fuelHandling = 8; // standard B2C fuel & docket fee
  const subtotal = baseFreight + codFee + fuelHandling;
  const gst = Math.round(subtotal * 0.18);
  const totalCourierCost = subtotal + gst;

  return {
    zone: zInfo.zone,
    estimatedDays: zInfo.days,
    baseFreight,
    codFee,
    fuelHandling,
    gst,
    totalCourierCost,
  };
}
