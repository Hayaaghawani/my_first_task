import mysql from "mysql2/promise";
import type { Pool } from "mysql2/promise";
import type { AppConfig } from "../config/env.js";

export function createDatabase(config: AppConfig["db"]): Pool {
  return mysql.createPool({
    ...config,
    waitForConnections: true,
    connectionLimit: 10,
  });
}
