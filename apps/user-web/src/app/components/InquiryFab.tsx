import { useState } from "react";
import { Headset } from "lucide-react";
import InquiryModal from "./InquiryModal";
import { useLang } from "../context/LangContext";

export default function InquiryFab({ stacked }: { stacked: boolean }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t("settings.inquiry")}
        className={`fixed ${stacked ? "bottom-24" : "bottom-6"} right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary/90`}
      >
        <Headset className="h-6 w-6" />
      </button>
      {open && <InquiryModal onClose={() => setOpen(false)} />}
    </>
  );
}
