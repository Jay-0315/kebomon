import type { ReactNode } from "react";

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  /** panel width — matches Tailwind's max-w-{sm,md,lg} */
  maxWidth?: "sm" | "md" | "lg";
  /** long single-scroll content (form fields, detail view) — caps panel height and scrolls the whole thing */
  scrollable?: boolean;
  /** header + scrollable body + footer layout (e.g. a picker list) — caller scrolls its own body section */
  flexCol?: boolean;
  /** click outside the panel closes it — off by default so in-progress form edits aren't lost by an accidental click */
  closeOnBackdrop?: boolean;
  /** pass to render the panel as a <form>; omit for a plain <div> panel */
  onSubmit?: (e: React.FormEvent) => void;
}

const MAX_WIDTH_CLASS: Record<NonNullable<ModalProps["maxWidth"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

/** Shared modal chrome (backdrop + centered panel) extracted from the 6 admin modals that
 *  each hand-rolled the same `fixed inset-0 ... bg-[var(--bg-overlay)]` wrapper independently. */
export default function Modal({
  onClose,
  children,
  maxWidth = "md",
  scrollable = false,
  flexCol = false,
  closeOnBackdrop = false,
  onSubmit,
}: ModalProps) {
  const panelClass = [
    "w-full",
    MAX_WIDTH_CLASS[maxWidth],
    "rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6",
    scrollable ? "max-h-[85vh] overflow-y-auto" : "",
    flexCol ? "flex max-h-[80vh] flex-col" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-overlay)] p-4"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      {onSubmit ? (
        <form className={panelClass} onSubmit={onSubmit} onClick={stopPropagation}>
          {children}
        </form>
      ) : (
        <div className={panelClass} onClick={stopPropagation}>
          {children}
        </div>
      )}
    </div>
  );
}
