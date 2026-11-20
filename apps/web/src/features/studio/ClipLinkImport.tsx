import { useLayoutEffect, useRef, useState } from "react";
import { clipDownloadUrl, downloadClipLink } from "./clipLinkDownload";

interface Props {
  link: string;
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function ClipLinkImport({ link, onFile, disabled = false }: Props) {
  const url = clipDownloadUrl(link);
  const operation = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useLayoutEffect(() => {
    setLoading(false);
    setError("");
    return () => {
      operation.current?.abort();
      operation.current = null;
    };
  }, [link, disabled]);

  if (!url) {
    return <p>Direct import supports public MP4 and WebM objects on Amazon S3, Google Cloud Storage and Azure Blob Storage. Use a link without sign-in or query parameters. For video pages, keep a reference or choose a permitted local copy.</p>;
  }

  async function start() {
    if (disabled || operation.current) return;
    const active = new AbortController();
    operation.current = active;
    setError("");
    setLoading(true);
    const timeout = window.setTimeout(() => active.abort(new DOMException("Import timed out", "TimeoutError")), 120_000);
    try {
      const file = await downloadClipLink(link, active.signal);
      active.signal.throwIfAborted();
      onFile(file);
    } catch (cause) {
      if (operation.current === active) {
        if (active.signal.aborted) {
          if (active.signal.reason?.name === "TimeoutError") setError("The download timed out. Retry or choose a local copy.");
        } else {
          setError(cause instanceof Error && cause.name === "Error" ? cause.message :
            "The browser could not read the direct link. Check cross-origin access, redirects and connectivity, or choose a local copy.");
        }
      }
    } finally {
      window.clearTimeout(timeout);
      if (operation.current === active) {
        operation.current = null;
        setLoading(false);
      }
    }
  }

  return (
    <div className="ops-source-actions">
      <p>Import up to 64 MiB from <strong>{url.hostname}</strong>. The host receives the file request and your network address. Studio sends no cookies or sign-in details. Import only footage you have permission to use.</p>
      {loading ? <>
        <p role="status">Downloading the selected video…</p>
        <button type="button" className="ops-button" onClick={() => {
          operation.current?.abort();
          operation.current = null;
          setLoading(false);
        }}>Cancel import</button>
      </> : <button type="button" className="ops-button" disabled={disabled}
        onClick={() => void start()}>Import permitted video</button>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
