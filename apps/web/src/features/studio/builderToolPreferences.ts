import * as Schema from "effect/Schema";
import {
  getLocalStorageItem,
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

export function useBuilderDraftRoutePreference(workspaceId: string, category: Category) {
  const [saved] = useLocalStorage(routeKey(workspaceId, category), null, draftRouteSchema);
  return allowedRoute(category, saved);
}

export function useBuilderDraftRoute(
  workspaceId: string,
  category: Category,
  defaultRoute: BuilderDraftRoute = "local",
): BuilderDraftRoute {
  return (
    useBuilderDraftRoutePreference(workspaceId, category) ??
    allowedRoute(category, defaultRoute) ??
    "local"
  );
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

export function resetBuilderDraftRoute(workspaceId: string, category: Category) {
  const key = routeKey(workspaceId, category);
  writeLocalStorageValue(key, null, null, draftRouteSchema);
  try {
    return getLocalStorageItem(key, draftRouteSchema) === null;
  } catch {
    return false;
  }
}
