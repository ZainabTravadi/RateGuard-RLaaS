import { app } from "./app.js";
import { env } from "./config/env.js";

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

