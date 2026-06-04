export type PostCategory = "자랑" | "공략" | "잡담";
export const POST_CATEGORY_OPTIONS: PostCategory[] = ["자랑", "공략", "잡담"];

const KEY = "kebo-post-categories";

export function loadPostCategories(): Record<string, PostCategory> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, PostCategory>;
  } catch {
    return {};
  }
}

export function savePostCategory(postId: string, category: PostCategory) {
  const map = loadPostCategories();
  map[postId] = category;
  localStorage.setItem(KEY, JSON.stringify(map));
}
