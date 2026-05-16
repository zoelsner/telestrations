import type { EntryType } from "./game-state";

export type RevealEntryBase = {
  authorName: string;
  id: string;
  turn: number;
  type: EntryType;
};

export type RevealChain<TEntry extends RevealEntryBase = RevealEntryBase> = {
  entries: TEntry[];
  id: string;
  order: number;
  ownerName: string;
};

export type RevealOverviewItem = {
  id: string;
  isSelected: boolean;
  label: string;
  ownerName: string;
};

export type RevealView<TEntry extends RevealEntryBase = RevealEntryBase> = {
  canGoNext: boolean;
  canGoPrevious: boolean;
  chainCount: number;
  currentIndex: number;
  overview: RevealOverviewItem[];
  selectedChain: (RevealChain<TEntry> & { label: string }) | null;
};

export function buildRevealView<TEntry extends RevealEntryBase>({
  chains,
  selectedChainId,
}: {
  chains: Array<RevealChain<TEntry>>;
  selectedChainId?: string | null;
}): RevealView<TEntry> {
  const orderedChains = chains
    .map((chain) => ({
      ...chain,
      entries: [...chain.entries].sort((left, right) => left.turn - right.turn),
    }))
    .sort((left, right) => left.order - right.order);
  const selectedIndex = Math.max(
    orderedChains.findIndex((chain) => chain.id === selectedChainId),
    0,
  );
  const selectedChain = orderedChains[selectedIndex] ?? null;

  return {
    canGoNext: selectedIndex >= 0 && selectedIndex < orderedChains.length - 1,
    canGoPrevious: selectedIndex > 0,
    chainCount: orderedChains.length,
    currentIndex: selectedChain === null ? -1 : selectedIndex,
    overview: orderedChains.map((chain, index) => ({
      id: chain.id,
      isSelected: index === selectedIndex,
      label: chainLabel(index),
      ownerName: chain.ownerName,
    })),
    selectedChain:
      selectedChain === null
        ? null
        : {
            ...selectedChain,
            label: chainLabel(selectedIndex),
          },
  };
}

function chainLabel(index: number) {
  return `Chain ${index + 1}`;
}
