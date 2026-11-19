import { MessageId, ProjectId, ThreadId } from "@t3tools/contracts";
import { isMacPlatform } from "@t3tools/shared/keybindings";
import { type CxOptions, cx } from "class-variance-authority";
import { msg } from "gt-react";
import { extendTailwindMerge } from "tailwind-merge";
import { DraftId } from "../composerDraftStore";
import { m, type MessageResolver } from "../i18n/messages";
import { randomUUID } from "./randomUUID";

// Register extra font sizes and background images so tailwind-merge does not
// treat text-2xs or bg-composer-seam-below as colors.
const twMerge = extendTailwindMerge({
  extend: {
    theme: { text: ["2xs", "3xs", "4xs", "5xs"] },
    classGroups: { "bg-image": [{ bg: ["composer-seam-below", "composer-seam-above"] }] },
  },
});

export function cn(...inputs: CxOptions) {
  return twMerge(cx(inputs));
}

export { isMacPlatform };

export function isWindowsPlatform(platform: string): boolean {
  return /^win(dows)?/i.test(platform);
}

export function normalizeSearchText(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function getLocalFileManagerName(platform: string, resolve: MessageResolver = m): string {
  if (isMacPlatform(platform)) {
    return "Finder";
  }
  if (isWindowsPlatform(platform)) {
    return resolve(msg("File Explorer", { $context: "the Windows file manager app" }));
  }
  return resolve(msg("Files", { $context: "the Linux file manager app" }));
}

export { randomUUID };

export const newProjectId = (): ProjectId => ProjectId.make(randomUUID());

export const newThreadId = (): ThreadId => ThreadId.make(randomUUID());

export const newDraftId = (): DraftId => DraftId.make(randomUUID());

export const newMessageId = (): MessageId => MessageId.make(randomUUID());
