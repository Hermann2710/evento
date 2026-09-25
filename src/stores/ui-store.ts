import { create } from "zustand";

type UiState = {
  mobileMenuOpen: boolean;
  setMobileMenu: (open: boolean) => void;
};

export const useUiStore = create<UiState>((set) => ({
  mobileMenuOpen: false,
  setMobileMenu: (open) => set({ mobileMenuOpen: open }),
}));
