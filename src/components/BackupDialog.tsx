import { useEffect, useState } from "react";

export type BackupDialogMode = "import" | "export";

interface BackupDialogProps {
  mode: BackupDialogMode;
  exportContents: string;
  onClose: () => void;
  onFileAction: () => void;
  onImportText: (contents: string) => void;
  onCopyText: (contents: string) => void;
}

export function BackupDialog({
  mode,
  exportContents,
  onClose,
  onFileAction,
  onImportText,
  onCopyText,
}: BackupDialogProps) {
  const [contents, setContents] = useState(mode === "export" ? exportContents : "");
  const isImport = mode === "import";

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
    <div className="modal-backdrop backup-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <section className="backup-dialog" role="dialog" aria-modal="true" aria-labelledby="backup-dialog-title">
        <header className="backup-dialog-header">
          <div>
            <small>LOCAL BACKUP</small>
            <h2 id="backup-dialog-title">{isImport ? "导入规划备份" : "导出规划备份"}</h2>
          </div>
          <button className="close-button" onClick={onClose} aria-label="关闭">×</button>
        </header>

        <button className="backup-file-button" onClick={onFileAction}>
          {isImport ? "选择 JSON 文件" : "保存为 JSON 文件"}
        </button>

        <div className="backup-divider"><span>或</span></div>

        <label className="backup-json-field">
          <span>{isImport ? "粘贴 JSON" : "备份 JSON"}</span>
          <textarea
            value={contents}
            onChange={isImport ? (event) => setContents(event.target.value) : undefined}
            readOnly={!isImport}
            spellCheck={false}
            placeholder={isImport ? "在这里粘贴备份 JSON" : undefined}
          />
        </label>

        <footer className="backup-dialog-actions">
          <button className="secondary-button" onClick={onClose}>取消</button>
          <button
            className="save-button"
            disabled={contents.trim().length === 0}
            onClick={() => isImport ? onImportText(contents) : onCopyText(contents)}
          >
            {isImport ? "导入粘贴内容" : "复制 JSON"}
          </button>
        </footer>
      </section>
    </div>
  );
}
