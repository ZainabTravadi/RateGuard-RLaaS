import { app } from "./app.js";
import { env } from "./config/env.js";
import { ensureDatabase } from "./db/bootstrap.js";

// Make sure required tables exist before we start listening
await ensureDatabase();

app.listen(
  { port: env.PORT, host: "0.0.0.0" },
  (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`🚀 RateGuard backend running at ${address}`);
  }
);

