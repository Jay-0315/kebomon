import { useState } from "react";
import { useNavigate } from "react-router";
import { Wallet } from "lucide-react";
import { useAppData } from "../context/AppDataContext";
import { useLang } from "../context/LangContext";
import { CHARACTERS, RARITY_COLOR, RARITY_LABEL } from "../data/characters";
import PixelCharacter from "./PixelCharacter";

const STARTERS = CHARACTERS.filter((c) => c.obtainMethod === "starter");

export default function StarterSelectionPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const { selectStarter } = useAppData();
  const [selectedStarter, setSelectedStarter] = useState<number | null>(null);
  const [starterLoading, setStarterLoading] = useState(false);

  const handleSelectStarter = async () => {
    if (!selectedStarter) return;
    setStarterLoading(true);
    try {
      await selectStarter(selectedStarter);
    } finally {
      setStarterLoading(false);
      navigate("/");
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1585143790814-b40d4b829e4a?w=1080')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(8px)",
        }}
      />
      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/80 rounded mb-4">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-foreground mb-2">{t("signup.starter_title")}</h1>
          <p className="text-muted-foreground text-sm">{t("signup.starter_subtitle")}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {STARTERS.map((char) => {
            const isSelected = selectedStarter === char.id;
            return (
              <button
                key={char.id}
                onClick={() => setSelectedStarter(char.id)}
                className={`bg-card rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-all ${
                  isSelected
                    ? "border-primary shadow-lg shadow-primary/20 scale-[1.03]"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <PixelCharacter characterId={char.id} size={64} float={isSelected} />
                <p className={`text-sm font-bold ${RARITY_COLOR[char.rarity]}`}>{char.korName}</p>
                <p className="text-[10px] text-muted-foreground">{RARITY_LABEL[char.rarity]}</p>
                <p className="text-[10px] text-muted-foreground text-center leading-tight">{char.description}</p>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleSelectStarter}
          disabled={!selectedStarter || starterLoading}
          className="w-full bg-primary/80 text-primary-foreground rounded py-3 font-medium shadow-md hover:shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none"
        >
          {starterLoading ? t("signup.starter_loading") : selectedStarter ? t("signup.starter_confirm") : t("signup.starter_prompt")}
        </button>
      </div>
    </div>
  );
}
