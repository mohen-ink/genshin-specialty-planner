export interface CatalogMetadata {
  schemaVersion: number;
  packageName: string;
  packageVersion: string;
  gameVersion: string;
  language: string;
  imageBase: string;
  characterCount: number;
  regionalSpecialtyCount: number;
  generatedAt: string;
}

export interface ImageReference {
  filename: string;
  url: string;
  fallbackUrls?: string[];
}

export interface RegionalSpecialty {
  id: number;
  key: string;
  name: string;
  type: string;
  description: string;
  icon: ImageReference;
}

export interface CatalogCharacter {
  id: number;
  key: string;
  name: string;
  region: string | null;
  element: string;
  weapon: string;
  icon: ImageReference;
  regionalSpecialty: RegionalSpecialty;
}

export interface Catalog {
  metadata: CatalogMetadata;
  characters: CatalogCharacter[];
}

export interface Plan {
  id: string;
  characterId: number;
  createdAt: number;
  updatedAt: number;
}

export interface Cooldown {
  specialtyId: number;
  collectedAt: number;
  readyAt: number;
}

export interface AppState {
  version: 2;
  plans: Plan[];
  cooldowns: Record<string, Cooldown>;
}

export interface SpecialtyTask {
  specialty: RegionalSpecialty;
  characters: CatalogCharacter[];
  cooldown: Cooldown | null;
  isReady: boolean;
  remainingMs: number;
}
