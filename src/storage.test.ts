import { describe, expect, it } from "vitest";
import { parseState, serializeState } from "./storage";
import type { AppState } from "./types";

const state: AppState = {
  version: 2,
  plans: [{ id: "plan-1", characterId: 10000037, createdAt: 1, updatedAt: 1 }],
  cooldowns: {
    "100031": { specialtyId: 100031, collectedAt: 2, readyAt: 3 },
  },
};

describe("planner backups", () => {
  it("round-trips an exported state", () => {
    expect(parseState(JSON.parse(serializeState(state)))).toEqual(state);
  });

  it("rejects an unknown schema", () => {
    expect(() => parseState({ version: 3, plans: [], cooldowns: {} })).toThrow();
  });

  it("splits an old multi-character plan into single-character plans", () => {
    const migrated = parseState({
      version: 1,
      plans: [{ id: "legacy", name: "旧规划", characterIds: [1, 2], createdAt: 1, updatedAt: 1 }],
      cooldowns: {},
    });
    expect(migrated.plans.map((plan) => plan.characterId)).toEqual([1, 2]);
  });
});
