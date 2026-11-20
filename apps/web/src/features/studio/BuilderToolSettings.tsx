import { msg, T, useGT, useMessages } from "gt-react";
import { ChevronDown, Settings2 } from "lucide-react";
import { useId, useRef, useState } from "react";
import { supportsFootageExport } from "./clipFootageRender";
import {
  getDefaultBuilderDraftRoute,
  resetBuilderDraftRoute,
  setBuilderDraftRoute,
  useBuilderDraftRoutePreference,
  type BuilderDraftRoute,
} from "./builderToolPreferences";
import { getBuilderStepTools } from "./builderToolRegistry";
import { categories, type Category } from "./drafts";

interface BuilderToolSettingsProps {
  workspaceId: string;
  category?: Category;
  stage?: string;
  expanded?: boolean;
  t3Available?: boolean;
  deviceAvailable?: boolean;
  availableSkills?: readonly string[] | undefined;
  onOpenProviderSettings?: (() => void) | undefined;
}

const routeNames = {
  local: msg("Local starter"),
  device: msg("On-device AI"),
  t3: msg("T3 chat"),
} satisfies Record<BuilderDraftRoute, string>;

const statusNames = {
  unqualified: msg("Unqualified"),
  disabled: msg("Disabled"),
} as const;

export function BuilderToolSettings({
  workspaceId,
  category,
  stage,
  expanded = false,
  t3Available = false,
  deviceAvailable = false,
  availableSkills,
  onOpenProviderSettings,
}: BuilderToolSettingsProps) {
  const gt = useGT();
  const m = useMessages();
  const [selected, setSelected] = useState<Category>("digital-product");
  const current = category ?? selected;
  const defaultRoute = getDefaultBuilderDraftRoute(current, { deviceAvailable, t3Available });
  const savedRoute = useBuilderDraftRoutePreference(workspaceId, current);
  const route = savedRoute ?? defaultRoute;
  const local = getBuilderStepTools(current, stage);
  const id = useId();
  const routeFields = useRef<HTMLFieldSetElement>(null);
  const [failed, setFailed] = useState(false);
  const choices = [
    {
      id: "local",
      available: true,
      detail: gt("Fills a reviewable starter from your project details using built-in templates."),
    },
    {
      id: "device",
      available: deviceAvailable,
      detail: deviceAvailable
        ? gt("Drafts with a supported model on this device.")
        : gt("A supported on-device model is unavailable."),
    },
    ...(current === "day-trader"
      ? []
      : [
          {
            id: "t3" as const,
            available: t3Available,
            detail: t3Available
              ? gt("Opens an unsent T3 draft. Choose your provider and model before sending.")
              : gt("No usable T3 model is available for this workspace."),
          },
        ]),
  ] satisfies { id: BuilderDraftRoute; available: boolean; detail: string }[];

  function savePreference(route: BuilderDraftRoute) {
    setFailed(!setBuilderDraftRoute(workspaceId, current, route));
  }

  function resetPreference() {
    const reset = resetBuilderDraftRoute(workspaceId, current);
    setFailed(!reset);
    if (reset) {
      // The reset control leaves the tree. Continue keyboard navigation at the automatic choice.
      routeFields.current
        ?.querySelector<HTMLInputElement>(`input[value="${defaultRoute}"]`)
        ?.focus();
    }
  }

  const body = (
    <div
      className={
        category && !expanded
          ? "min-w-0 space-y-4 border-t border-border/60 p-3 sm:p-4"
          : "min-w-0 space-y-4 p-3 sm:p-4"
      }
    >
      {!category && (
        <label className="flex max-w-xs flex-col gap-1.5 text-sm font-medium">
          <T>Project category</T>
          <select
            className="min-h-9 min-w-0 max-w-full rounded-md border border-input bg-background px-2.5 text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            value={selected}
            onChange={(event) => {
              const match = categories.find((item) => item.id === event.currentTarget.value);
              if (match) {
                setSelected(match.id);
                setFailed(false);
              }
            }}
          >
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <dl className="min-w-0 space-y-2 text-sm">
        <div>
          <dt className="font-medium">
            {m(local.name)} <ToolStatus>{gt("Built in")}</ToolStatus>
          </dt>
          <dd className="text-muted-foreground">{m(local.detail)}</dd>
        </div>
        {current === "clipper" && stage === "export" && (
          <div>
            <dt className="font-medium">
              <T>Footage export</T>{" "}
              <ToolStatus>
                {supportsFootageExport() ? gt("Built in") : gt("Unavailable")}
              </ToolStatus>
            </dt>
            <dd className="text-muted-foreground">
              <T>Render selected cuts on this device when the browser supports video recording.</T>
            </dd>
          </div>
        )}
        {local.external && (
          <div>
            <dt className="font-medium">
              {m(local.external.name)}{" "}
              <ToolStatus>{m(statusNames[local.external.status])}</ToolStatus>
            </dt>
            <dd className="text-muted-foreground">{m(local.external.detail)}</dd>
          </div>
        )}
      </dl>

      <fieldset ref={routeFields} className="min-w-0 space-y-1">
        <legend className="mb-1 text-sm font-medium">
          <T>Preferred drafting tool</T>
        </legend>
        {!category && (
          <p className="mb-2 text-sm text-muted-foreground">
            <T>Applies to this project category in this workspace.</T>
          </p>
        )}
        {choices.map((choice) => (
          <label
            key={choice.id}
            className="flex min-w-0 items-start gap-2 rounded-md px-2 py-1.5 text-sm has-[:checked]:bg-accent/70"
          >
            <input
              aria-label={m(routeNames[choice.id])}
              aria-describedby={id + choice.id}
              className="mt-1 shrink-0 accent-primary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              type="radio"
              name={id}
              value={choice.id}
              checked={route === choice.id}
              disabled={!choice.available}
              onChange={() => savePreference(choice.id)}
              onClick={() => {
                // Clicking the current automatic choice makes it an explicit preference.
                if (choice.id === route) savePreference(choice.id);
              }}
            />
            <span className="min-w-0">
              <span className="block font-medium">{m(routeNames[choice.id])}</span>
              <span id={id + choice.id} className="block text-muted-foreground">
                {choice.detail}
              </span>
            </span>
          </label>
        ))}
        {savedRoute !== null && (
          <button
            type="button"
            className="rounded-sm px-2 py-1 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            onClick={resetPreference}
          >
            {gt("Reset to default")}
          </button>
        )}
        {failed && (
          <p role="alert" className="text-sm text-destructive">
            <T>Studio could not save this preference.</T>
          </p>
        )}
      </fieldset>
      {current !== "day-trader" && t3Available && availableSkills !== undefined && (
        <RegisteredBuilderSkills skills={availableSkills} />
      )}
      {onOpenProviderSettings && current !== "day-trader" && (
        <button
          type="button"
          className="rounded-sm text-sm font-medium text-foreground underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          onClick={onOpenProviderSettings}
        >
          <T>Open provider settings</T>
        </button>
      )}
    </div>
  );

  if (!category || expanded) return body;

  return (
    <details className="group min-w-0 rounded-md border border-border bg-card/40 text-foreground">
      <summary className="flex min-h-10 min-w-0 cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 rounded-md px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <Settings2 size={15} className="shrink-0" aria-hidden="true" />
        <span className="font-medium">
          <T>Tools and drafting preferences</T>
        </span>
        <span className="ml-auto text-xs text-muted-foreground">{m(routeNames[route])}</span>
        <ChevronDown size={14} className="shrink-0 group-open:rotate-180" aria-hidden="true" />
      </summary>
      {body}
    </details>
  );
}

function RegisteredBuilderSkills({ skills }: { skills: readonly string[] }) {
  const gt = useGT();
  const names = [...new Set(skills.filter((name) => name.trim()))];
  const first = names.slice(0, 10);
  const more = names.slice(10);
  return (
    <section className="min-w-0 space-y-1 text-sm" aria-label={gt("Registered T3 skills")}>
      <h3 className="font-medium">
        <T>Registered T3 skills</T>
      </h3>
      {names.length === 0 ? (
        <p className="text-muted-foreground">
          <T>The selected T3 account has no registered skills.</T>
        </p>
      ) : (
        <>
          <p className="text-muted-foreground">
            <T>Use the skill menu in T3 to select a skill for a separate request.</T>
          </p>
          <ul className="flex flex-wrap gap-1 pt-1 [overflow-wrap:anywhere]">
            {first.map((name) => (
              <li key={name} className="rounded-sm bg-muted px-1.5 py-0.5">
                {name}
              </li>
            ))}
          </ul>
          {more.length > 0 && (
            <details>
              <summary className="w-fit cursor-pointer rounded-sm py-1 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                {gt("Show {count, plural, one {{count} more skill} other {{count} more skills}}", {
                  count: more.length,
                })}
              </summary>
              <ul className="flex max-h-52 flex-wrap gap-1 overflow-y-auto [overflow-wrap:anywhere]">
                {more.map((name) => (
                  <li key={name} className="rounded-sm bg-muted px-1.5 py-0.5">
                    {name}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  );
}

function ToolStatus({ children }: { children: string }) {
  return (
    <span className="ml-1 inline-block rounded-sm border border-border px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
      {children}
    </span>
  );
}
