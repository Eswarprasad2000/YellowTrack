const cron = require('node-cron');
const complianceService = require('./compliance.service');
const fastagService = require('./fastag.service');
const insuranceService = require('./insurance.service');
const alertService = require('./alert.service');
const complianceRepository = require('../repositories/compliance.repository');
const driverRepository = require('../repositories/driver.repository');
const prisma = require('../config/prisma');

// Track alerts sent today to avoid duplicates
const sentToday = new Set();

const resetDailyTracker = () => { sentToday.clear(); };

const alreadySent = (key) => {
  if (sentToday.has(key)) return true;
  sentToday.add(key);
  return false;
};

const startCronJobs = () => {
  // Run daily at midnight
  cron.schedule('0 0 * * *', async () => {
    resetDailyTracker();
    console.log('\n⏰ [CRON] Running daily compliance & license check...');
    await runComplianceCheck();
  });

  // Also run every 6 hours for more frequent alerts
  cron.schedule('0 */6 * * *', async () => {
    console.log('\n⏰ [CRON] Running 6-hourly compliance check...');
    await runComplianceCheck();
  });

  // Simulate FASTag toll deductions every 6 hours
  cron.schedule('30 */6 * * *', async () => {
    console.log('\n⏰ [CRON] Running FASTag toll simulation...');
    try { await fastagService.simulateTollDeductions(); }
    catch (err) { console.error('   ❌ FASTag simulation failed:', err.message); }
  });

  // Check insurance expiry daily
  cron.schedule('15 0 * * *', async () => {
    console.log('\n⏰ [CRON] Running insurance expiry check...');
    try { const r = await insuranceService.checkExpiring(); console.log(`   ✅ Insurance: ${r.updated} status updates, ${r.alerts} alerts`); }
    catch (err) { console.error('   ❌ Insurance check failed:', err.message); }
  });

  console.log('⏰ [CRON] Compliance + FASTag + Insurance scheduled');
};

const runComplianceCheck = async () => {
  try {
    let alertCount = 0;

    // 1. Update vehicle compliance statuses
    await complianceService.updateComplianceStatuses();

    // 2. Check vehicle documents
    const allDocs = await complianceRepository.findAll();
    for (const doc of allDocs) {
      if (!doc.expiryDate) continue; // Lifetime doc — skip
      const status = complianceService.calculateComplianceStatus(doc.expiryDate);
      if (status === 'YELLOW' || status === 'RED') {
        const key = `vehicle-doc-${doc.vehicleId}-${doc.type}`;
        if (!alreadySent(key)) {
          const vehicle = await prisma.vehicle.findUnique({ where: { id: doc.vehicleId } });
          if (vehicle) {
            await alertService.triggerVehicleAlert(vehicle.registrationNumber, doc.type, status, doc.expiryDate, vehicle.id);
            alertCount++;
          }
        }
      }
    }

    // 3. Check driver licenses
    const drivers = await driverRepository.findAll();
    for (const driver of drivers) {
      const days = Math.ceil((new Date(driver.licenseExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (days <= 30) {
        const key = `driver-license-${driver.id}`;
        if (!alreadySent(key)) {
          const status = days <= 0 ? 'RED' : 'YELLOW';
          await alertService.triggerDriverAlert(driver.name, driver.licenseNumber, status, driver.licenseExpiry, driver.id);
          alertCount++;
        }
      }

      // 4. Check driver documents
      for (const doc of driver.documents || []) {
        if (!doc.expiryDate) continue; // Lifetime doc — skip
        const docDays = Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (docDays <= 30) {
          const key = `driver-doc-${driver.id}-${doc.type}`;
          if (!alreadySent(key)) {
            const docStatus = docDays <= 0 ? 'RED' : 'YELLOW';
            await alertService.triggerDriverDocAlert(driver.name, doc.type, docStatus, doc.expiryDate, driver.id);
            alertCount++;
          }
        }
      }
    }

    // 5. Check upcoming/overdue service records
    const upcomingServices = await prisma.serviceRecord.findMany({
      where: {
        nextDueDate: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, // due within 7 days
      },
      include: { vehicle: true },
    });
    for (const svc of upcomingServices) {
      const key = `service-${svc.id}`;
      if (!alreadySent(key) && svc.vehicle) {
        await alertService.triggerServiceAlert(svc.vehicle.registrationNumber, svc.title, svc.nextDueDate, svc.vehicleId);
        alertCount++;
      }
    }

    console.log(`   ✅ Created ${alertCount} new alerts\n`);
  } catch (err) {
    console.error('   ❌ Check failed:', err.message);
  }
};

// Run on startup
const runCheckNow = async () => {
  console.log('\n🔍 Running startup compliance check...');
  await runComplianceCheck();

  // Also check FASTag balances on startup
  try {
    const allActive = await fastagService.getAll({ limit: 100, status: undefined, search: undefined });
    const lowBalance = (allActive.fastags || []).filter((f) => f.isActive && f.balance <= 100);
    for (const f of lowBalance) {
      if (f.vehicle) {
        await alertService.triggerFastagAlert(f.vehicle.registrationNumber, f.balance, f.id);
      }
    }
    if (lowBalance.length > 0) console.log(`   🚨 ${lowBalance.length} FASTag low-balance alert(s)`);
  } catch { /* ignore */ }
};

module.exports = { startCronJobs, runCheckNow };
