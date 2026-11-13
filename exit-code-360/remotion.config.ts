import { Config } from "@remotion/cli/config";

// Use the Chromium headless shell that ships with the environment's Playwright
// install (no browser download needed). Override with REMOTION_BROWSER if needed.
Config.setBrowserExecutable(
  process.env.REMOTION_BROWSER ??
    "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell",
);
Config.setVideoImageFormat("png");
Config.setOverwriteOutput(true);
Config.setConcurrency(4);
