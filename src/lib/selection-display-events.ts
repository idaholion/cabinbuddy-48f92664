export const SELECTION_DISPLAY_REFRESH = 'cabinbuddy:selection-display-refresh';

export function refreshSelectionDisplay() {
  window.dispatchEvent(new Event(SELECTION_DISPLAY_REFRESH));
}