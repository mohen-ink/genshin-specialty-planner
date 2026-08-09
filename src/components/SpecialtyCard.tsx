import { formatReadyAt, formatRemaining } from "../domain";
import type { SpecialtyTask } from "../types";
import { SmartImage } from "./SmartImage";

interface SpecialtyCardProps {
  task: SpecialtyTask;
  now: number;
  onCollect: (specialtyId: number, name: string) => void;
  onUndo: (specialtyId: number, name: string) => void;
}

export function SpecialtyCard({ task, now, onCollect, onUndo }: SpecialtyCardProps) {
  const { specialty, characters, cooldown, isReady, remainingMs } = task;
  return (
    <article className={`specialty-card ${isReady ? "ready" : "cooling"}`}>
      <span className={isReady ? "card-pin" : "card-tape"} aria-hidden="true" />
      <div className="specialty-top">
        <SmartImage className="specialty-icon" image={specialty.icon} alt={specialty.name} />
        <div>
          <h3>{specialty.name}</h3>
          <span>{specialty.type}</span>
        </div>
        <span className={`state-mark ${isReady ? "ready" : "cooling"}`}>{isReady ? "可采集" : "休息中"}</span>
      </div>

      <p className="specialty-description">{specialty.description}</p>

      <div className="character-line">
        <span>所需角色：{characters.map((character) => character.name).join("、")}</span>
        <div className="small-portraits">
          {characters.slice(0, 4).map((character) => <SmartImage key={character.id} image={character.icon} alt={character.name} title={character.name} />)}
          {characters.length > 4 && <i>+{characters.length - 4}</i>}
        </div>
      </div>
      {isReady ? (
        <button className="collect-button" onClick={() => onCollect(specialty.id, specialty.name)}>盖章：本轮采集完成</button>
      ) : (
        <div className="cooldown-block">
          <div><strong>{formatRemaining(remainingMs)}</strong><span>{cooldown ? `${formatReadyAt(cooldown.readyAt, now)} 恢复` : "即将恢复"}</span></div>
          <button onClick={() => onUndo(specialty.id, specialty.name)}>撤销标记</button>
        </div>
      )}
    </article>
  );
}
