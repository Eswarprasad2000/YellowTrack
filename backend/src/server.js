const app = require('./app');
const config = require('./config');
const { startCronJobs, runCheckNow } = require('./services/cron.service');

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
  startCronJobs();
  // Run compliance check on startup to generate initial alerts
  setTimeout(() => runCheckNow(), 3000);
});
