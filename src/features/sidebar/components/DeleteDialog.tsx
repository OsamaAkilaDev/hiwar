import { useEffect, useRef } from "react";
import { useT } from "../../../i18n";

type Props = {
  title: string | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteDialog({ title, open, onClose, onConfirm }: Props) {
  const t = useT();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialog.current;
    if (!el || el.open === open) return;
    if (open) el.showModal();
    else el.close();
  }, [open]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape closes natively; the click only dismisses via the backdrop
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-labelledby="delete-title"
      className="modal m-auto w-[min(24rem,calc(100vw-2rem))] rounded-2xl bg-surface p-5 text-fg backdrop:bg-black/40"
    >
      <h2 id="delete-title" className="break-words font-semibold text-base">
        {title ? t("deleteTitle", { title }) : t("deleteTitleUntitled")}
      </h2>
      <p className="mt-2 text-fg-muted text-sm">{t("deleteBody")}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-9 rounded-lg px-3 text-sm transition-colors hover:bg-surface-2"
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="h-9 rounded-lg bg-danger px-3 font-medium text-bg text-sm hover:opacity-90"
        >
          {t("delete")}
        </button>
      </div>
    </dialog>
  );
}
