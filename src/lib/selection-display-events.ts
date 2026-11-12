export const SELECTION_DISPLAY_REFRESH = 'cabinbuddy:selection-display-refresh';

export function refreshSelectionDisplay() {
  window.dispatchEvent(new Event(SELECTION_DISPLAY_REFRESH));
}
export const BOOKING_CREATED = 'cabinbuddy:booking-created';

export function announceBookingCreated(familyGroup: string) {
  window.dispatchEvent(new CustomEvent(BOOKING_CREATED, { detail: { familyGroup } }));
}
