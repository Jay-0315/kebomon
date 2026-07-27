import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../lib/api";
import { useLang } from "../context/LangContext";

type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
};

type UsersResponse = {
  users: AdminUserRow[];
  total: number;
};

export default function AdminAccountsPage() {
  const { t } = useLang();
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.get<UsersResponse>("/admin/users?role=ADMIN&sortBy=createdAt&sortDir=asc");
      setUsers(res.users);
    } catch {
      setError(t("common.error_load"));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRevoke(user: AdminUserRow) {
    if (!window.confirm(t("adminAccounts.confirm_revoke", { email: user.email }))) return;
    try {
      await api.patch(`/admin/users/${user.id}/role`, { role: "USER" });
      load();
    } catch {
      window.alert(t("users.error_role_change"));
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold">{t("adminAccounts.title")}</h1>
      <p className="mb-4 text-sm text-[var(--fg-faint)]">{t("adminAccounts.subtitle")}</p>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-soft)] text-[var(--fg-muted)]">
            <tr>
              <th className="px-3 py-2">{t("users.col_name")}</th>
              <th className="px-3 py-2">{t("users.col_email")}</th>
              <th className="px-3 py-2">{t("users.col_created")}</th>
              <th className="px-3 py-2">{t("users.col_last_login")}</th>
              <th className="px-3 py-2">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2">
                  <Link to={`/users/${u.id}`} className="text-[#b7607e] hover:underline">
                    {u.name}
                  </Link>
                </td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2 text-[var(--fg-muted)]">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-3 py-2 whitespace-nowrap text-[var(--fg-muted)]">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "-"}
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => handleRevoke(u)}
                    className="rounded border border-red-500/30 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                  >
                    {t("users.demote")}
                  </button>
                </td>
              </tr>
            ))}
            {users?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-[var(--fg-faint)]">
                  {t("adminAccounts.no_admins")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
