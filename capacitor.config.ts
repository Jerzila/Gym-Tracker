import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native shell loads the deployed Next app under `/app` (root `/` is marketing).
 * Run `npx cap copy` after edits so `ios/App/App/capacitor.config.json` stays in sync if needed.
 */
const config: CapacitorConfig = {
  appId: "com.liftlygym.app",
  appName: "Liftly",
  webDir: "www",
  server: {
    url: "https://liftlygym.com/app",
    cleartext: false,
  },
};

export default config;
