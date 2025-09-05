import { supabase } from '@/integrations/supabase/client';

// Shared image library for checklist items
// This ensures all checklists use identical URLs for maximum browser cache efficiency
export const CHECKLIST_IMAGE_LIBRARY = {
  // Water system
  'water-heater-drain': '/storage/checklist-images/water-heater-drain.jpg',
  'water-main-shutoff': '/storage/checklist-images/water-main-shutoff.jpg',
  'water-heater-controls': '/storage/checklist-images/water-heater-controls.jpg',
  'faucet-winterization': '/storage/checklist-images/faucet-winterization.jpg',
  'toilet-preparation': '/storage/checklist-images/toilet-preparation.jpg',
  
  // Electrical systems
  'breaker-panel': '/storage/checklist-images/breaker-panel.jpg',
  'electrical-shutoff': '/storage/checklist-images/electrical-shutoff.jpg',
  'outlet-check': '/storage/checklist-images/outlet-check.jpg',
  
  // HVAC and heating
  'propane-tank': '/storage/checklist-images/propane-tank.jpg',
  'propane-shutoff': '/storage/checklist-images/propane-shutoff.jpg',
  'furnace-filter': '/storage/checklist-images/furnace-filter.jpg',
  'thermostat': '/storage/checklist-images/thermostat.jpg',
  'wood-stove': '/storage/checklist-images/wood-stove.jpg',
  
  // Appliances
  'refrigerator-cleaning': '/storage/checklist-images/refrigerator-cleaning.jpg',
  'dishwasher-preparation': '/storage/checklist-images/dishwasher-preparation.jpg',
  'washer-dryer': '/storage/checklist-images/washer-dryer.jpg',
  'garbage-disposal': '/storage/checklist-images/garbage-disposal.jpg',
  
  // Structural and exterior
  'dock-inspection': '/storage/checklist-images/dock-inspection.jpg',
  'deck-preparation': '/storage/checklist-images/deck-preparation.jpg',
  'gutter-cleaning': '/storage/checklist-images/gutter-cleaning.jpg',
  'window-shutters': '/storage/checklist-images/window-shutters.jpg',
  'roof-inspection': '/storage/checklist-images/roof-inspection.jpg',
  'foundation-check': '/storage/checklist-images/foundation-check.jpg',
  
  // Security and access
  'door-locks': '/storage/checklist-images/door-locks.jpg',
  'window-locks': '/storage/checklist-images/window-locks.jpg',
  'alarm-system': '/storage/checklist-images/alarm-system.jpg',
  'garage-door': '/storage/checklist-images/garage-door.jpg',
  
  // Outdoor equipment
  'lawn-mower': '/storage/checklist-images/lawn-mower.jpg',
  'outdoor-furniture': '/storage/checklist-images/outdoor-furniture.jpg',
  'fire-pit': '/storage/checklist-images/fire-pit.jpg',
  'boat-lift': '/storage/checklist-images/boat-lift.jpg',
  
  // General maintenance
  'smoke-detectors': '/storage/checklist-images/smoke-detectors.jpg',
  'carbon-monoxide-detector': '/storage/checklist-images/carbon-monoxide-detector.jpg',
  'first-aid-kit': '/storage/checklist-images/first-aid-kit.jpg',
  'tools-organization': '/storage/checklist-images/tools-organization.jpg'
} as const;

export type ChecklistImageKey = keyof typeof CHECKLIST_IMAGE_LIBRARY;

// Helper function to get image URL by key
export const getChecklistImage = (key: ChecklistImageKey): string => {
  return CHECKLIST_IMAGE_LIBRARY[key];
};

// Helper function to get all available image keys
export const getAvailableImageKeys = (): ChecklistImageKey[] => {
  return Object.keys(CHECKLIST_IMAGE_LIBRARY) as ChecklistImageKey[];
};

// Helper function to upload a new shared checklist image
export const uploadChecklistImage = async (
  file: File, 
  key: ChecklistImageKey
): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${key}.${fileExt}`;
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('checklist-images')
    .upload(fileName, file, { upsert: true }); // upsert allows replacing existing files
  
  if (uploadError) throw uploadError;
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('checklist-images')
    .getPublicUrl(fileName);
  
  return publicUrl;
};

// Helper function to check if an image exists in storage
export const checkImageExists = async (key: ChecklistImageKey): Promise<boolean> => {
  try {
    const fileName = key + '.jpg'; // Default extension
    const { data, error } = await supabase.storage
      .from('checklist-images')
      .list('', { search: fileName });
    
    return !error && data && data.length > 0;
  } catch {
    return false;
  }
};

// Helper to get optimized image URL with lazy loading hints
export const getOptimizedChecklistImage = (key: ChecklistImageKey): {
  src: string;
  loading: 'lazy' | 'eager';
  decoding: 'async';
  alt: string;
} => {
  return {
    src: getChecklistImage(key),
    loading: 'lazy',
    decoding: 'async',
    alt: `Checklist reference image for ${key.replace(/-/g, ' ')}`
  };
};