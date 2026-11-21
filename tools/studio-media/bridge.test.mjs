import * as NodeTest from "node:test";
import * as NodeAssert from "node:assert/strict";
import * as NodeFSP from "node:fs/promises";
import * as NodeHttp from "node:http";
import * as NodePath from "node:path";
import * as NodeOS from "node:os";
import {startMediaBridge} from "./bridge.mjs";

NodeTest.test("a reviewed upload renders using only its declared files and cleans the private job", async()=>{
  const work=await NodeFSP.mkdtemp(NodePath.join(NodeOS.tmpdir(),"studio-bridge-test-"));
  const origin="http://127.0.0.1:3787";
  let calls=0;
  const bridge=await startMediaBridge({origin,ffmpeg:process.execPath,voice:"fixture",systemVoiceAvailable:true,work,renderer:async options=>{
    calls++;
    NodeAssert.equal(options.voice,"fixture");
    const captions=NodePath.join(NodePath.dirname(options.output),"tutorial.vtt"),preview=NodePath.join(NodePath.dirname(options.output),"tutorial.jpg");
    await Promise.all([NodeFSP.writeFile(options.output,"fixture"),NodeFSP.writeFile(captions,"WEBVTT"),NodeFSP.writeFile(preview,"frame")]);
    return {output:options.output,captions,preview};
  }});
  try {
    const headers={Origin:origin,Authorization:"Bearer "+new URL(bridge.pairing).hash.slice(1)};
    NodeAssert.equal((await fetch(bridge.endpoint+"/info",{headers:{Origin:origin}})).status,401);
    NodeAssert.equal((await fetch(bridge.endpoint+"/info",{headers:{...headers,Origin:"http://example.invalid"}})).status,403);
    NodeAssert.equal((await (await fetch(bridge.endpoint+"/info",{headers})).json()).voice,"fixture");
    const preflight=await fetch(bridge.endpoint+"/render",{method:"OPTIONS",headers:{Origin:origin,"Access-Control-Request-Method":"POST"}});
    NodeAssert.equal(preflight.status,204);
    NodeAssert.equal(preflight.headers.get("Access-Control-Allow-Origin"),origin);
    const data=new FormData();
    data.append("plan",JSON.stringify({schema:"studio-tutorial/1",title:"Demo",scenes:[{id:"one",source:"window",start:0,end:1,narration:"Click Save.",caption:"Save"}]}));
    const bytes=Uint8Array.from([0x1a,0x45,0xdf,0xa3,0,0,0,0,0,0,0,0]);
    data.append("source-window",new Blob([bytes]),"unused-local-name.webm");
    data.append("extra","ignored?");
    NodeAssert.equal((await fetch(bridge.endpoint+"/render",{method:"POST",headers,body:data})).status,400);
    data.delete("extra");
    data.append("narrator","kokoro:unconfigured");
    NodeAssert.equal((await fetch(bridge.endpoint+"/render",{method:"POST",headers,body:data})).status,400);
    data.set("narrator","system");
    data.append("soundtrack-level","present");
    NodeAssert.equal((await fetch(bridge.endpoint+"/render",{method:"POST",headers,body:data})).status,400);
    data.delete("soundtrack-level");
    data.append("narration-wav",new Blob([bytes]),"voice.wav");
    NodeAssert.equal((await fetch(bridge.endpoint+"/render",{method:"POST",headers,body:data})).status,400);
    data.delete("narration-wav");
    const out=await fetch(bridge.endpoint+"/render",{method:"POST",headers,body:data});
    NodeAssert.equal(out.status,200);
    const result=await out.formData();
    NodeAssert.equal(await result.get("movie").text(),"fixture");
    NodeAssert.equal(await result.get("captions").text(),"WEBVTT");
    NodeAssert.equal(calls,1);
  } finally {
    await bridge.close();
    try { NodeAssert.deepEqual(await NodeFSP.readdir(work), []); }
    finally { await NodeFSP.rm(work,{force:true,recursive:true}); }
  }
});

async function fixture(t, options) {
  const work = await NodeFSP.mkdtemp(NodePath.join(NodeOS.tmpdir(), "studio-bridge-tools-"));
  const origin = "http://127.0.0.1:3787";
  const bridge = await startMediaBridge({ origin, work, voice: "local fixture", ffmpeg: process.execPath, ...options });
  t.after(async () => {
    await bridge.close();
    try { NodeAssert.deepEqual(await NodeFSP.readdir(work), []); }
    finally { await NodeFSP.rm(work, { recursive: true, force: true }); }
  });
  const headers = { Origin: origin, Authorization: "Bearer " + new URL(bridge.pairing).hash.slice(1) };
  return { bridge, headers, post: (route, body, signal) => fetch(bridge.endpoint + route, { method: "POST", headers, body, signal }) };
}

function recording() {
  const body = new FormData();
  body.append("recording", new Blob([Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0])]), "private.webm");
  return body;
}

NodeTest.test("the transcription adapter receives only the local recording plus trusted renderer dependencies", async t => {
  const model = NodePath.join(NodeOS.tmpdir(), "approved-fixture.bin");
  const { post } = await fixture(t, { whisperModel: model, transcriber: async (options, host) => {
    NodeAssert.equal(options.model, model);
    NodeAssert.equal(NodePath.basename(options.input), "recording.webm");
    NodeAssert.equal(host.ffmpeg, process.execPath);
    NodeAssert.ok(host.signal instanceof AbortSignal);
    NodeAssert.equal(host.signal.aborted, false);
    await NodeFSP.writeFile(options.output, "1\n00:00:00,000 --> 00:00:00,800\nChoose a recording.\n");
  } });
  const response = await post("/transcribe", recording());
  NodeAssert.equal(response.status, 200);
  NodeAssert.match(await response.text(), /Choose a recording/);
});

NodeTest.test("motion uses the requested local treatment and rejects a concurrent operation", async t => {
  const entered = Promise.withResolvers(), resume = Promise.withResolvers();
  const { post } = await fixture(t, { motion: true, motionRenderer: async (style, output, signal) => {
    NodeAssert.equal(style, "blender");
    NodeAssert.ok(signal instanceof AbortSignal);
    entered.resolve();
    await resume.promise;
    await NodeFSP.writeFile(output, "reviewable motion");
  } });
  const form = new FormData();
  form.append("style", "blender");
  const first = post("/motion", form);
  try {
    await entered.promise;
    const second = await post("/motion", form);
    NodeAssert.equal(second.status, 409);
  } finally { resume.resolve(); }
  const done = await first;
  NodeAssert.equal(done.headers.get("content-type"), "video/mp4");
  NodeAssert.equal(await done.text(), "reviewable motion");
});

NodeTest.test("cancelling transcription reaches the running adapter and releases its inputs", async t => {
  const entered = Promise.withResolvers(), stopped = Promise.withResolvers();
  const { post } = await fixture(t, { whisperModel: "fixture", transcriber: async (_options, { signal }) => {
    const abort = new Promise(resolve => signal.addEventListener("abort", resolve, { once: true }));
    entered.resolve();
    await abort;
    stopped.resolve();
    signal.throwIfAborted();
  } });
  const controller = new AbortController();
  const result = post("/transcribe", recording(), controller.signal);
  await entered.promise;
  controller.abort();
  await NodeAssert.rejects(result, { name: "AbortError" });
  await stopped.promise;
});

NodeTest.test("cancelling an unfinished upload closes the bridge cleanly without invoking the renderer", async t => {
  let calls = 0;
  const { bridge, headers, post } = await fixture(t, { renderer: async () => { calls++; } });
  const ready = Promise.withResolvers(), closed = Promise.withResolvers();
  const upload = NodeHttp.request(bridge.endpoint + "/render", {
    method: "POST", headers: { ...headers, Expect: "100-continue", "Content-Length": 200,
      "Content-Type": "multipart/form-data; boundary=fixture" },
  });
  upload.once("continue", () => ready.resolve());
  upload.once("error", error => { if (!upload.destroyed) ready.reject(error); });
  upload.once("close", () => closed.resolve());
  upload.flushHeaders();
  try {
    await ready.promise;
    upload.write("--fixture\r\n");
    NodeAssert.equal((await post("/render", recording())).status, 409);
  } finally {
    upload.destroy();
    await closed.promise;
  }
  NodeAssert.equal(calls, 0);
});
