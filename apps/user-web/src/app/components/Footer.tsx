import { useState } from "react";
import { Link } from "react-router";
import { Shield, FileText, BookOpen } from "lucide-react";
import { useLang } from "../context/LangContext";
import { isWebView } from "../lib/platform";
import PrivacyModal from "./PrivacyModal";

export default function Footer() {
  if (isWebView()) return null;
  return <FooterContent />;
}

function FooterContent() {
  const { t } = useLang();
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const serviceLinks = [
    { to: "/", label: t("nav.home") },
    { to: "/community", label: t("nav.community") },
    { to: "/attendance", label: t("nav.attendance") },
    { to: "/gacha", label: t("nav.gacha") },
    { to: "/kebomon", label: t("nav.kebomon") },
    { to: "/live", label: t("nav.live") },
    { to: "/mission", label: t("nav.mission") },
    { to: "/colosseum", label: t("nav.colosseum") },
    { to: "/raid", label: t("nav.raid") },
    { to: "/rogue", label: t("nav.rogue") },
    { to: "/expedition", label: t("nav.expedition") },
  ];

  const legalLinks = [
    {
      label: t("footer.privacy"),
      icon: <Shield className="w-3.5 h-3.5" />,
      onClick: () => setPrivacyOpen(true),
    },
    {
      label: t("footer.terms"),
      icon: <FileText className="w-3.5 h-3.5" />,
      onClick: undefined,
    },
    {
      label: t("footer.operational"),
      icon: <BookOpen className="w-3.5 h-3.5" />,
      onClick: undefined,
    },
  ];

  return (
    <>
      <footer className="mt-16 border-t border-border bg-sidebar">
        {/* ── Top section ── */}
        <div className="px-6 py-10">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
            {/* Brand column */}
            <div className="space-y-4">
              <Link
                to="/"
                className="inline-flex items-center hover:opacity-80 transition-opacity"
              >
                <img
                  src="/logo(light).png"
                  alt="Kebo"
                  className="h-10 w-auto object-contain dark:hidden"
                />
                <img
                  src="/logo(dark).png"
                  alt="Kebo"
                  className="h-10 w-auto object-contain hidden dark:block"
                />
              </Link>

              <p className="text-sm text-muted-foreground leading-relaxed max-w-[220px]">
                {t("footer.description")}
              </p>

              <a
                href="https://discord.com/invite/BkD5qKG8Z"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                {t("footer.discord")}
              </a>
            </div>

            {/* Service column */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t("footer.services")}
              </p>
              <ul className="space-y-2.5">
                {serviceLinks.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal column */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t("footer.policies")}
              </p>
              <ul className="space-y-2.5">
                {legalLinks.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={link.onClick}
                      disabled={!link.onClick}
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:cursor-default disabled:opacity-60"
                    >
                      {link.icon}
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="border-t border-border px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Kebo. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>한국어 / 日本語 / English</span>
              <span>·</span>
              <span>v0.9.1</span>
            </div>
          </div>
        </div>
      </footer>

      {privacyOpen && <PrivacyModal onClose={() => setPrivacyOpen(false)} />}
    </>
  );
}
