import { CircleHelp } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { Category } from "./drafts";
import "./projectTour.css";

const categoryTips = {
  blank: "Use the notes sheet to collect ideas. Return to Projects when the save indicator confirms your changes.",
  "digital-product": "Choose a format and describe your reader. Work through the outline and manuscript, then open Export to see the available files.",
  video: "Choose a visual style, review its tools and draft a scene in Storyboard. Review shows your plan before you download it.",
  clipper: "Record a source and its permissions, mark a moment and try a caption look. Export downloads the edit plan.",
  replica: "Describe an observation you have permission to use. Review the original behavior brief before sharing it with a collaborator.",
  "day-trader": "Describe your practice data, record a decision and write down what happened. Export downloads your practice journal.",
  "affiliate-storefront": "Compare candidates and pin your picks. Add merchant-issued affiliate links, review the public copy and download the storefront.",
} satisfies Record<Category, string>;

/** This component reads project identity for its bookmark. It has no editor or action callbacks. */
export function ProjectTour({ workspaceId, projectId, category }: {
  workspaceId: string;
  projectId: string;
  category: Category;
}) {
  const bookmark = "open-product-studio:tour:1:" + JSON.stringify([workspaceId, projectId]);
  const [tip, setTip] = useState(() => {
    try {
      const value = localStorage.getItem(bookmark);
      return value === "1" || value === "2" || value === "0" ? Number(value) : null;
    } catch {
      return null;
    }
  });
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const panelId = useId();
  const headingId = useId();
  const detailId = useId();
  const position = tip ?? 0;
  const singleSheet = category === "blank";
  const tips = [
    ["Name this project", "Give the project a name you will recognize. The save indicator above shows when your changes are on this device."],
    singleSheet
      ? ["Write on this sheet", "Use the notes field for your ideas. Projects brings you back to the list, where you can reopen this draft."]
      : ["Move between sheets", "Use Next and Back to move one step, or Go to step to jump directly to a sheet. Reopening the project returns to your last step."],
    ["Make your first output", categoryTips[category]],
  ] as const;

  function remember(index: number | null) {
    setTip(index);
    try {
      if (index === null) localStorage.removeItem(bookmark);
      else localStorage.setItem(bookmark, String(index));
    } catch {
      // The tour remains usable for this visit if persistent preferences are unavailable.
    }
  }
  function close(finished = false) {
    remember(finished ? null : position);
    setOpen(false);
    trigger.current?.focus();
  }
  useEffect(() => {
    if (open) heading.current?.focus({ preventScroll: true });
  }, [open, position]);
  useEffect(() => {
    if (!open) return;
    const builder = trigger.current?.closest<HTMLElement>(".ops-workspace");
    function dismiss(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) return;
      if (event.target instanceof Element && event.target.closest("dialog[open], [role='dialog'], [popover]:popover-open")) return;
      setOpen(false);
      trigger.current?.focus();
    }
    builder?.addEventListener("keydown", dismiss);
    return () => builder?.removeEventListener("keydown", dismiss);
  }, [open]);

  return (
    <div className="ops-tour" data-tip={open ? position : undefined}>
      <button type="button" className="ops-link ops-tour-toggle" ref={trigger}
        aria-expanded={open} aria-controls={open ? panelId : undefined}
        onClick={() => {
          if (open) close();
          else {
            remember(position);
            setOpen(true);
          }
        }}>
        <CircleHelp size={15} aria-hidden />
        {open ? "Close tour" : tip === null ? "Quick tour" : "Resume tour"}
      </button>
      {open && <section id={panelId} className="ops-tour-panel" aria-labelledby={headingId}>
        <span className="ops-location">Tip {position + 1} of {tips.length}</span>
        <h3 id={headingId} ref={heading} tabIndex={-1} aria-describedby={detailId}>{tips[position]![0]}</h3>
        <p id={detailId}>{tips[position]![1]}</p>
        <div className="ops-tour-actions">
          <button type="button" className="ops-link" onClick={() => close()}>Pause tour</button>
          {position > 0 && <button type="button" className="ops-button" onClick={() => remember(position - 1)}>Previous tip</button>}
          <button type="button" className="ops-button ops-primary" onClick={() => {
            if (position === tips.length - 1) close(true);
            else remember(position + 1);
          }}>{position === tips.length - 1 ? "Finish tour" : "Next tip"}</button>
        </div>
      </section>}
    </div>
  );
}
