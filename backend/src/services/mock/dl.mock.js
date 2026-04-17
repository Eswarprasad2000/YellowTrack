/**
 * Mock DL (Driving License) Verification API
 * Simulates fetching driver data from government Sarathi/Parivahan database
 */

const fetchDriverByLicense = async (licenseNumber) => {
  await new Promise((resolve) => setTimeout(resolve, 600));

  const normalized = licenseNumber.toUpperCase().replace(/\s/g, '');

  const firstNames = ['Rajesh', 'Suresh', 'Manoj', 'Vinod', 'Arun', 'Sanjay', 'Ramesh', 'Deepak', 'Kiran', 'Naveen'];
  const lastNames = ['Kumar', 'Singh', 'Sharma', 'Reddy', 'Rao', 'Patel', 'Das', 'Yadav', 'Verma', 'Gupta'];

  const hash = normalized.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const now = new Date();
  // License expiry 1-3 years from now
  const expiryDays = 365 + (hash % 730);
  const licenseExpiry = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);

  const vehicleClasses = ['LMV', 'HMV', 'HGMV', 'HPMV', 'TRANS'];
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
  const fatherFirstNames = ['Mohan', 'Ramesh', 'Sunil', 'Ashok', 'Vijay', 'Prakash', 'Mahesh', 'Gopal', 'Ravi', 'Satish'];

  const firstName = firstNames[hash % firstNames.length];
  const lastName = lastNames[(hash * 3) % lastNames.length];

  return {
    name: `${firstName} ${lastName}`,
    phone: `9${String(hash).padStart(9, '0').slice(0, 9)}`,
    licenseNumber: normalized,
    licenseExpiry: licenseExpiry.toISOString(),
    vehicleClass: vehicleClasses[hash % vehicleClasses.length],
    aadhaarLast4: String(hash).slice(-4).padStart(4, '0'),
    bloodGroup: bloodGroups[hash % bloodGroups.length],
    fatherName: `${fatherFirstNames[hash % fatherFirstNames.length]} ${lastName}`,
    permanentAddress: `${(hash % 500) + 1}, Ward ${(hash % 30) + 1}, Sector ${(hash % 50) + 1}, Bangalore, Karnataka - ${560000 + (hash % 100)}`,
    verified: true,
  };
};

module.exports = { fetchDriverByLicense };
