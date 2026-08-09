import { describe, expect, it } from "vitest";
import { buildSpecialtyTasks, COOLDOWN_MS, createCooldown, formatRemaining, isCooldownActive } from "./domain";
import type { CatalogCharacter, Plan } from "./types";

const qingxin = {
  id: 100031,
  key: "qingxin",
  name: "清心",
  type: "璃月区域特产",
  description: "",
  icon: { filename: "qingxin", url: "qingxin.png" },
};

function character(id: number, name: string): CatalogCharacter {
  return {
    id,
    key: name,
    name,
    region: "璃月",
    element: "冰",
    weapon: "弓",
    icon: { filename: name, url: `${name}.png` },
    regionalSpecialty: qingxin,
  };
}

describe("cooldowns", () => {
  it("creates an exact 46 hour cooldown", () => {
    const cooldown = createCooldown(100031, 1_000);
    expect(cooldown.readyAt - cooldown.collectedAt).toBe(COOLDOWN_MS);
    expect(isCooldownActive(cooldown, cooldown.readyAt - 1)).toBe(true);
    expect(isCooldownActive(cooldown, cooldown.readyAt)).toBe(false);
  });

  it("formats minute-rounded remaining time", () => {
    expect(formatRemaining(46 * 60 * 60 * 1000)).toBe("46 小时");
    expect(formatRemaining(65 * 60 * 1000)).toBe("1 小时 05 分");
    expect(formatRemaining(20_000)).toBe("1 分钟");
    expect(formatRemaining(0)).toBe("已经恢复");
  });
});
describe("specialty aggregation", () => {
  it("merges single-character plans sharing one specialty", () => {
    const ganyu = character(1, "甘雨");
    const shenhe = character(2, "申鹤");
    const plans: Plan[] = [
      { id: "a", characterId: 1, createdAt: 1, updatedAt: 1 },
      { id: "b", characterId: 2, createdAt: 2, updatedAt: 2 },
    ];
    const tasks = buildSpecialtyTasks(plans, new Map([[1, ganyu], [2, shenhe]]), {}, 100);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].characters.map((entry) => entry.id).sort()).toEqual([1, 2]);
    expect(tasks[0].isReady).toBe(true);
  });

  it("treats an expired stored cooldown as ready", () => {
    const ganyu = character(1, "甘雨");
    const plans: Plan[] = [{ id: "a", characterId: 1, createdAt: 1, updatedAt: 1 }];
    const expired = createCooldown(100031, 1_000);
    const tasks = buildSpecialtyTasks(plans, new Map([[1, ganyu]]), { "100031": expired }, expired.readyAt);
    expect(tasks[0].isReady).toBe(true);
    expect(tasks[0].cooldown).toBeNull();
  });
});
