/** Exécute la file de tâches (e-mails, Google) manuellement : npm run jobs:run */
import { drainJobs } from "../src/lib/jobs/processor";

const r = await drainJobs(10);
console.log(r);
process.exit(0);
