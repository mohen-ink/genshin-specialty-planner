import type { Catalog, CatalogCharacter } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function validateCatalog(value: unknown): Catalog {
  if (!isRecord(value) || !isRecord(value.metadata) || !Array.isArray(value.characters)) {
    throw new Error("角色数据格式不正确：缺少 metadata 或 characters。 ");
  }

  const validCharacters = value.characters.every((entry) => {
    if (!isRecord(entry) || !isRecord(entry.icon) || !isRecord(entry.regionalSpecialty)) return false;
    const specialty = entry.regionalSpecialty;
    return (
      typeof entry.id === "number" &&
      typeof entry.name === "string" &&
      typeof entry.icon.url === "string" &&
      typeof specialty.id === "number" &&
      typeof specialty.name === "string" &&
      isRecord(specialty.icon) &&
      typeof specialty.icon.url === "string"
    );
  });

  if (!validCharacters) {
    throw new Error("角色数据格式不正确：角色或区域特产字段缺失。 ");
  }

  return value as unknown as Catalog;
}

export async function loadCatalog(signal?: AbortSignal): Promise<Catalog> {
  const url = `${import.meta.env.BASE_URL}data/characters-regional-specialties.json`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`无法加载角色数据（HTTP ${response.status}）。`);
  }
  return validateCatalog(await response.json());
}

export function createCharacterIndex(characters: CatalogCharacter[]): Map<number, CatalogCharacter> {
  return new Map(characters.map((character) => [character.id, character]));
}
