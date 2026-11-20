import * as Schema from "effect/Schema";
import {
  readLocalStorageValue,
  useLocalStorage,
  writeLocalStorageValue,
} from "../../hooks/useLocalStorage";
import type { Category } from "./drafts";

const draftRouteSchema = Schema.NullOr(Schema.Literals(["local", "device", "t3"]));
export type BuilderDraftRoute = NonNullable<typeof draftRouteSchema.Type>;

function routeKey(workspaceId: string, category: Category) {
  return `ops.studio.builder-route/1/${JSON.stringify([workspaceId, category])}`;
}

function allowedRoute(category: Category, route: BuilderDraftRoute | null) {
  return category === "day-trader" && route === "t3" ? null : route;
}

export function getDefaultBuilderDraftRoute(
  category: Category,
  { deviceAvailable, t3Available }: { deviceAvailable: boolean; t3Available: boolean },
): BuilderDraftRoute {
  if (deviceAvailable) return "device";
  return t3Available && category !== "day-trader" ? "t3" : "local";
}

export function useBuilderDraftRoute(
  workspaceId: string,
  category: Category,
  defaultRoute: BuilderDraftRoute = "local",
): BuilderDraftRoute {
  const [saved] = useLocalStorage(routeKey(workspaceId, category), null, draftRouteSchema);
  return allowedRoute(category, saved) ?? allowedRoute(category, defaultRoute) ?? "local";
}

export function setBuilderDraftRoute(
  workspaceId: string,
  category: Category,
  route: BuilderDraftRoute,
) {
  if (!allowedRoute(category, route)) return false;
  const key = routeKey(workspaceId, category);
  writeLocalStorageValue(key, route, null, draftRouteSchema);
  return readLocalStorageValue(key, null, draftRouteSchema) === route;
}
