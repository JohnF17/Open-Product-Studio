// Authenticated loopback transport for one creator's local Video builder.
import * as NodeHttp from "node:http";
import * as NodeCrypto from "node:crypto";
import * as NodeFS from "node:fs";
import * as NodeFSP from "node:fs/promises";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";
import * as NodeStream from "node:stream";
import * as NodeStreamPromises from "node:stream/promises";
import * as NodeUtil from "node:util";
import { isWindowsHost } from "./local.mjs";
import { compileProject } from "./project.mjs";

const cap = 128 * 1024 * 1024;
const responseHeaders = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", Vary: "Origin" };

function responseText(response, status, message) {
  if (!response.destroyed && !response.headersSent)
    response.writeHead(status, { ...responseHeaders, "Content-Type": "text/plain" }).end(message);
}

function permittedOrigin(value) {
  const url = new URL(value);
  if (url.username || url.password || url.host === "" || value !== url.protocol + "//" + url.host)
    throw Error("Supply the exact Studio window origin.");
  if (url.protocol === "https:" || /^open-product-studio(?:-dev)?:$/.test(url.protocol)) return value;
  if (url.protocol === "http:" && ["localhost","127.0.0.1","[::1]"].includes(url.hostname)) return value;
  throw Error("Use a local Studio origin or an HTTPS Studio deployment.");
}

async function readUpload(request,signal,maxBytes) {
  const size = Number(request.headers["content-length"]);
  if (!Number.isSafeInteger(size) || size < 1 || size > maxBytes)
    throw Error("Select less than 128 MiB of media per render.");
  const type = request.headers["content-type"] ?? "";
  if (!type.toLowerCase().startsWith("multipart/form-data;")) throw Error("Select source files in Studio.");
  let received = 0;
  const bounded=NodeStream.Readable.toWeb(request).pipeThrough(new TransformStream({
    transform(bytes,out){received+=bytes.byteLength;if(received>size)throw Error("Upload limit exceeded.");out.enqueue(bytes);},
    flush(){if(received!==size)throw Error("Upload incomplete.");}
  }),{signal});
  return new Response(bounded, {headers: {"Content-Type": type}}).formData();
}

async function storeRecording(file, job, name, signal) {
  if (!(file instanceof Blob) || file.size < 12) throw Error("A source recording is missing.");
  const header = Buffer.from(await file.slice(0,12).arrayBuffer());
  const ext = header.readUInt32BE() === 0x1a45dfa3 ? ".webm" : header.toString("ascii",4,8) === "ftyp" ? ".mp4" : null;
  if (!ext) throw Error("Select a WebM or MP4 recording.");
  const local = NodePath.join(job,name+ext);
  await NodeFSP.writeFile(local,file.stream(),{flag:"wx",signal});
  return local;
}

export async function startMediaBridge({ origin, ffmpeg, voice, whisperModel, motion = false, work = NodeOS.tmpdir(), port = 0, renderer, transcriber, motionRenderer, timeoutMs = 30 * 60_000 }) {
  permittedOrigin(origin);
  if (!NodePath.isAbsolute(ffmpeg) || !voice?.trim()) throw Error("Supply an absolute FFmpeg path and an installed voice name.");
  work=NodePath.resolve(work);
  await NodeFSP.mkdir(work, { recursive: true });
  const secret = NodeCrypto.randomBytes(32).toString("base64url");
  const expected = Buffer.from("Bearer " + secret);
  let busy = false;
  let active;
  let completed;
  const server = NodeHttp.createServer({maxHeaderSize: 8192}, async (req, res) => {
    const address = server.address();
    if (!address || req.headers.host !== "127.0.0.1:" + address.port || req.headers.origin !== origin)
      return responseText(res, 403, "Studio origin does not match.");
    res.setHeader("Access-Control-Allow-Origin", origin);
    if (req.method === "OPTIONS") {
      res.writeHead(204, { ...responseHeaders, "Access-Control-Allow-Methods": "GET, POST", "Access-Control-Allow-Headers": "authorization, content-type", "Access-Control-Allow-Private-Network":"true" }).end();
      return;
    }
    const auth = Buffer.from(req.headers.authorization ?? "");
    if (auth.length !== expected.length || !NodeCrypto.timingSafeEqual(auth,expected))
      return responseText(res, 401, "Reconnect using the current pairing code.");
    if (req.method === "GET" && req.url === "/info") {
      res.writeHead(200,{...responseHeaders,"Content-Type":"application/json"}).end(JSON.stringify({schema:"studio-media-bridge/1",voice,nativeVoiceAvailable:isWindowsHost,maxBytes:cap}));
      return;
    }
    if (req.method !== "POST" || !["/render","/transcribe","/motion"].includes(req.url)) return responseText(res,404,"Unknown action.");
    if (req.url==="/motion" && !motion) return responseText(res,503,"Start the renderer with --motion to enable local motion tools.");
    if (req.url==="/transcribe" && !whisperModel) return responseText(res,503,"This renderer has no local whisper.cpp model configured.");
    if (busy) return responseText(res,409,"A local render is already running.");
    busy = true;
    const controller = new AbortController();
    active = controller;
    const done=Promise.withResolvers(); completed=done.promise;
    const onClose = () => { if (!res.writableFinished) controller.abort(); };
    res.once("close",onClose);
    const timer = setTimeout(() => controller.abort(),timeoutMs);
    let job;
    let validating = true;
    try {
      const form = await readUpload(req,controller.signal,req.url==="/motion"?4096:cap);
      if (req.url==="/motion") {
        const style=form.get("style");
        if ([...form.keys()].length!==1 || !["hyperframes","remotion","blender"].includes(style)) throw Error("Choose an available treatment.");
        job=await NodeFSP.mkdtemp(NodePath.join(work,"studio-motion-"));
        const output=NodePath.join(job,"motion.mp4");
        validating=false;
        if(motionRenderer) await motionRenderer(style,output,controller.signal);
        else if(style==="blender") await (await import("./adapters/blender.mjs")).renderBlender({output},{signal:controller.signal,ffmpeg});
        else await (await import("./adapters/browser-compositions.mjs")).browserComposition(style,{output},{signal:controller.signal});
        controller.signal.throwIfAborted();
        const movie=await NodeFS.openAsBlob(output,{type:"video/mp4"});
        if(movie.size>20*1024*1024) throw Error("Motion output is too large.");
        res.writeHead(200,{...responseHeaders,"Content-Type":"video/mp4"});
        await NodeStreamPromises.pipeline(NodeStream.Readable.fromWeb(movie.stream()),res,{signal:controller.signal});
        return;
      }
      if (req.url==="/transcribe") {
        if ([...form.keys()].length!==1 || !form.has("recording")) throw Error("Select one recording.");
        job=await NodeFSP.mkdtemp(NodePath.join(work,"studio-transcribe-"));
        const input=await storeRecording(form.get("recording"),job,"recording",controller.signal);
        const output=NodePath.join(job,"captions.srt");
        validating=false;
        const run=transcriber ?? (await import("./adapters/whisper.mjs")).transcribe;
        await run({input, output, model:whisperModel},{ffmpeg,signal:controller.signal});
        controller.signal.throwIfAborted();
        const captions=await NodeFSP.readFile(output);
        if(!captions.length || captions.length>262144) throw Error("Caption file is too large.");
        res.writeHead(200,{...responseHeaders,"Content-Type":"application/x-subrip; charset=utf-8"}).end(captions);
        return;
      }
      const text = form.get("plan");
      if (typeof text !== "string" || Buffer.byteLength(text) > 200_000) throw Error("Invalid plan.");
      const plan = compileProject(JSON.parse(text));
      const ids = [...new Set(plan.scenes.map(s=>s.source))];
      const entries = [...form.keys()];
      const audio = form.get("narration-wav");
      const required = ["plan",...ids.map(id => "source-" + id),...(audio ? ["narration-wav"] : [])];
      if (entries.length !== required.length || required.some(key=>form.getAll(key).length !== 1))
        throw Error("Attach exactly the sources used in the approved plan.");
      job = await NodeFSP.mkdtemp(NodePath.join(work,"studio-render-"));
      const files = Object.create(null);
      for (const [index,id] of ids.entries()) {
        files[id] = await storeRecording(form.get("source-" + id),job,"source-"+index,controller.signal);
      }
      let wav;
      if (audio) {
        if (!(audio instanceof Blob)) throw Error("Select a narration WAV.");
        const header = Buffer.from(await audio.slice(0,12).arrayBuffer());
        if (header.toString("ascii",0,4)!=="RIFF" || header.toString("ascii",8,12)!=="WAVE") throw Error("Select a RIFF WAVE file.");
        wav=NodePath.join(job,"voice.wav");
        await NodeFSP.writeFile(wav,audio.stream(),{flag:"wx",signal:controller.signal});
      }
      const project = NodePath.join(job,"project.json");
      const assets = NodePath.join(job,"assets.json");
      await NodeFSP.writeFile(project,text);
      await NodeFSP.writeFile(assets,JSON.stringify(files));
      validating = false;
      const run = renderer ?? (await import("./engine.mjs")).renderTutorial;
      const result = await run({project, assets, output:NodePath.join(job,"tutorial.mp4"),ffmpeg, ...(wav?{audio:wav}:{voice}),signal:controller.signal});
      controller.signal.throwIfAborted();
      const outgoing = new FormData();
      outgoing.append("movie", await NodeFS.openAsBlob(result.output, {type:"video/mp4"}), "tutorial.mp4");
      outgoing.append("captions",new Blob([await NodeFSP.readFile(result.captions)],{type:"text/vtt"}),"tutorial.vtt");
      outgoing.append("preview",new Blob([await NodeFSP.readFile(result.preview)],{type:"image/jpeg"}),"tutorial.jpg");
      const payload = new Response(outgoing);
      res.writeHead(200,{...responseHeaders,"Content-Type":payload.headers.get("content-type")});
      await NodeStreamPromises.pipeline(NodeStream.Readable.fromWeb(payload.body),res,{signal:controller.signal});
    } catch (error) {
      const safe = error instanceof Error && /^Narration needs more time in scene [\w-]+[.!]?$/.test(error.message) ? error.message : null;
      const failure = {
        "/render": "Render failed. Check source intervals, speech duration, the selected voice and FFmpeg.",
        "/transcribe": "Transcription failed. Check the recording's audio and the installed speech model.",
        "/motion": "Motion rendering failed. Check the selected local tool installation.",
      }[req.url];
      responseText(res,validating?400:422,safe ?? (validating ? "Check the submitted fields, file types and upload size." : failure));
    } finally {
      clearTimeout(timer);
      res.off("close",onClose);
      try { if (job) await NodeFSP.rm(job,{recursive:true,force:true,maxRetries:3}); } catch { console.error("Studio could not remove its temporary job directory:", job); }
      active=undefined;
      busy=false;
      done.resolve();
    }
  });
  server.requestTimeout = 120_000;
  await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(port,"127.0.0.1",resolve);});
  const endpoint="http://127.0.0.1:"+server.address().port;
  return {endpoint,pairing:endpoint+"/#"+secret,close:async()=>{active?.abort();await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});await completed;}};
}

if (process.argv[1] && import.meta.url === NodeURL.pathToFileURL(NodePath.resolve(process.argv[1])).href) {
  const {values} = NodeUtil.parseArgs({options:{origin:{type:"string"},ffmpeg:{type:"string"},voice:{type:"string",default:"Microsoft Zira Desktop"},"whisper-model":{type:"string"},motion:{type:"boolean"},work:{type:"string"},port:{type:"string"}}});
  try {
    const bridge = await startMediaBridge({...values, whisperModel:values["whisper-model"], port: values.port ? Number(values.port) : 0});
    console.log("Paste this private pairing code into Video â†’ Preview on this computer:\n"+bridge.pairing+"\nClose this process to disconnect.");
    process.once("SIGINT",()=>void bridge.close());
    process.once("SIGTERM",()=>void bridge.close());
  } catch (error) { console.error(error.message); process.exitCode=1; }
}
