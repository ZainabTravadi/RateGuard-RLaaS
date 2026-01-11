import pkg from "pg";
import { env } from "../config/env.js";

const { Pool } = pkg;

export const db = new Pool({
  connectionString: env.DATABASE_URL
});
