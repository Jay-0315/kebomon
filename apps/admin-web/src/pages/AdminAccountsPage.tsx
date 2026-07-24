import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../lib/api";

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
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.get<UsersResponse>("/admin/users?role=ADMIN&sortBy=createdAt&sortDir=asc");
      setUsers(res.users);
    } catch {
      setError("목록을 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRevoke(user: AdminUserRow) {
    if (!window.confirm(`${user.email}의 관리자 권한을 해제할까요?`)) return;
    try {
      await api.patch(`/admin/users/${user.id}/role`, { role: "USER" });
      load();
    } catch {
      window.alert("권한 변경에 실패했습니다.");
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold">관리자 계정</h1>
      <p className="mb-4 text-sm text-[var(--fg-faint)]">
        현재 ADMIN 권한을 보유한 계정 전체 목록입니다.
      </p>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-soft)] text-[var(--fg-muted)]">
            <tr>
              <th className="px-3 py-2">이름</th>
              <th className="px-3 py-2">이메일</th>
              <th className="px-3 py-2">가입일</th>
              <th className="px-3 py-2">최근 접속</th>
              <th className="px-3 py-2">액션</th>
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
                    관리자 해제
                  </button>
                </td>
              </tr>
            ))}
            {users?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-[var(--fg-faint)]">
                  관리자 계정이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
