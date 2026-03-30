export const APP_NAME_STORAGE_KEY = 'cebusmpw_app_name';
export const DEFAULT_APP_NAME = 'Cart Witnessing Management';
export const APP_TAGLINE = 'Cart Witnessing Management';

export const normalizeAppName = (name: string) => {
  const trimmed = name.trim();
  return trimmed || DEFAULT_APP_NAME;
};