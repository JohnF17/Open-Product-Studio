import {
  type DraftId,
  deriveEffectiveComposerModelState,
  useComposerDraftModelState,
  useComposerDraftStore,
} from "../../composerDraftStore";
import { draftModelSelectionApplies } from "../../lib/chatThreadActions";
import {
  type ModelSelection,
  type ProjectId,
  ProviderDriverKind,
  type ScopedThreadRef,
  type ServerProvider,
} from "@t3tools/contracts";
import {
  NO_PROVIDER_MODEL_SELECTION,
  providerInstanceEntriesFor,
  type ProviderInstanceEntry,
} from "../../providerInstances";
import { createModelSelection, modelSelectionsEqual } from "@t3tools/shared/model";
import { canUsePinnedModel } from "../../modelSelection";
import { type UnifiedSettings } from "@t3tools/contracts/settings";
import { getComposerPromptInjectionState, getComposerProviderState } from "./composerProviderState";
import { resolveComposerProviderSelection } from "../ChatView.logic";

const NO_PROVIDER_MODELS: ServerProvider["models"] = [];

/**
 * The provider instances the composer offers, which one is selected, and the model and options
 * the draft resolves to on it. The draft store is read first so every derivation follows the only
 * hook here; in the composer body they would straddle its later hooks and lose their cache.
 */
export function useComposerProviderModel(
  input: Omit<Parameters<typeof resolveComposerProviderSelection>[0], "entries"> & {
    readonly providerStatuses: ReadonlyArray<ServerProvider>;
    readonly settings: UnifiedSettings;
    readonly activeProjectId: ProjectId | null;
    readonly threadRef: ScopedThreadRef | DraftId;
    readonly threadModelSelection: ModelSelection | null | undefined;
    readonly projectModelSelection: ModelSelection | null | undefined;
    readonly promptInjectionState: ReturnType<typeof getComposerPromptInjectionState>;
    readonly threadStarted: boolean;
  },
) {
  const {
    providerStatuses,
    settings,
    activeProjectId,
    threadRef,
    threadModelSelection,
    projectModelSelection,
    promptInjectionState,
    candidateInstanceIds,
    lockedProvider,
    lockedInstanceId,
    threadStarted,
  } = input;
  const draftModelState = useComposerDraftModelState(threadRef);
  const pinProviderSelection = useComposerDraftStore(
    (store) => store.getDraftThread(threadRef)?.pinProviderSelection === true,
  );
  const requireAvailableModel = useComposerDraftStore(
    (store) => !threadStarted && store.getDraftThread(threadRef)?.requireAvailableModel === true,
  );
  const exactSelection = pinProviderSelection && draftModelState?.activeProvider
    ? draftModelState.modelSelectionByProvider[draftModelState.activeProvider]
    : undefined;
  const providerInstanceEntries: ReadonlyArray<ProviderInstanceEntry> = providerInstanceEntriesFor(
    providerStatuses,
    settings,
    activeProjectId,
  );
  const selection = resolveComposerProviderSelection({
    entries: providerInstanceEntries,
    exactInstanceId: exactSelection?.instanceId ??
      (requireAvailableModel ? NO_PROVIDER_MODEL_SELECTION.instanceId : undefined),
    candidateInstanceIds: [
      draftModelSelectionApplies(draftModelState, threadStarted)
        ? draftModelState.activeProvider
        : null,
      ...candidateInstanceIds,
    ],
    lockedProvider,
    lockedInstanceId,
  });
  const selectedInstanceId =
    selection.selectedProviderEntry?.instanceId ?? NO_PROVIDER_MODEL_SELECTION.instanceId;
  const selectedProvider: ProviderDriverKind =
    selection.selectedProviderEntry?.driverKind ?? selection.requestedDriverKind;
  const modelState =
    exactSelection && selectedInstanceId === exactSelection.instanceId
      ? {
          selectedModel: exactSelection.model,
          modelOptions: { [selectedInstanceId]: exactSelection.options ?? [] },
        }
      : deriveEffectiveComposerModelState({
          draft: draftModelState,
          threadStarted,
          providers: providerStatuses,
          selectedProvider,
          selectedInstanceId,
          requestedInstanceId: selection.requestedInstanceId,
          threadModelSelection,
          projectModelSelection,
          settings,
        });
  const selectedProviderModels = selection.selectedProviderEntry?.models ?? NO_PROVIDER_MODELS;
  const composerProviderState = getComposerProviderState({
    provider: selectedProvider,
    model: modelState.selectedModel,
    models: selectedProviderModels,
    promptInjectionState,
    modelOptions: modelState.modelOptions?.[selectedInstanceId],
  });
  const modelSelectionRequired = requireAvailableModel && (
    !exactSelection ||
    !selection.selectedProviderEntry ||
    !canUsePinnedModel(settings, selection.selectedProviderEntry, exactSelection.model) ||
    !modelSelectionsEqual(
      exactSelection,
      createModelSelection(selectedInstanceId, modelState.selectedModel, composerProviderState.modelOptionsForDispatch),
    )
  );
  return {
    requireAvailableModel,
    modelSelectionRequired,
    providerInstanceEntries,
    ...selection,
    selectedInstanceId,
    selectedProvider,
    selectedProviderModels,
    composerModelOptions: modelState.modelOptions,
    selectedModel: modelState.selectedModel,
    composerProviderState,
  };
}
