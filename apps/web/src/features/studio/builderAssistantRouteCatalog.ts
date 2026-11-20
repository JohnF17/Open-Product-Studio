import { resolveProvidersForCwd } from "@t3tools/client-runtime/providerSkills";
import { isScratchProject } from "@t3tools/client-runtime/state/projects";
import { DEFAULT_SERVER_SETTINGS, type EnvironmentId, type ModelSelection } from "@t3tools/contracts";

import { useMergedSettings } from "../../hooks/useSettings";
import { getCustomModelOptionsByInstance, canUsePinnedModel } from "../../modelSelection";
import { providerInstanceEntriesFor } from "../../providerInstances";
import { useProjects } from "../../state/entities";
import { useEnvironment, useEnvironmentProviders } from "../../state/environments";
import { EMPTY_SERVER_PROVIDERS } from "../../state/server";

/** Reads already reported T3 state. Opening Settings alone never requests discovery. */
export function useBuilderRouteCatalog(environmentId: EnvironmentId | null, scratchRoot: string | null) {
  const settings = useMergedSettings(useEnvironment(environmentId)?.serverConfig?.settings ?? DEFAULT_SERVER_SETTINGS);
  const byEnvironment = useEnvironmentProviders();
  const providers = resolveProvidersForCwd(
    (environmentId ? byEnvironment.get(environmentId) : undefined) ?? EMPTY_SERVER_PROVIDERS, scratchRoot,
  );
  const scratch = useProjects().find(project =>
    project.environmentId === environmentId && isScratchProject(project, scratchRoot));
  const entries = providerInstanceEntriesFor(providers, settings, scratch?.id ?? null);
  const modelOptions = getCustomModelOptionsByInstance(settings, providers);
  // Two choices suffice to distinguish a single available route from a choice of routes.
  const choices: ModelSelection[] = [];
  if (scratchRoot) {
    for (const entry of entries) {
      for (const model of modelOptions.get(entry.instanceId) ?? []) {
        if (!model.isUnavailable && canUsePinnedModel(settings, entry, model.slug)) {
          choices.push({ instanceId: entry.instanceId, model: model.slug });
          if (choices.length === 2) break;
        }
      }
      if (choices.length === 2) break;
    }
  }
  return { settings, providers, entries, modelOptions, choices, hasAvailableProviders: choices.length > 0 };
}

export function useBuilderT3Available(environmentId: EnvironmentId | null, scratchRoot: string | null) {
  return useBuilderRouteCatalog(environmentId, scratchRoot).hasAvailableProviders;
}
