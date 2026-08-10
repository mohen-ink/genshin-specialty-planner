import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { CatalogCharacter, Plan } from "../types";
import { SmartImage } from "./SmartImage";

export const REGION_ORDER = ["蒙德", "璃月", "稻妻", "须弥", "枫丹", "纳塔", "挪德卡莱", "其他"] as const;

export interface PlanDraft {
  characterIds: number[];
}

interface PlanEditorProps {
  characters: CatalogCharacter[];
  plan?: Plan;
  unavailableCharacterIds: Set<number>;
  onClose: () => void;
  onSave: (draft: PlanDraft) => void;
}

export function PlanEditor({ characters, plan, unavailableCharacterIds, onClose, onSave }: PlanEditorProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(plan ? [plan.characterId] : []),
  );
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("全部");

  const filteredCharacters = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("zh-CN");
    return characters
      .filter((character) => {
        const normalizedRegion = character.region ?? "其他";
        const regionMatches = region === "全部" || normalizedRegion === region;
        const searchable = [
          character.name,
          character.region ?? "其他",
          character.element,
          character.weapon,
          character.regionalSpecialty.name,
        ]
          .join(" ")
          .toLocaleLowerCase("zh-CN");
        return regionMatches && (!keyword || searchable.includes(keyword));
      })
      .sort((a, b) => {
        const aRegion = REGION_ORDER.indexOf((a.region ?? "其他") as (typeof REGION_ORDER)[number]);
        const bRegion = REGION_ORDER.indexOf((b.region ?? "其他") as (typeof REGION_ORDER)[number]);
        const aOrder = aRegion === -1 ? REGION_ORDER.length : aRegion;
        const bOrder = bRegion === -1 ? REGION_ORDER.length : bRegion;
        return aOrder - bOrder || a.name.localeCompare(b.name, "zh-CN");
      });
  }, [characters, region, search]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.classList.add("modal-open");
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (selectedIds.size === 0) return;
    onSave({ characterIds: [...selectedIds] });
  };

  const toggleCharacter = (characterId: number) => {
    setSelectedIds((current) => {
      if (plan) return new Set([characterId]);
      const next = new Set(current);
      if (next.has(characterId)) next.delete(characterId);
      else next.add(characterId);
      return next;
    });
  };

  const selectedCharacter = plan
    ? characters.find((character) => selectedIds.has(character.id)) ?? null
    : null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <form className="plan-editor" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="plan-editor-title">
        <header className="editor-header">
          <div>
            <span className="editor-kicker">CHARACTER NOTE</span>
            <h2 id="plan-editor-title">{plan ? "更换便签角色" : "选择养成角色"}</h2>
            <p>{plan ? "为这张便签重新选择一名角色。" : "可以一次选择多名角色，每名角色都会生成一张独立便签。"}</p>
          </div>
          <button type="button" className="close-button" onClick={onClose} aria-label="关闭">×</button>
        </header>

        <div className="picker-toolbar">
          <label className="character-search">
            <span>⌕</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索角色、特产、元素或武器" />
          </label>
          <strong>{plan ? selectedCharacter ? `已选择：${selectedCharacter.name}` : "请选择一名角色" : `已选择 ${selectedIds.size} 名角色`}</strong>
        </div>

        <div className="region-filters" aria-label="按国家筛选">
          {["全部", ...REGION_ORDER].map((entry) => (
            <button type="button" key={entry} className={region === entry ? "active" : ""} onClick={() => setRegion(entry)}>{entry}</button>
          ))}
        </div>

        <div className="character-grid">
          {filteredCharacters.map((character) => {
            const selected = selectedIds.has(character.id);
            const unavailable = unavailableCharacterIds.has(character.id) && character.id !== plan?.characterId;
            return (
              <button
                type="button"
                key={character.id}
                className={`character-option ${selected ? "selected" : ""} ${unavailable ? "unavailable" : ""}`}
                onClick={() => toggleCharacter(character.id)}
                aria-pressed={selected}
                disabled={unavailable}
              >
                <SmartImage
                  image={character.icon}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
                <span className="character-option-copy">
                  <b>{character.name}</b>
                  <small>{character.region ?? "其他"} · {character.element}</small>
                  <em>{unavailable ? "已经贴在手帐中" : character.regionalSpecialty.name}</em>
                </span>
                <i>{selected ? "✓" : unavailable ? "—" : "+"}</i>
              </button>
            );
          })}
          {filteredCharacters.length === 0 && <div className="picker-empty">没有找到符合条件的角色。</div>}
        </div>

        <footer className="editor-footer">
          <span>多名角色使用同一种特产时，采集札记仍会自动合并。</span>
          <div><button type="button" className="secondary-button" onClick={onClose}>取消</button><button type="submit" className="save-button" disabled={selectedIds.size === 0}>{plan ? "保存角色" : `贴入手帐（${selectedIds.size}）`}</button></div>
        </footer>
      </form>
    </div>
  );
}
