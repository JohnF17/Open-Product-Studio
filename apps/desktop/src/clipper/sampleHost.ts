// @effect-diagnostics nodeBuiltinImport:off -- Encoder enrollment uses bounded native file handles, exact digests and atomic rename in the host profile.
import type { ClipperSampleRequest, ClipperSampleResult } from "@t3tools/contracts";
import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { type StagedPortrait, PortraitRenderError, verifyQualifiedFfmpeg } from "../../../../scripts/lib/clipper/portraitRender.ts";
import { LocalProcessError } from "../../../../scripts/lib/clipper/process.ts";
import { renderStudioSample } from "../../../../scripts/lib/clipper/studioSample.ts";
import { saveApprovedPortrait } from "../../../../scripts/lib/clipper/portraitSave.ts";
import { forgetOperation, reconcilePrepared, recordAuthorized, recordPrepared } from "./sampleJournal.ts";

import { installSampleEncoder, sampleEncoderSha256 } from "./encoderEnrollment.ts";

const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const maxReviewBytes = 2 * 1024 * 1024;

interface Review {
  token: string;
  projectId: string;
  directory: string;
  artifact: StagedPortrait;
  outcome?: "saved" | "uncertain";
}

interface Owner {
  controller: AbortController;
  busy?: Promise<ClipperSampleResult>;
  review?: Review;
}

interface Dialogs {
  pickEncoder(): Promise<string | undefined>;
  pickDestination(): Promise<string | undefined>;
}

interface HostOptions {
  profileDirectory: string;
  /** Checks an existing directory on a qualified fixed local volume. */
  isAllowedVolume(directory: string): Promise<boolean>;
}

async function checkedDirectory(path: string) {
  if (!isAbsolute(path) || relative(path, await realpath(path)) !== "" || !(await lstat(path)).isDirectory()) {
    throw new Error("Local Studio storage is unavailable.");
  }
}

/** No caller-provided paths, filesystem grants or process arguments cross the renderer boundary. */
export function createSampleHost({ profileDirectory, isAllowedVolume }: HostOptions) {
  const root = join(profileDirectory, "clipper-sample");
  const encoderDirectory = join(root, "encoder");
  const binary = { path: join(encoderDirectory, "ffmpeg.exe"), sha256: sampleEncoderSha256 };
  const owners = new Map<string, Owner>();
  let recovering: Promise<void> | undefined;

  async function prepareStorage() {
    if (process.platform !== "win32" || process.arch !== "x64" || !await isAllowedVolume(profileDirectory)) return false;
    await checkedDirectory(profileDirectory);
    for (const directory of [root, encoderDirectory]) {
      await mkdir(directory, { recursive: true, mode: 0o700 });
      await checkedDirectory(directory);
    }
    recovering ??= reconcilePrepared(root, isAllowedVolume);
    await recovering;
    return true;
  }

  async function removeJob(directory: string) {
    if (dirname(directory) === root && /^job-[a-z\d]{6}$/i.test(basename(directory))) {
      await rm(directory, { recursive: true, force: true }).catch(() => {});
    }
  }

  async function dropReview(state: Owner) {
    const previous = state.review;
    delete state.review;
    if (previous) await removeJob(previous.directory);
  }

  async function run(state: Owner, request: ClipperSampleRequest, dialogs: Dialogs): Promise<ClipperSampleResult> {
    const { signal } = state.controller;
    if (!await prepareStorage()) return { status: "unavailable" };
    signal.throwIfAborted();
    if (request.action === "status") {
      const verified = await verifyQualifiedFfmpeg(binary, signal).catch(() => undefined);
      return { status: verified ? "ready" : "needs-encoder" };
    }
    if (request.action === "enroll") {
      const selected = await dialogs.pickEncoder();
      if (!selected || signal.aborted) return { status: "cancelled" };
      if (!await isAllowedVolume(dirname(selected))) return { status: "unavailable" };
      return { status: await installSampleEncoder(selected, encoderDirectory, signal) ? "ready" : "needs-encoder" };
    }
    if (!("projectId" in request) || !uuid.test(request.projectId)) return { status: "failed" };
    if (request.action === "render") {
      const { startFrame, endFrameExclusive } = request;
      if (!Number.isInteger(startFrame) || !Number.isInteger(endFrameExclusive) ||
          startFrame < 0 || startFrame >= endFrameExclusive || endFrameExclusive > 120) return { status: "failed" };
      if (!(await lstat(binary.path).catch(() => undefined))?.isFile()) return { status: "needs-encoder" };
      await dropReview(state);
      const directory = await mkdtemp(join(root, "job-"));
      try {
        const artifact = await renderStudioSample(binary, directory, { startFrame, endFrameExclusive }, signal);
        if (artifact.bytes > maxReviewBytes) throw new Error("Preview exceeds sample size.");
        const data = await readFile(artifact.path);
        if (data.length !== artifact.bytes || createHash("sha256").update(data).digest("hex") !== artifact.sha256) {
          throw new Error("The preview changed.");
        }
        signal.throwIfAborted();
        const token = randomUUID();
        state.review = { token, projectId: request.projectId, directory, artifact };
        return { status: "review", token, base64: data.toString("base64"), startFrame, endFrameExclusive };
      } catch (error) {
        if (!((error instanceof LocalProcessError || error instanceof PortraitRenderError) && error.code === "termination")) {
          await removeJob(directory);
        }
        if (error instanceof PortraitRenderError && error.code === "binary-mismatch") return { status: "needs-encoder" };
        throw error;
      }
    }
    const review = state.review;
    if (!review || review.token !== request.token || review.projectId !== request.projectId) return { status: "failed" };
    if (request.action === "discard") {
      await dropReview(state);
      return { status: "ready" };
    }
    if (request.action !== "save") return { status: "failed" };
    if (review.outcome) return { status: review.outcome };
    const destination = await dialogs.pickDestination();
    if (!destination || signal.aborted) return { status: "cancelled" };
    const parent = dirname(destination);
    const inPrivateStorage = relative(resolve(profileDirectory), resolve(destination));
    if (!isAbsolute(destination) || !(isAbsolute(inPrivateStorage) || inPrivateStorage.startsWith("..\\")) ||
        !await isAllowedVolume(parent)) return { status: "unavailable" };
    const operationId = randomUUID();
    const { path: artifactPath, bytes, sha256 } = review.artifact;
    const authorization = { destination, operationId, artifactPath, bytes, sha256 };
    await recordAuthorized(root, authorization);
    const result = await saveApprovedPortrait(authorization, {
      signal, persistPrepared: intent => recordPrepared(root, intent),
    });
    if (result.status === "saved" && result.verification === "verified") {
      review.outcome = "saved";
      if (result.cleanup === "complete") await forgetOperation(root, operationId);
      return { status: "saved" };
    }
    if (result.status !== "stopped") {
      review.outcome = "uncertain";
      return { status: "uncertain" };
    }
    if (result.cleanup === "complete") await forgetOperation(root, operationId);
    if (result.reason === "destination-occupied") return { status: "occupied" };
    if (result.reason === "cancelled") return { status: "cancelled" };
    return { status: "failed" };
  }

  async function release(owner: string) {
    const state = owners.get(owner);
    if (!state) return;
    owners.delete(owner);
    state.controller.abort();
    await state.busy;
    await dropReview(state);
  }

  return {
    async handle(owner: string, request: ClipperSampleRequest, dialogs: Dialogs): Promise<ClipperSampleResult> {
      const state: Owner = owners.get(owner) ?? { controller: new AbortController() };
      owners.set(owner, state);
      if (state.busy) {
        if (request.action === "discard" && state.review?.token === request.token && state.review.projectId === request.projectId) {
          await release(owner);
          return { status: "ready" };
        }
        return { status: "failed" };
      }
      const work = run(state, request, dialogs).catch((): ClipperSampleResult => {
        if (request.action === "save") {
          if (state.review) state.review.outcome = "uncertain";
          return { status: "uncertain" };
        }
        return { status: state.controller.signal.aborted ? "cancelled" : "failed" };
      });
      state.busy = work;
      try { return await work; } finally { delete state.busy; }
    },
    release,
  };
}
