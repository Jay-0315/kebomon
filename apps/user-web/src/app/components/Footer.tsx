import { useState } from "react";
import { Link } from "react-router";
import { Globe, Mail, Shield, FileText, BookOpen } from "lucide-react";
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
    { to: "/kebomon", label: t("nav.kebomon") },
    { to: "/attendance", label: t("nav.attendance") },
    { to: "/live", label: t("nav.live") },
    { to: "/raid", label: t("nav.raid") },
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
                className="inline-flex items-center gap-2.5 hover:opacity-80 transition-opacity"
              >
                <div className="w-8 h-8 bg-primary rounded flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-foreground">Kebo</span>
              </Link>

              <p className="text-sm text-muted-foreground leading-relaxed max-w-[220px]">
                {t("footer.description")}
              </p>

              <a
                href="mailto:support@kebo.app"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                support@kebo.app
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
              <span>한국어 / 日本語</span>
              <span>·</span>
              <span>v0.1.0</span>
            </div>
          </div>
        </div>
      </footer>

      {privacyOpen && <PrivacyModal onClose={() => setPrivacyOpen(false)} />}
    </>
  );
}
