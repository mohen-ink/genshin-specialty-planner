import type { AppState, Cooldown, Plan } from "./types";

export const STORAGE_KEY = "genshin-regional-specialties-planner:v1";

export const EMPTY_STATE: AppState = {
  version: 2,
  plans: [],
  cooldowns: {},
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPlan(value: unknown): value is Plan {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.characterId === "number" &&
    typeof value.createdAt === "number" &&
    typeof value.updatedAt === "number"
  );
}

interface LegacyPlan {
  id: string;
  characterIds: number[];
  createdAt: number;
  updatedAt: number;
}

function isLegacyPlan(value: unknown): value is LegacyPlan {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    Array.isArray(value.characterIds) &&
    value.characterIds.every((id) => typeof id === "number") &&
    typeof value.createdAt === "number" &&
    typeof value.updatedAt === "number"
  );
}

function isCooldown(value: unknown): value is Cooldown {
  return (
    isRecord(value) &&
    typeof value.specialtyId === "number" &&
    typeof value.collectedAt === "number" &&
    typeof value.readyAt === "number"
  );
}

export function parseState(value: unknown): AppState {
  if (!isRecord(value) || !Array.isArray(value.plans) || !isRecord(value.cooldowns)) {
    throw new Error("备份文件不是可识别的采集手帐数据。 ");
  }
  if (!Object.values(value.cooldowns).every(isCooldown)) {
    throw new Error("备份文件中的规划或冷却记录格式不正确。 ");
  }

  if (value.version === 1 && value.plans.every(isLegacyPlan)) {
    const characterIds = new Set<number>();
    const plans: Plan[] = [];
    for (const legacyPlan of value.plans) {
      for (const characterId of legacyPlan.characterIds) {
        if (characterIds.has(characterId)) continue;
        characterIds.add(characterId);
        plans.push({
          id: plans.length === 0 ? legacyPlan.id : `${legacyPlan.id}-${characterId}`,
          characterId,
          createdAt: legacyPlan.createdAt,
          updatedAt: legacyPlan.updatedAt,
        });
      }
    }
    return {
      version: 2,
      plans,
      cooldowns: value.cooldowns as Record<string, Cooldown>,
    };
  }

  if (value.version !== 2 || !value.plans.every(isPlan)) {
    throw new Error("备份文件中的规划或冷却记录格式不正确。 ");
  }
  return {
    version: 2,
    plans: value.plans,
    cooldowns: value.cooldowns as Record<string, Cooldown>,
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseState(JSON.parse(raw)) : EMPTY_STATE;
  } catch (error) {
    console.warn("Could not load saved planner state", error);
    return EMPTY_STATE;
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function serializeState(state: AppState): string {
  return JSON.stringify(
    {
      ...state,
      exportedAt: new Date().toISOString(),
    },
    null,
    2,
  );
}
