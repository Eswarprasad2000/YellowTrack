/**
 * Mock VAHAN API service
 * Simulates fetching vehicle data from the government VAHAN database
 */

const vehicleDatabase = {
  KA01AB1234: {
    make: 'Tata',
    model: 'Ace Gold',
    fuelType: 'Diesel',
    chassisNumber: 'MAT449100N1A00001',
    engineNumber: '497TCIC4DSL00001',
    gvw: 3500,
    seatingCapacity: 2,
    permitType: 'GOODS',
  },
  MH02CD5678: {
    make: 'Ashok Leyland',
    model: 'Dost Plus',
    fuelType: 'Diesel',
    chassisNumber: 'MB1DDCLA7M1A00002',
    engineNumber: 'BS4CRDI15D00002',
    gvw: 4990,
    seatingCapacity: 3,
    permitType: 'GOODS',
  },
  TN03EF9012: {
    make: 'Mahindra',
    model: 'Bolero Pickup',
    fuelType: 'Diesel',
    chassisNumber: 'MA1ZR2HKAM1S00003',
    engineNumber: 'MHAWK2200D00003',
    gvw: 2955,
    seatingCapacity: 2,
    permitType: 'GOODS',
  },
  DL04GH3456: {
    make: 'Eicher',
    model: 'Pro 2049',
    fuelType: 'Diesel',
    chassisNumber: 'VE1BCA2DNN1F00004',
    engineNumber: 'E494BSIV00004',
    gvw: 7490,
    seatingCapacity: 2,
    permitType: 'GOODS',
  },
  AP05IJ7890: {
    make: 'BharatBenz',
    model: '1217C',
    fuelType: 'Diesel',
    chassisNumber: 'WDB9061631N00005',
    engineNumber: 'OM924LA00005',
    gvw: 12000,
    seatingCapacity: 2,
    permitType: 'NATIONAL',
  },
};

const fetchVehicleData = async (registrationNumber) => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  const normalized = registrationNumber.toUpperCase().replace(/\s/g, '');

  // Check if we have exact match
  if (vehicleDatabase[normalized]) {
    return { ...vehicleDatabase[normalized] };
  }

  // Generate plausible data for any registration number
  const makes = ['Tata', 'Ashok Leyland', 'Mahindra', 'Eicher', 'BharatBenz', 'Force', 'SML Isuzu'];
  const models = ['Ace Gold', 'Dost Plus', 'Bolero Pickup', 'Pro 2049', '1217C', 'Traveller', 'Sartaj'];
  const fuelTypes = ['Diesel', 'Petrol', 'CNG', 'Electric'];
  const permitTypes = ['GOODS', 'PASSENGER', 'NATIONAL', 'STATE'];

  const hash = normalized.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return {
    make: makes[hash % makes.length],
    model: models[hash % models.length],
    fuelType: fuelTypes[hash % fuelTypes.length],
    chassisNumber: `CHS${normalized}${hash}`.substring(0, 17),
    engineNumber: `ENG${normalized}${hash}`.substring(0, 15),
    gvw: 2000 + (hash % 10) * 1000,
    seatingCapacity: 2 + (hash % 4),
    permitType: permitTypes[hash % permitTypes.length],
  };
};

const fetchComplianceDates = async (registrationNumber, docTypeCodes = null) => {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const now = new Date();
  const daysFromNow = (days) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  // Known compliance dates for system types
  const knownDates = {
    RC: daysFromNow(365),
    INSURANCE: daysFromNow(45),
    PERMIT: daysFromNow(180),
    PUCC: daysFromNow(10),
    FITNESS: daysFromNow(90),
    TAX: daysFromNow(5),
  };

  // If no filter, return all known dates
  if (!docTypeCodes) return knownDates;

  // Return only requested types; custom types get a default 1-year expiry
  const result = {};
  for (const code of docTypeCodes) {
    result[code] = knownDates[code] || daysFromNow(365);
  }
  return result;
};

module.exports = { fetchVehicleData, fetchComplianceDates };
