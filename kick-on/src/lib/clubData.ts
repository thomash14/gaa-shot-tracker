/**
 * GAA club names by county.
 * This will be populated with the full dataset during migration.
 * For now, a minimal placeholder structure.
 */
export const clubsByCounty: Record<string, string[]> = {
  // Will be populated from the existing clubData.js during feature migration
};

export const COUNTIES = [
  'Antrim', 'Armagh', 'Carlow', 'Cavan', 'Clare', 'Cork', 'Derry',
  'Donegal', 'Down', 'Dublin', 'Fermanagh', 'Galway', 'Kerry',
  'Kildare', 'Kilkenny', 'Laois', 'Leitrim', 'Limerick', 'Longford',
  'Louth', 'Mayo', 'Meath', 'Monaghan', 'Offaly', 'Roscommon',
  'Sligo', 'Tipperary', 'Tyrone', 'Waterford', 'Westmeath',
  'Wexford', 'Wicklow',
] as const;

export type County = (typeof COUNTIES)[number];

export const GAA_POSITIONS = [
  'Goalkeeper',
  'Corner Back',
  'Full Back',
  'Half Back',
  'Midfield',
  'Half Forward',
  'Corner Forward',
  'Full Forward',
  'Utility',
] as const;
