import { useCallback, useEffect, useRef, useState } from "react";
import { registerPush, unregisterPush } from "../lib/push";
import PrivacyModal from "./PrivacyModal";
import { useNavigate } from "react-router";
import { api } from "../lib/api";
import {
  Bell,
  Moon,
  Sun,
  Shield,
  Trash2,
  ChevronRight,
  Globe,
  Check,
  Palette,
  AlertTriangle,
  X,
  Link2,
  Lock,
  Mail,
} from "lucide-react";
import { useAppData } from "../context/AppDataContext";
import { useLang } from "../context/LangContext";
import type { TranslationKey } from "../lib/i18n";
import { clearAuthSession, getStoredUser } from "../lib/auth";
import { THEME_PRESETS } from "../lib/theme-presets";

const LANGUAGES = [
  { code: "ko" as const, nativeName: "한국어", name: "Korean" },
  { code: "ja" as const, nativeName: "日本語", name: "Japanese" },
  { code: "en" as const, nativeName: "English", name: "English" },
];

type SocialProvider = "GOOGLE";

type LinkedProvider = {
  provider: SocialProvider;
  linked: boolean;
  providerEmail: string | null;
  linkedAt: string | null;
};

const SOCIAL_PROVIDER_META: Record<
  SocialProvider,
  { label: string; buttonClassName: string }
> = {
  GOOGLE: {
    label: "Google",
    buttonClassName: "bg-white text-[#1f1f1f] border border-border",
  },
};

export default function SettingsPage() {
  const { settings, profile, updateSettings } = useAppData();
  const { t } = useLang();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isSendingPwCode, setIsSendingPwCode] = useState(false);
  const [pwCodeError, setPwCodeError] = useState("");
  const [linkedProviders, setLinkedProviders] = useState<LinkedProvider[]>([]);
  const [socialLoading, setSocialLoading] = useState(true);
  const [socialSubmitting, setSocialSubmitting] = useState(false);
  const [socialMessage, setSocialMessage] = useState("");
  const googleLinkButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const linkedGoogle = linkedProviders.find(
    (provider) => provider.provider === "GOOGLE",
  );

  const loadLinkedProviders = useCallback(async () => {
    setSocialLoading(true);

    try {
      const response = await api.get<{ providers: LinkedProvider[] }>(
        "/auth/providers",
      );
      setLinkedProviders(response.providers);
    } catch {
      setSocialMessage("소셜 연동 상태를 불러오지 못했습니다.");
    } finally {
      setSocialLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLinkedProviders();
  }, [loadLinkedProviders]);

  useEffect(() => {
    if (
      !googleClientId ||
      !googleLinkButtonRef.current ||
      !window.google?.accounts?.id ||
      linkedGoogle?.linked
    ) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: async (response) => {
        if (!response.credential) {
          setSocialMessage("Google 연동 토큰을 받지 못했습니다.");
          return;
        }

        setSocialSubmitting(true);
        setSocialMessage("");

        try {
          await api.post("/auth/social/link", {
            provider: "GOOGLE",
            identityToken: response.credential,
          });
          setSocialMessage("Google 계정이 연결되었습니다.");
          await loadLinkedProviders();
        } catch (error) {
          setSocialMessage(
            error instanceof Error && error.message
              ? error.message
              : "Google 계정 연동에 실패했습니다.",
          );
        } finally {
          setSocialSubmitting(false);
        }
      },
    });

    googleLinkButtonRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(googleLinkButtonRef.current, {
      theme: "outline",
      size: "large",
      shape: "pill",
      width: 280,
      text: "continue_with",
    });
  }, [googleClientId, linkedGoogle?.linked, loadLinkedProviders]);

  const handleAccountDelete = async () => {
    const currentUser = getStoredUser();
    if (currentUser) {
      try {
        await api.delete(`/users/${currentUser.id}`);
      } catch {
        // 서버 삭제 실패해도 로컬 세션은 정리
      }
    }
    clearAuthSession();
    localStorage.removeItem("kebo-local-settings");
    localStorage.removeItem("kebo-liked-posts");
    localStorage.removeItem("kebo-profile-photo");
    navigate("/login");
    window.location.reload();
  };

  const currentLang = settings.language ?? "ko";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h2>{t("settings.title")}</h2>

      {/* Appearance */}
      <div className="bg-card rounded-md p-5 border border-border">
        <h3 className="mb-4">{t("settings.display")}</h3>
        <div className="space-y-5">
          {/* Dark mode toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.darkMode ? (
                <Moon className="w-5 h-5 text-primary" />
              ) : (
                <Sun className="w-5 h-5 text-primary" />
              )}
              <div>
                <p className="font-medium">{t("settings.dark_mode")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("settings.dark_mode_desc")}
                </p>
              </div>
            </div>
            <button
              onClick={() => updateSettings({ darkMode: !settings.darkMode })}
              className="relative w-12 h-6 rounded-full transition-colors bg-gray-300 dark:bg-zinc-600"
            >
              <div
                className={`absolute top-1 left-1 w-4 h-4 bg-primary rounded-full transition-transform ${
                  settings.darkMode ? "translate-x-6" : ""
                }`}
              />
            </button>
          </div>

          {/* Theme color picker */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">{t("settings.theme_color")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("settings.theme_color_desc")}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {THEME_PRESETS.map((preset) => {
                const isActive =
                  (settings.themeColor ?? "emerald") === preset.id;
                return (
                  <button
                    key={preset.id}
                    title={t(`theme.${preset.id}` as TranslationKey)}
                    onClick={() => updateSettings({ themeColor: preset.id })}
                    className="flex flex-col items-center gap-1.5 group"
                  >
                    <div
                      className={`w-10 h-10 rounded-full border-4 transition-all ${
                        isActive
                          ? "border-foreground scale-110 shadow-md"
                          : "border-transparent hover:border-muted-foreground/40 hover:scale-105"
                      }`}
                      style={{ backgroundColor: preset.swatch }}
                    >
                      {isActive && (
                        <div className="w-full h-full flex items-center justify-center">
                          <Check className="w-4 h-4 drop-shadow text-white" />
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-[10px] leading-tight text-center transition-colors ${isActive ? "text-foreground font-semibold" : "text-muted-foreground"}`}
                    >
                      {t(`theme.${preset.id}` as TranslationKey)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-card rounded-md p-5 border border-border">
        <h3 className="mb-4">{t("settings.notifications_section")}</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">
                  {t("settings.push_notifications")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("settings.push_notifications_desc")}
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                const next = !settings.notifications;
                if (next) {
                  const ok = await registerPush();
                  if (!ok) return;
                } else {
                  await unregisterPush();
                }
                updateSettings({ notifications: next });
              }}
              className="relative w-12 h-6 rounded-full transition-colors bg-gray-300 dark:bg-zinc-600"
            >
              <div
                className={`absolute top-1 left-1 w-4 h-4 bg-primary rounded-full transition-transform ${
                  settings.notifications ? "translate-x-6" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Data & Privacy */}
      <div className="bg-card rounded-md p-5 border border-border">
        <h3 className="mb-4">{t("settings.data_privacy")}</h3>
        <div className="space-y-3">
          {/* 비밀번호 변경 — hasPassword인 유저만 표시 */}
          {profile.hasPassword && (
            <div>
              <button
                onClick={async () => {
                  setIsSendingPwCode(true);
                  setPwCodeError("");
                  try {
                    await api.post("/auth/send-verification", {
                      email: profile.email,
                      purpose: "RESET_PASSWORD",
                    });
                    navigate(
                      `/reset-password?email=${encodeURIComponent(profile.email)}`,
                    );
                  } catch (err: unknown) {
                    setPwCodeError(
                      (err as { message?: string })?.message ??
                        "발송에 실패했습니다.",
                    );
                  } finally {
                    setIsSendingPwCode(false);
                  }
                }}
                disabled={isSendingPwCode}
                className="w-full flex items-center justify-between p-3 rounded hover:bg-muted transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">{t("signup.change_password")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("signup.change_password_desc")}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
              {pwCodeError && (
                <p className="text-xs text-destructive px-3">{pwCodeError}</p>
              )}
            </div>
          )}

          <button
            onClick={() => setShowPrivacyModal(true)}
            className="w-full flex items-center justify-between p-3 rounded hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">{t("settings.privacy")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("settings.privacy_desc")}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center justify-between p-3 rounded hover:bg-destructive/10 transition-colors text-destructive"
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5" />
              <div className="text-left">
                <p className="font-medium">{t("settings.account_delete")}</p>
                <p className="text-sm text-destructive/80">
                  {t("settings.account_delete_desc")}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-card rounded-md p-5 border border-border">
        <h3 className="mb-4">{t("settings.social")}</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded bg-muted p-3">
            <Link2 className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">{t("settings.social_link")}</p>
              <p className="text-sm text-muted-foreground">
                {t("settings.social_link_desc")}
              </p>
            </div>
          </div>

          {socialLoading ? (
            <p className="text-sm text-muted-foreground">
              {t("settings.social_loading")}
            </p>
          ) : (
            <div className="space-y-3">
              {(["GOOGLE"] as SocialProvider[]).map((provider) => {
                const status = linkedProviders.find(
                  (item) => item.provider === provider,
                ) ?? {
                  provider,
                  linked: false,
                  providerEmail: null,
                  linkedAt: null,
                };
                const meta = SOCIAL_PROVIDER_META[provider];

                return (
                  <div
                    key={provider}
                    className="rounded border border-border bg-background/50 p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <p className="font-medium">{meta.label}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {status.linked
                            ? t("settings.social_linked")
                            : provider === "GOOGLE"
                              ? t("settings.social_available")
                              : t("settings.social_coming_soon")}
                        </p>
                        {status.providerEmail && (
                          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span>{status.providerEmail}</span>
                          </div>
                        )}
                      </div>

                      {status.linked ? (
                        <button
                          type="button"
                          disabled
                          className="rounded bg-primary/10 px-4 py-2 text-sm font-medium text-primary opacity-80"
                        >
                          연동중
                        </button>
                      ) : provider === "GOOGLE" ? (
                        <div className="min-h-10 w-full max-w-[280px]">
                          <div
                            ref={googleLinkButtonRef}
                            className={
                              socialSubmitting
                                ? "pointer-events-none opacity-70"
                                : ""
                            }
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className={`rounded px-4 py-2 text-sm font-medium opacity-60 ${meta.buttonClassName}`}
                        >
                          Coming Soon
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!googleClientId && (
            <p className="text-sm text-muted-foreground">
              `VITE_GOOGLE_CLIENT_ID` 설정 후 Google 연동 버튼이 표시됩니다.
            </p>
          )}
          {socialMessage && (
            <p className="text-sm text-muted-foreground">{socialMessage}</p>
          )}
        </div>
      </div>

      {/* Language */}
      <div className="bg-card rounded-md p-5 border border-border">
        <h3 className="mb-4">{t("settings.language")}</h3>
        <div className="space-y-2">
          {LANGUAGES.map((language) => (
            <button
              key={language.code}
              onClick={() => updateSettings({ language: language.code })}
              className={`w-full flex items-center justify-between p-4 rounded transition-colors ${
                currentLang === language.code
                  ? "bg-primary/10 border-2 border-primary"
                  : "bg-muted hover:bg-muted/70 border-2 border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <Globe
                  className={`w-5 h-5 ${currentLang === language.code ? "text-primary" : "text-muted-foreground"}`}
                />
                <div className="text-left">
                  <p className="font-medium">{language.nativeName}</p>
                  <p className="text-sm text-muted-foreground">
                    {language.name}
                  </p>
                </div>
              </div>
              {currentLang === language.code && (
                <Check className="w-5 h-5 text-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* App Info */}
      <div className="bg-card rounded-md p-5 border border-border">
        <h3 className="mb-4">{t("settings.app_info")}</h3>
        <div className="space-y-2">
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">
              {t("settings.version")}
            </span>
            <span className="font-medium">1.0</span>
          </div>
        </div>
      </div>

      {showPrivacyModal && (
        <PrivacyModal onClose={() => setShowPrivacyModal(false)} />
      )}

      {/* Account Deletion Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-card rounded-md p-6 max-w-sm w-full shadow-2xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <h3 className="text-destructive">
                  {t("settings.delete_modal_title")}
                </h3>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {t("settings.delete_modal_body")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                {t("settings.cancel")}
              </button>
              <button
                onClick={() => void handleAccountDelete()}
                className="flex-1 py-2.5 rounded bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors"
              >
                {t("settings.delete_confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
