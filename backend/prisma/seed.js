const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // Clean existing data
  await prisma.groupDocumentType.deleteMany();
  await prisma.vehicleDriverMapping.deleteMany();
  await prisma.driverDocument.deleteMany();
  await prisma.challan.deleteMany();
  await prisma.complianceDocument.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.documentType.deleteMany();
  await prisma.vehicleGroup.deleteMany();
  await prisma.user.deleteMany();

  // Seed system document types
  const systemDocTypes = [
    { code: 'RC', name: 'Registration Certificate', hasExpiry: true, isSystem: true },
    { code: 'INSURANCE', name: 'Insurance Policy', hasExpiry: true, isSystem: true },
    { code: 'PERMIT', name: 'Permit', hasExpiry: true, isSystem: true },
    { code: 'PUCC', name: 'Pollution Certificate', hasExpiry: true, isSystem: true },
    { code: 'FITNESS', name: 'Fitness Certificate', hasExpiry: true, isSystem: true },
    { code: 'TAX', name: 'Road Tax', hasExpiry: true, isSystem: true },
  ];
  const createdDocTypes = [];
  for (const dt of systemDocTypes) {
    const created = await prisma.documentType.create({ data: dt });
    createdDocTypes.push(created);
  }
  console.log(`✅ ${createdDocTypes.length} system document types created`);

  // Seed vehicle groups with required doc types
  const groupsData = [
    { name: 'Truck', icon: 'truck', color: '#3b82f6', order: 1 },
    { name: 'Bus', icon: 'bus', color: '#10b981', order: 2 },
    { name: 'Car', icon: 'cab', color: '#f59e0b', order: 3 },
    { name: 'SUV', icon: 'suv', color: '#8b5cf6', order: 4 },
    { name: 'Van', icon: 'van', color: '#f97316', order: 5 },
  ];
  const createdGroups = [];
  for (const g of groupsData) {
    const group = await prisma.vehicleGroup.create({ data: g });
    // Link all 6 system doc types to each group by default
    for (const dt of createdDocTypes) {
      await prisma.groupDocumentType.create({
        data: { groupId: group.id, documentTypeId: dt.id },
      });
    }
    createdGroups.push(group);
  }
  console.log(`✅ ${createdGroups.length} vehicle groups created with doc type mappings`);

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@fleet.com',
      password: hashedPassword,
      name: 'Fleet Admin',
      role: 'ADMIN',
    },
  });
  console.log(`✅ Admin user created: ${admin.email}`);

  // Create sample vehicles
  const vehiclesData = [
    {
      registrationNumber: 'KA01AB1234',
      make: 'Tata',
      model: 'Ace Gold',
      fuelType: 'Diesel',
      chassisNumber: 'MAT449100N1A00001',
      engineNumber: '497TCIC4DSL00001',
      gvw: 3500,
      seatingCapacity: 2,
      permitType: 'GOODS',
    },
    {
      registrationNumber: 'MH02CD5678',
      make: 'Ashok Leyland',
      model: 'Dost Plus',
      fuelType: 'Diesel',
      chassisNumber: 'MB1DDCLA7M1A00002',
      engineNumber: 'BS4CRDI15D00002',
      gvw: 4990,
      seatingCapacity: 3,
      permitType: 'GOODS',
    },
    {
      registrationNumber: 'TN03EF9012',
      make: 'Mahindra',
      model: 'Bolero Pickup',
      fuelType: 'Diesel',
      chassisNumber: 'MA1ZR2HKAM1S00003',
      engineNumber: 'MHAWK2200D00003',
      gvw: 2955,
      seatingCapacity: 2,
      permitType: 'GOODS',
    },
  ];

  const now = new Date();
  const daysFromNow = (days) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  for (const vehicleData of vehiclesData) {
    const vehicle = await prisma.vehicle.create({ data: vehicleData });

    // Create compliance documents with varying expiry dates
    const complianceDocs = [
      { type: 'RC', expiryDate: daysFromNow(365), status: 'GREEN' },
      { type: 'INSURANCE', expiryDate: daysFromNow(45), status: 'GREEN' },
      { type: 'PERMIT', expiryDate: daysFromNow(20), status: 'YELLOW' },
      { type: 'PUCC', expiryDate: daysFromNow(5), status: 'RED' },
      { type: 'FITNESS', expiryDate: daysFromNow(90), status: 'GREEN' },
      { type: 'TAX', expiryDate: daysFromNow(-3), status: 'RED' },
    ];

    for (const doc of complianceDocs) {
      await prisma.complianceDocument.create({
        data: {
          vehicleId: vehicle.id,
          ...doc,
          lastVerifiedAt: now,
        },
      });
    }

    console.log(`✅ Vehicle created: ${vehicle.registrationNumber} with compliance docs`);
  }

  // Create sample challans
  const allVehicles = await prisma.vehicle.findMany();

  const challanData = [
    // ── Vehicle 1: KA01AB1234 ──
    {
      regNo: 'KA01AB1234',
      challans: [
        {
          challanNumber: 'HYD11TE256294495',
          amount: 200,
          userCharges: 0,
          status: 'PENDING',
          issuedAt: daysFromNow(-45),
          source: 'National Highway Patrol',
          unitName: 'Hyderabad',
          location: '8GV6+85P, Maruthi Nagar, New Santoshnagar, Santosh Nagar, Hyderabad, Telangana 500059, India',
          psLimits: 'Santosh Nagar Tr PS',
          violation: 'Fancy/Irregular Number Plate (R 80(A) TS M.V. Rules, 50, 51 C.M.V.R r/w 177 M.V. Act)',
          authorizedBy: 'Insp. Suresh Reddy',
          proofImageUrl: 'https://placehold.co/800x500/e2e8f0/475569?text=Challan+Proof+%231%0ANumber+Plate+Violation',
        },
        {
          challanNumber: 'HYD11ET258327851',
          amount: 200,
          userCharges: 0,
          status: 'PENDING',
          issuedAt: daysFromNow(-30),
          source: 'City Traffic Police',
          unitName: 'Hyderabad',
          location: 'H no.9-8-26 new, 9-8-16/1 old maruthi nagar, Maruthi Nagar, New Santoshnagar, Champapet, Hyderabad, Telangana 500059, India',
          psLimits: 'Santosh Nagar Tr PS',
          violation: 'Fancy/Irregular Number Plate (R 80(A) TS M.V. Rules, 50, 51 C.M.V.R r/w 177 M.V. Act)',
          authorizedBy: 'Insp. Manoj Verma',
          proofImageUrl: 'https://placehold.co/800x500/fef2f2/991b1b?text=Challan+Proof+%232%0AIrregular+Plate',
        },
        {
          challanNumber: 'CYB35LG255322424',
          amount: 1000,
          userCharges: 35,
          status: 'PENDING',
          issuedAt: daysFromNow(-15),
          source: 'TSPA ON ORR',
          unitName: 'Cyberabad',
          location: 'Outer Ring Road, Narsingi',
          psLimits: 'Narsingi Tr PS',
          violation: 'Over speeding/ Dangerous Driving (S 184 M.V. Act)',
          authorizedBy: 'SI. Ravi Kumar',
          proofImageUrl: 'https://placehold.co/800x500/fef9c3/854d0e?text=Challan+Proof+%233%0AOver+Speeding',
        },
        {
          challanNumber: 'BLR22KR187654321',
          amount: 500,
          userCharges: 0,
          status: 'PAID',
          issuedAt: daysFromNow(-90),
          paidAt: daysFromNow(-85),
          source: 'Bangalore Traffic Police',
          unitName: 'Bangalore',
          location: 'MG Road Junction, Bangalore',
          psLimits: 'Halasuru Gate PS',
          violation: 'Signal Jumping / Red Light Violation (S 119/177 M.V. Act)',
          authorizedBy: 'Const. Naveen',
          proofImageUrl: 'https://placehold.co/800x500/dcfce7/166534?text=Challan+Proof+%234%0ASignal+Jump+%28PAID%29',
        },
        {
          challanNumber: 'BLR22TF198765432',
          amount: 1000,
          userCharges: 50,
          status: 'PAID',
          issuedAt: daysFromNow(-120),
          paidAt: daysFromNow(-110),
          source: 'Karnataka RTO',
          unitName: 'Bangalore',
          location: 'Electronic City Toll Plaza',
          psLimits: 'Electronic City PS',
          violation: 'Expired permit (S 66 M.V. Act)',
          authorizedBy: 'Insp. Manoj Verma',
          proofImageUrl: 'https://placehold.co/800x500/dcfce7/166534?text=Challan+Proof+%235%0AExpired+Permit+%28PAID%29',
        },
      ],
    },
    // ── Vehicle 2: MH02CD5678 ──
    {
      regNo: 'MH02CD5678',
      challans: [
        {
          challanNumber: 'MUM14WT312456789',
          amount: 2000,
          userCharges: 100,
          status: 'PENDING',
          issuedAt: daysFromNow(-10),
          source: 'Mumbai Traffic Police',
          unitName: 'Mumbai',
          location: 'Western Express Highway, Andheri East, Mumbai',
          psLimits: 'Andheri Tr PS',
          violation: 'Driving without valid insurance (S 196 M.V. Act)',
          authorizedBy: 'ASI. Deepak Patil',
          proofImageUrl: 'https://placehold.co/800x500/fef2f2/991b1b?text=Challan+Proof+%236%0ANo+Insurance',
        },
        {
          challanNumber: 'MUM14ER298765123',
          amount: 500,
          userCharges: 25,
          status: 'PENDING',
          issuedAt: daysFromNow(-20),
          source: 'Mumbai Traffic Police',
          unitName: 'Mumbai',
          location: 'Dadar TT Circle, Mumbai',
          psLimits: 'Dadar Tr PS',
          violation: 'Use of mobile phone while driving (S 177A M.V. Act)',
          authorizedBy: 'Const. Priya Sharma',
          proofImageUrl: 'https://placehold.co/800x500/e2e8f0/475569?text=Challan+Proof+%237%0AMobile+Phone+Use',
        },
        {
          challanNumber: 'PUN15GH345678901',
          amount: 1500,
          userCharges: 75,
          status: 'PAID',
          issuedAt: daysFromNow(-60),
          paidAt: daysFromNow(-55),
          source: 'Pune RTO',
          unitName: 'Pune',
          location: 'Hinjewadi IT Park Road, Pune',
          psLimits: 'Hinjewadi PS',
          violation: 'Overloading beyond permitted GVW (S 194 M.V. Act)',
          authorizedBy: 'Insp. Anil Jadhav',
          proofImageUrl: 'https://placehold.co/800x500/dcfce7/166534?text=Challan+Proof+%238%0AOverloading+%28PAID%29',
        },
      ],
    },
    // ── Vehicle 3: TN03EF9012 ──
    {
      regNo: 'TN03EF9012',
      challans: [
        {
          challanNumber: 'CHN07KL456789012',
          amount: 5000,
          userCharges: 200,
          status: 'PENDING',
          issuedAt: daysFromNow(-5),
          source: 'TN Highway Patrol',
          unitName: 'Chennai',
          location: 'NH48 Sriperumbudur Toll, Chennai-Bangalore Highway',
          psLimits: 'Sriperumbudur PS',
          violation: 'Drunken Driving (S 185 M.V. Act)',
          authorizedBy: 'SI. Murugan K',
          proofImageUrl: 'https://placehold.co/800x500/fef2f2/991b1b?text=Challan+Proof+%239%0ADrunken+Driving',
        },
        {
          challanNumber: 'CHN07MN567890123',
          amount: 300,
          userCharges: 0,
          status: 'PENDING',
          issuedAt: daysFromNow(-25),
          source: 'Chennai Traffic Police',
          unitName: 'Chennai',
          location: 'Anna Salai, Guindy, Chennai',
          psLimits: 'Guindy Tr PS',
          violation: 'Not wearing seat belt (S 194B M.V. Act)',
          authorizedBy: 'Const. Lakshmi R',
          proofImageUrl: null,
        },
        {
          challanNumber: 'CHN07PQ678901234',
          amount: 1000,
          userCharges: 50,
          status: 'PAID',
          issuedAt: daysFromNow(-75),
          paidAt: daysFromNow(-70),
          source: 'Tamil Nadu RTO',
          unitName: 'Chennai',
          location: 'Tambaram RTO Office, Chennai',
          psLimits: 'Tambaram PS',
          violation: 'Driving without valid fitness certificate (S 56 M.V. Act)',
          authorizedBy: 'Insp. Selvam P',
          proofImageUrl: 'https://placehold.co/800x500/dcfce7/166534?text=Challan+Proof+%2311%0ANo+Fitness+Cert+%28PAID%29',
        },
        {
          challanNumber: 'CHN07RS789012345',
          amount: 750,
          userCharges: 25,
          status: 'PAID',
          issuedAt: daysFromNow(-100),
          paidAt: daysFromNow(-95),
          source: 'Chennai Traffic Police',
          unitName: 'Chennai',
          location: 'Kathipara Junction, Chennai',
          psLimits: 'Alandur Tr PS',
          violation: 'Wrong side driving (S 184 M.V. Act)',
          authorizedBy: 'ASI. Babu M',
          proofImageUrl: 'https://placehold.co/800x500/dcfce7/166534?text=Challan+Proof+%2312%0AWrong+Side+%28PAID%29',
        },
      ],
    },
  ];

  for (const entry of challanData) {
    const vehicle = allVehicles.find((v) => v.registrationNumber === entry.regNo);
    if (!vehicle) continue;

    for (const c of entry.challans) {
      await prisma.challan.create({
        data: {
          vehicleId: vehicle.id,
          challanNumber: c.challanNumber,
          amount: c.amount,
          userCharges: c.userCharges,
          status: c.status,
          issuedAt: c.issuedAt,
          paidAt: c.paidAt || null,
          source: c.source,
          unitName: c.unitName,
          location: c.location,
          psLimits: c.psLimits,
          violation: c.violation,
          authorizedBy: c.authorizedBy,
          proofImageUrl: c.proofImageUrl,
        },
      });
    }
  }
  console.log('✅ Sample challans created (12 challans across 3 vehicles)');

  // Create sample driver
  const driver = await prisma.driver.create({
    data: {
      name: 'Rajesh Kumar',
      licenseNumber: 'KA0120210001234',
      licenseExpiry: daysFromNow(180),
      vehicleClass: 'HMV',
      riskScore: 2.5,
    },
  });
  console.log(`✅ Driver created: ${driver.name}`);

  // Assign driver to first vehicle
  const firstVehicle = allVehicles.find((v) => v.registrationNumber === 'KA01AB1234');
  if (firstVehicle) {
    await prisma.vehicleDriverMapping.create({
      data: {
        vehicleId: firstVehicle.id,
        driverId: driver.id,
      },
    });
    console.log('✅ Driver assigned to vehicle');
  }

  console.log('\n🎉 Seed completed!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
