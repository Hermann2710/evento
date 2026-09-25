import { create } from "zustand";

type TicketSelectionState = {
  eventId: string | null;
  quantities: Record<string, number>;
  setQuantity: (eventId: string, ticketTypeId: string, quantity: number) => void;
  reset: () => void;
};

/** Client-side ticket selection. The server always recomputes prices and availability. */
export const useTicketSelection = create<TicketSelectionState>((set) => ({
  eventId: null,
  quantities: {},
  setQuantity: (eventId, ticketTypeId, quantity) =>
    set((state) => {
      const base = state.eventId === eventId ? state.quantities : {};
      const quantities = { ...base, [ticketTypeId]: Math.max(0, quantity) };
      if (quantities[ticketTypeId] === 0) delete quantities[ticketTypeId];
      return { eventId, quantities };
    }),
  reset: () => set({ eventId: null, quantities: {} }),
}));
