import * as fs from "node:fs";
import * as path from "node:path";
import dotenv from "dotenv";

let envLoaded = false;

export function ensureEnvLoaded() {
  if (envLoaded) {
    return;
  }

  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "..", "..", ".env"),
    path.resolve(__dirname, "..", "..", "..", ".env")
  ];

  let loaded = false;
  candidates.forEach((candidate) => {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
      loaded = true;
    }
  });

  if (!loaded) {
    dotenv.config();
  }

  envLoaded = true;
}
