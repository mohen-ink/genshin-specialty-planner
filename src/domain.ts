import type { CatalogCharacter, Cooldown, Plan, RegionalSpecialty, SpecialtyTask } from "./types";

export const COOLDOWN_HOURS = 46;
export const COOLDOWN_MS = COOLDOWN_HOURS * 60 * 60 * 1000;

export function createCooldown(specialtyId: number, collectedAt = Date.now()): Cooldown {
  return {
    specialtyId,
    collectedAt,
    readyAt: collectedAt + COOLDOWN_MS,
  };
}

export function isCooldownActive(cooldown: Cooldown | undefined, now = Date.now()): boolean {
  return Boolean(cooldown && cooldown.readyAt > now);
}

export function buildSpecialtyTasks(
  plans: Plan[],
  characterIndex: Map<number, CatalogCharacter>,
  cooldowns: Record<string, Cooldown>,
  now = Date.now(),
): SpecialtyTask[] {
  interface TaskAccumulator {
    specialty: RegionalSpecialty;
    characters: Map<number, CatalogCharacter>;
  }

  const accumulators = new Map<number, TaskAccumulator>();

  for (const plan of plans) {
    const character = characterIndex.get(plan.characterId);
    if (!character) continue;
    const specialty = character.regionalSpecialty;
    const existing = accumulators.get(specialty.id) ?? {
      specialty,
      characters: new Map<number, CatalogCharacter>(),
    };
    existing.characters.set(character.id, character);
    accumulators.set(specialty.id, existing);
  }

  return [...accumulators.values()]
    .map(({ specialty, characters }) => {
      const storedCooldown = cooldowns[String(specialty.id)];
      const active = isCooldownActive(storedCooldown, now);
      return {
        specialty,
        characters: [...characters.values()].sort((a, b) => a.name.localeCompare(b.name, "zh-CN")),
        cooldown: active ? storedCooldown : null,
        isReady: !active,
        remainingMs: active ? storedCooldown.readyAt - now : 0,
      };
    })
    .sort((a, b) => {
      if (a.isReady !== b.isReady) return a.isReady ? -1 : 1;
      if (!a.isReady && !b.isReady) {
        return (a.cooldown?.readyAt ?? 0) - (b.cooldown?.readyAt ?? 0);
      }
      return a.specialty.name.localeCompare(b.specialty.name, "zh-CN");
    });
}

export function formatRemaining(milliseconds: number): string {
  if (milliseconds <= 0) return "已经恢复";
  const totalMinutes = Math.ceil(milliseconds / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} 分钟`;
  if (minutes === 0) return `${hours} 小时`;
  return `${hours} 小时 ${String(minutes).padStart(2, "0")} 分`;
}

export function formatLiveCountdown(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export function formatReadyAt(timestamp: number, now = Date.now()): string {
  const target = new Date(timestamp);
  const today = new Date(now);
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const dayDifference = Math.round((targetDay - todayDay) / 86_400_000);
  const dayLabel =
    dayDifference === 0
      ? "今天"
      : dayDifference === 1
        ? "明天"
        : dayDifference === 2
          ? "后天"
          : `${target.getMonth() + 1} 月 ${target.getDate()} 日`;
  const time = new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(target);
  return `${dayLabel} ${time}`;
}

export function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
