import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { loadCatalog, createCharacterIndex } from "./catalog";
import { buildSpecialtyTasks, createCooldown, createId, formatLiveCountdown } from "./domain";
import { loadState, parseState, saveState, serializeState } from "./storage";
import type { AppState, Catalog, Plan } from "./types";
import { BackupDialog, type BackupDialogMode } from "./components/BackupDialog";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { HelpDialog } from "./components/HelpDialog";
import { PlanEditor, type PlanDraft } from "./components/PlanEditor";
import { SmartImage } from "./components/SmartImage";
import { SpecialtyCard } from "./components/SpecialtyCard";

type TaskFilter = "all" | "ready" | "cooling";

function copyTextFallback(contents: string): boolean {
  const field = document.createElement("textarea");
  field.value = contents;
  field.readOnly = true;
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  field.setSelectionRange(0, contents.length);
  const copied = document.execCommand("copy");
  field.remove();
  return copied;
}

function useClock(): { now: number; refresh: () => void } {
  const [now, setNow] = useState(Date.now());
  const refresh = useCallback(() => setNow(Date.now()), []);
  useEffect(() => {
    const interval = window.setInterval(refresh, 1_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refresh]);
  return { now, refresh };
}

function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [state, setState] = useState<AppState>(loadState);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [editingPlan, setEditingPlan] = useState<Plan | "new" | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);
  const [backupDialog, setBackupDialog] = useState<BackupDialogMode | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [toast, setToast] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<number | undefined>(undefined);
  const { now, refresh: refreshClock } = useClock();

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(""), 2600);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimerRef.current), []);

  useEffect(() => {
    const controller = new AbortController();
    loadCatalog(controller.signal)
      .then(setCatalog)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCatalogError(error instanceof Error ? error.message : "无法加载角色数据。 ");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    try {
      saveState(state);
    } catch (error) {
      console.error("Could not save planner state", error);
    }
  }, [state]);

  const characterIndex = useMemo(
    () => createCharacterIndex(catalog?.characters ?? []),
    [catalog?.characters],
  );
  const activePlan = state.plans.find((plan) => plan.id === activePlanId) ?? null;
  const activeCharacter = activePlan ? characterIndex.get(activePlan.characterId) ?? null : null;
  const scopedPlans = activePlan ? [activePlan] : state.plans;
  const tasks = useMemo(
    () => buildSpecialtyTasks(scopedPlans, characterIndex, state.cooldowns, now),
    [characterIndex, now, scopedPlans, state.cooldowns],
  );
  const visibleTasks = tasks.filter((task) => {
    if (taskFilter === "ready") return task.isReady;
    if (taskFilter === "cooling") return !task.isReady;
    return true;
  });
  const readyCount = tasks.filter((task) => task.isReady).length;
  const coolingCount = tasks.length - readyCount;

  const savePlan = (draft: PlanDraft) => {
    const timestamp = Date.now();
    const selectedCharacters = draft.characterIds
      .map((characterId) => characterIndex.get(characterId))
      .filter((character) => character !== undefined);
    setState((current) => {
      if (editingPlan && editingPlan !== "new") {
        const characterId = draft.characterIds[0];
        if (characterId === undefined) return current;
        return {
          ...current,
          plans: current.plans.map((plan) => plan.id === editingPlan.id
            ? { ...plan, characterId, updatedAt: timestamp }
            : plan),
        };
      }
      const existingCharacterIds = new Set(current.plans.map((plan) => plan.characterId));
      const newPlans: Plan[] = draft.characterIds
        .filter((characterId) => !existingCharacterIds.has(characterId))
        .map((characterId, index) => ({
          id: createId("plan"),
          characterId,
          createdAt: timestamp + index,
          updatedAt: timestamp + index,
        }));
      return { ...current, plans: [...current.plans, ...newPlans] };
    });
    showToast(editingPlan === "new"
      ? selectedCharacters.length === 1
        ? `${selectedCharacters[0].name}的养成便签已经贴进手帐`
        : `已贴入 ${selectedCharacters.length} 张角色养成便签`
      : `便签角色已更换为 ${selectedCharacters[0]?.name ?? "所选角色"}`);
    setEditingPlan(null);
  };

  const deletePlan = () => {
    if (!deletingPlan) return;
    const characterName = characterIndex.get(deletingPlan.characterId)?.name ?? "这个角色";
    setState((current) => ({
      ...current,
      plans: current.plans.filter((plan) => plan.id !== deletingPlan.id),
    }));
    if (activePlanId === deletingPlan.id) setActivePlanId(null);
    showToast(`已移除 ${characterName} 的便签，特产冷却记录仍然保留`);
    setDeletingPlan(null);
  };

  const markCollected = (specialtyId: number, specialtyName: string) => {
    const collectedAt = Date.now();
    setState((current) => ({
      ...current,
      cooldowns: {
        ...current.cooldowns,
        [String(specialtyId)]: createCooldown(specialtyId, collectedAt),
      },
    }));
    refreshClock();
    showToast(`${specialtyName} 已盖章，46 小时后重新开放采集`);
  };

  const undoCollected = (specialtyId: number, specialtyName: string) => {
    setState((current) => {
      const cooldowns = { ...current.cooldowns };
      delete cooldowns[String(specialtyId)];
      return { ...current, cooldowns };
    });
    showToast(`已撤销 ${specialtyName} 的采集标记`);
  };

  const exportBackup = async () => {
    const contents = serializeState(state);
    const filename = `提瓦特特产采集手帐-${new Date().toISOString().slice(0, 10)}.json`;

    if (import.meta.env.MODE === "tauri") {
      try {
        const path = await save({
          title: "导出规划备份",
          defaultPath: filename,
          filters: [{ name: "JSON", extensions: ["json"] }],
        });
        if (!path) return;
        await writeTextFile(path, contents);
        showToast("本地规划备份已经导出");
      } catch (error) {
        console.error("Could not export planner state", error);
        showToast("导出失败，请重新选择保存位置");
      }
      return;
    }

    const blob = new Blob([contents], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    showToast("本地规划备份已经导出");
  };

  const applyImportedBackup = (contents: string): boolean => {
    try {
      const imported = parseState(JSON.parse(contents));
      if (!window.confirm(`导入将覆盖当前的 ${state.plans.length} 个规划和冷却记录，确定继续吗？`)) return false;
      setState(imported);
      setActivePlanId(null);
      setBackupDialog(null);
      showToast(`已导入 ${imported.plans.length} 个养成规划`);
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : "无法导入这个备份");
      return false;
    }
  };

  const copyBackup = async (contents: string) => {
    try {
      const copied = copyTextFallback(contents);
      if (!copied) {
        if (!navigator.clipboard) throw new Error("Clipboard API is unavailable");
        await navigator.clipboard.writeText(contents);
      }
      setBackupDialog(null);
      showToast("备份 JSON 已复制");
    } catch (error) {
      console.error("Could not copy planner state", error);
      showToast("自动复制失败，请长按文本框复制");
    }
  };

  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      applyImportedBackup(await file.text());
    } catch (error) {
      showToast(error instanceof Error ? error.message : "无法导入这个备份文件");
    }
  };

  if (catalogError) {
    return (
      <main className="load-state error-state">
        <div className="load-emblem">!</div><h1>手帐数据没有装订成功</h1><p>{catalogError}</p>
        <button onClick={() => window.location.reload()}>重新加载</button>
      </main>
    );
  }

  if (!catalog) {
    return <main className="load-state"><div className="loading-flower">✦</div><p>正在翻开旅行手帐…</p></main>;
  }

  const today = new Date(now);
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long" }).format(today).toUpperCase();
  const weekdayLabel = new Intl.DateTimeFormat("zh-CN", { weekday: "long" }).format(today);
  const deletingCharacter = deletingPlan ? characterIndex.get(deletingPlan.characterId) ?? null : null;

  return (
    <div className="app-shell">
      <header className="masthead">
        <div><small>THE TRAVELER'S BOTANICAL NOTES</small><h1>旅行者的采集手帐</h1></div>
        <div className="masthead-actions">
          <span>数据版本 v{catalog.metadata.gameVersion}<small>仅保存在本地</small></span>
          <button onClick={() => setBackupDialog("import")}>导入</button>
          <button onClick={() => setBackupDialog("export")} disabled={state.plans.length === 0}>导出</button>
          <button className="help-button" onClick={() => setShowHelp(true)} aria-label="打开使用说明" title="使用说明">?</button>
          <input ref={importInputRef} type="file" accept="application/json,.json" hidden onChange={importBackup} />
        </div>
      </header>

      <main className="book">
        <section className="page left-page">
          <div className="date-line"><div className="date-number">{String(today.getDate()).padStart(2, "0")}</div><div><b>{monthLabel} · {today.getFullYear()}</b><span>{weekdayLabel}，新的采集日</span></div></div>
          <p className="journal-intro">
            {state.plans.length === 0
              ? <>还没有养成规划。先贴一张便签，选择正在培养的角色吧。</>
              : readyCount > 0
                ? <>今天有 <mark>{readyCount} 种特产</mark> 已经恢复，可以再次出发。</>
                : <>今天的特产都在休息。<mark>下一次花开</mark> 会如期写进手帐。</>}
          </p>

          <div className="section-title"><h2>我的养成规划</h2><span>{state.plans.length} 份</span></div>
          {state.plans.length > 0 && (
            <button className={`all-plans-note ${activePlanId === null ? "active" : ""}`} onClick={() => setActivePlanId(null)}>
              <span>✦</span><div><b>全部角色</b><small>{state.plans.length} 名角色 · {buildSpecialtyTasks(state.plans, characterIndex, state.cooldowns, now).length} 种特产</small></div>
            </button>
          )}

          <div className="plan-notes">
            {state.plans.map((plan, index) => {
              const character = characterIndex.get(plan.characterId);
              if (!character) return null;
              const cooldown = state.cooldowns[String(character.regionalSpecialty.id)];
              const remainingMs = cooldown ? cooldown.readyAt - now : 0;
              const isCooling = remainingMs > 0;
              return (
                <article key={plan.id} className={`plan-note color-${index % 4} ${activePlanId === plan.id ? "active" : ""}`}>
                  <button className="plan-note-main" onClick={() => setActivePlanId(plan.id)}>
                    <SmartImage className="plan-character-avatar" image={character.icon} alt={character.name} />
                    <span className="plan-character-copy">
                      <b>{character.name}</b>
                      <small>{character.region ?? "其他"} · {character.regionalSpecialty.name}</small>
                      <span className={`plan-character-countdown ${isCooling ? "cooling" : "ready"}`}>
                        <strong>{isCooling ? formatLiveCountdown(remainingMs) : "现在可采集"}</strong>
                        {isCooling && <em>后恢复</em>}
                      </span>
                    </span>
                  </button>
                  <div className="plan-actions"><button onClick={() => setDeletingPlan(plan)} aria-label={`移除 ${character.name}`}>×</button></div>
                </article>
              );
            })}
          </div>
          <button className="add-plan-button" onClick={() => setEditingPlan("new")}>＋ 贴一张新的规划便签</button>

          <div className={`journal-stamp ${readyCount === 0 ? "resting" : ""}`}><b>{readyCount > 0 ? "今日宜" : "静候"}</b><span>{readyCount > 0 ? "采集" : "花开"}</span></div>
          <div className="decorative-leaf" aria-hidden="true">❧</div>
        </section>

        <section className="page right-page">
          <div className="checklist-head">
            <div><span>Today's checklist · {activeCharacter?.name ?? "全部角色"}</span><h2>今日采集札记</h2></div>
            <div className="task-filters">
              <button className={taskFilter === "all" ? "active" : ""} onClick={() => setTaskFilter("all")}>全部 {tasks.length}</button>
              <button className={taskFilter === "ready" ? "active" : ""} onClick={() => setTaskFilter("ready")}>可采集 {readyCount}</button>
              <button className={taskFilter === "cooling" ? "active" : ""} onClick={() => setTaskFilter("cooling")}>休息中 {coolingCount}</button>
            </div>
          </div>

          {visibleTasks.length > 0 ? (
            <div className="specialty-grid">
              {visibleTasks.map((task) => <SpecialtyCard key={task.specialty.id} task={task} now={now} onCollect={markCollected} onUndo={undoCollected} />)}
            </div>
          ) : (
            <div className="empty-checklist">
              <div>❀</div>
              <h3>{state.plans.length === 0 ? "先从一份角色规划开始" : "这一页暂时没有条目"}</h3>
              <p>{state.plans.length === 0 ? "选择角色后，对应的区域特产会自动写到这里。" : "可以切换上方筛选条件，查看其他采集状态。"}</p>
              {state.plans.length === 0 && <button onClick={() => setEditingPlan("new")}>创建第一份规划</button>}
            </div>
          )}
          <footer className="page-footer"><span>✓ 冷却结束后，特产会自动回到可采集札记中</span><span>图鉴收录 {catalog.metadata.regionalSpecialtyCount} 种区域特产</span></footer>
        </section>
      </main>

      <footer className="site-footer">提瓦特特产采集手账 · Designed &amp; Built by mohen</footer>

      {editingPlan && <PlanEditor key={editingPlan === "new" ? "new" : editingPlan.id} characters={catalog.characters} plan={editingPlan === "new" ? undefined : editingPlan} unavailableCharacterIds={new Set(state.plans.map((plan) => plan.characterId))} onClose={() => setEditingPlan(null)} onSave={savePlan} />}
      {backupDialog && (
        <BackupDialog
          mode={backupDialog}
          exportContents={serializeState(state)}
          onClose={() => setBackupDialog(null)}
          onFileAction={() => {
            if (backupDialog === "import") {
              importInputRef.current?.click();
            } else {
              void exportBackup();
            }
            setBackupDialog(null);
          }}
          onImportText={applyImportedBackup}
          onCopyText={(contents) => void copyBackup(contents)}
        />
      )}
      {deletingPlan && <ConfirmDialog title={`移除 ${deletingCharacter?.name ?? "这个角色"} 的便签？`} description="角色便签会从手帐中移除，但已经开始的特产冷却不会被删除。此操作无法撤销。" confirmLabel="移除便签" onCancel={() => setDeletingPlan(null)} onConfirm={deletePlan} />}
      {showHelp && <HelpDialog onClose={() => setShowHelp(false)} />}
      <div className={`toast ${toast ? "show" : ""}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}

export default App;
