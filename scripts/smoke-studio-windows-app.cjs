const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const { setTimeout: wait } = require("node:timers/promises");

const [sourceArg, executableArg, outputArg, profileRoot, candidate] = process.argv.slice(2);
const source = path.resolve(sourceArg);
const executable = path.resolve(executableArg);
const output = path.resolve(outputArg);
const req = createRequire(path.join(source, "apps/desktop/package.json"));
const electron = req("playwright-core")._electron;
assert.match(candidate, /^[a-f0-9]{40}$/);
const packageReader = createRequire(path.join(source, "scripts/package.json"))("@electron/asar");
const manifest = JSON.parse(
  packageReader.extractFile(
    path.join(path.dirname(executable), "resources/app.asar"),
    "package.json",
  ),
);
assert.equal(manifest.name, "open-product-studio");
assert.equal(manifest.t3codeCommitHash, candidate.slice(0, 12));
const user = fs.mkdtempSync(path.join(path.resolve(profileRoot), "synthetic-"));
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) =>
    [
      "SYSTEMROOT",
      "WINDIR",
      "COMSPEC",
      "PROGRAMFILES",
      "PROGRAMFILES(X86)",
      "PROGRAMW6432",
      "PROGRAMDATA",
      "SYSTEMDRIVE",
      "PATHEXT",
      "PROCESSOR_ARCHITECTURE",
      "NUMBER_OF_PROCESSORS",
    ].includes(key.toUpperCase()),
  ),
);
Object.assign(env, {
  USERPROFILE: user,
  HOME: user,
  APPDATA: path.join(user, "Roaming"),
  LOCALAPPDATA: path.join(user, "Local"),
  TEMP: path.join(user, "Temp"),
  TMP: path.join(user, "Temp"),
  XDG_CONFIG_HOME: path.join(user, "config"),
  XDG_CACHE_HOME: path.join(user, "cache"),
  STUDIO_HOME: path.join(user, "Studio-engine"),
  T3CODE_HOME: path.join(user, "sentinel-upstream-engine"),
  PATH: [path.join(process.env.SystemRoot, "System32"), process.env.SystemRoot].join(
    path.delimiter,
  ),
  HTTP_PROXY: "http://127.0.0.1:9",
  HTTPS_PROXY: "http://127.0.0.1:9",
  NO_PROXY: "127.0.0.1,localhost,::1",
  NODE_USE_ENV_PROXY: "1",
  NO_COLOR: "1",
});
for (const key of ["HOME", "APPDATA", "LOCALAPPDATA", "TEMP", "XDG_CONFIG_HOME", "XDG_CACHE_HOME"])
  fs.mkdirSync(env[key], { recursive: true });
const sentinels = [env.T3CODE_HOME, path.join(user, ".t3"), path.join(env.APPDATA, "t3-code")];
for (const dir of sentinels) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "unchanged.txt"), "synthetic upstream sentinel\n");
}
const project = "Windows package draft";
const note = "Account-free packaged startup saved this synthetic draft.";
const runs = [];
async function launch(index) {
  const app = await electron.launch({
    executablePath: executable,
    env,
    timeout: 120000,
    args: [
      // Isolate Chromium's earliest startup, then verify Studio selects its own profile.
      "--user-data-dir=" + path.join(user, "Chromium-bootstrap"),
      "--disable-background-networking",
      "--disable-component-update",
      "--disable-gpu-disk-cache",
      "--proxy-server=http://127.0.0.1:9",
      "--proxy-bypass-list=localhost;127.0.0.1;[::1]",
    ],
  });
  try {
    const page = await app.firstWindow({ timeout: 120000 });
    const identity = await app.evaluate(({ app }) => ({
      name: app.getName(),
      version: app.getVersion(),
      electron: process.versions.electron,
      node: process.versions.node,
      packaged: app.isPackaged,
      executable: process.execPath,
      resources: process.resourcesPath,
      userData: app.getPath("userData"),
      sessionData: app.getPath("sessionData"),
      pid: process.pid,
    }));
    assert.equal(identity.packaged, true);
    assert.match(identity.name, /^Open Product Studio/);
    assert.equal(path.normalize(identity.executable).toLowerCase(), executable.toLowerCase());
    assert.equal(
      path.resolve(identity.userData).toLowerCase(),
      path.resolve(env.APPDATA, "open-product-studio").toLowerCase(),
    );
    assert.equal(identity.userData.toLowerCase(), identity.sessionData.toLowerCase());
    const chooser = page.getByLabel("Open Product Studio", { exact: true });
    await chooser.waitFor({ timeout: 120000 });
    await page.evaluate(() => document.fonts.ready);
    const win = await app.browserWindow(page);
    await win.evaluate((w) => w.setContentSize(1240, 830));
    assert.match(page.url(), /^open-product-studio:\/\/app\//);
    if (index === 0) {
      await chooser
        .getByRole("heading", { name: "New project", exact: true })
        .waitFor({ timeout: 60000 });
      await page.screenshot({
        path: path.join(output, "packaged-window.png"),
        animations: "disabled",
      });
      await chooser.getByRole("button", { name: /^Blank\b/ }).click();
      await page.getByLabel("Project name", { exact: true }).fill(project);
      await page.getByLabel("Project notes", { exact: true }).fill(note);
      await page.getByRole("button", { name: "Projects", exact: true }).click();
      await page.getByRole("button", { name: new RegExp(project) }).waitFor({ timeout: 30000 });
    } else {
      await page.getByRole("button", { name: new RegExp(project) }).click({ timeout: 60000 });
      assert.equal(await page.getByLabel("Project notes", { exact: true }).inputValue(), note);
      await page.screenshot({
        path: path.join(output, "packaged-restart.png"),
        animations: "disabled",
      });
    }
    runs.push({ ...identity, url: page.url() });
  } catch (e) {
    await Promise.allSettled(
      app
        .windows()
        .map((page, i) =>
          page.screenshot({
            path: path.join(output, `diagnostic-${index}-${i}.png`),
            timeout: 8000,
          }),
        ),
    );
    for (const page of app.windows())
      console.error(
        await page
          .locator("body")
          .innerText({ timeout: 3000 })
          .catch(() => "<no text>"),
      );
    throw e;
  } finally {
    const cp = app.process();
    await Promise.race([app.close().catch(() => {}), wait(15000, undefined, { ref: false })]);
    if (cp.exitCode === null && !cp.signalCode) {
      cp.kill("SIGKILL");
      throw Error("Packaged Electron failed to exit cleanly.");
    }
  }
}
(async () => {
  await launch(0);
  await launch(1);
  assert.notEqual(runs[0].pid, runs[1].pid);
  for (const dir of sentinels) {
    assert.deepEqual(fs.readdirSync(dir), ["unchanged.txt"]);
    assert.equal(
      fs.readFileSync(path.join(dir, "unchanged.txt"), "utf8"),
      "synthetic upstream sentinel\n",
    );
  }
  assert.ok(fs.existsSync(env.STUDIO_HOME));
  fs.writeFileSync(
    path.join(output, "windows-runtime.json"),
    JSON.stringify(
      {
        candidate,
        embeddedCommit: manifest.t3codeCommitHash,
        runs,
        checks: [
          "packaged Electron startup",
          "Studio scheme and user/session roots",
          "blank project edit",
          "persistence across independent processes",
          "legacy fixture sentinels unchanged",
        ],
      },
      null,
      2,
    ),
  );
  console.log("Two packaged Windows Electron processes passed the draft and profile checks.");
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
