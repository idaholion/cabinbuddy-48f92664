// Lightweight global bus so every instance of the organization hooks stays in
// sync when the active organization is switched. Without this, each hook
// instance keeps its own local state and stale cache, which made the app
// appear "stuck" in the previously selected organization until a page refresh.

type Listener = (organizationId: string) => void;

const listeners = new Set<Listener>();

export const onOrganizationSwitched = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const emitOrganizationSwitched = (organizationId: string) => {
  listeners.forEach((listener) => {
    try {
      listener(organizationId);
    } catch (e) {
      console.warn('[org-events] listener failed:', e);
    }
  });
};
