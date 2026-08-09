import { useEffect } from "react";

interface HelpDialogProps {
  onClose: () => void;
}

export function HelpDialog({ onClose }: HelpDialogProps) {
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

  return (
    <div className="modal-backdrop help-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <section className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title">
        <div className="help-emblem">?</div>
        <div className="help-heading">
          <small>TRAVELER'S FIELD GUIDE</small>
          <h2 id="help-title">使用说明</h2>
          <p>这本手帐用于记录角色所需的区域特产，以及每次采集后的刷新时间。</p>
        </div>
        <ol className="help-list">
          <li><b>添加角色便签</b><span>选择正在养成的角色；一次多选会生成多张独立便签。</span></li>
          <li><b>标记完成采集</b><span>在游戏中采集后回到手帐标记完成，对应特产会进入 46 小时冷却。</span></li>
          <li><b>等待自动恢复</b><span>倒计时结束后会自动变回可采集；需要相同特产的角色共享冷却状态。</span></li>
          <li><b>备份本地记录</b><span>规划和冷却只保存在当前浏览器中，可使用“导出”和“导入”迁移备份。</span></li>
        </ol>
        <button className="save-button help-close-button" onClick={onClose}>知道了</button>
      </section>
    </div>
  );
}
