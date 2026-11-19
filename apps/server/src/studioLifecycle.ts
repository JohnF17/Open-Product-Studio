/** These inherited routes target the upstream OS service, CLI package or installer. */
export const legacyLifecycleCommands = [
  "service",
  "up",
  "status",
  "install",
  "uninstall",
  "update",
  "__service-launcher",
  "__service-preflight",
] as const;

export const studioLifecycleGuidance =
  "This Studio build uses a foreground engine. Launch Open Product Studio, or run open-product-studio serve. Manage the optional Studio CLI in the desktop app's settings.";

export const isLegacyLifecycleCommand = (command: string | undefined): boolean =>
  legacyLifecycleCommands.some((name) => name === command);
