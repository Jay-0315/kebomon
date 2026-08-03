import { useLang } from "../context/LangContext";
import Modal from "./Modal";

export type PostDetail = {
  id: string;
  content: string;
  category: string;
  imageUrl: string | null;
  likesCount: number;
  createdAt: string;
  author: { id: string; name: string; email: string } | null;
};

export default function PostDetailModal({
  post,
  onClose,
}: {
  post: PostDetail;
  onClose: () => void;
}) {
  const { t } = useLang();
  return (
    <Modal onClose={onClose} maxWidth="lg" scrollable closeOnBackdrop>
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">
              {post.author?.name ?? "-"}
              <span className="ml-2 text-xs font-normal text-[var(--fg-faint)]">
                {post.author?.email}
              </span>
            </h2>
            <p className="mt-1 text-xs text-[var(--fg-faint)]">
              {post.category} · {t("community.col_likes")} {post.likesCount} ·{" "}
              {new Date(post.createdAt).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--bg-hover)]"
          >
            {t("common.close")}
          </button>
        </div>

        <div
          className="mb-4 break-words text-sm leading-relaxed text-[var(--fg)] [&_a]:underline [&_p]:mb-2"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt=""
            className="max-h-[50vh] w-full rounded-lg border border-[var(--border)] object-contain"
          />
        )}
    </Modal>
  );
}
