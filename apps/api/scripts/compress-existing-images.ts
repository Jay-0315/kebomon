/**
 * 이미 DB에 저장된 base64 이미지(프로필 사진, 게시글/댓글 첨부)를 리사이즈 + 압축해서
 * 용량을 줄이는 1회성 마이그레이션 스크립트.
 *
 * 새로 업로드되는 이미지는 프론트(lib/image.ts)에서 이미 압축되지만, 이 스크립트를
 * 돌리기 전에 이미 저장돼있던 원본 사진들은 그대로 크기 때문에 별도로 처리가 필요하다.
 *
 * 기본은 dry-run(조회만, DB에 아무것도 안 씀)이고, --apply를 줘야 실제로 저장한다.
 * 프로덕션 DB에 직접 쓰는 작업이니 먼저 dry-run으로 결과를 확인하고, 가능하면 DB
 * 백업을 받아둔 뒤 --apply로 실행할 것.
 *
 * 실행 예:
 *   npx tsx scripts/compress-existing-images.ts            # dry-run
 *   npx tsx scripts/compress-existing-images.ts --apply     # 실제 반영
 */
import { PrismaClient } from "@prisma/client";
import { Jimp } from "jimp";

const prisma = new PrismaClient();

const MAX_SIZE = 256;
const QUALITY = 82;
// 이미 이 크기보다 작으면 재인코딩으로 인한 화질 손실을 피하기 위해 건드리지 않음
const SKIP_IF_UNDER_BYTES = 30 * 1024;

const APPLY = process.argv.includes("--apply");

function fmtKB(bytes: number): string {
  return `${(bytes / 1024).toFixed(0)}KB`;
}

/** data URL을 리사이즈+압축한 새 data URL로 변환. 압축할 필요/여지가 없으면 null */
async function compressDataUrl(dataUrl: string): Promise<string | null> {
  const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) return null; // base64 데이터 URL이 아님 (이미 외부 URL 등)
  if (dataUrl.length < SKIP_IF_UNDER_BYTES) return null; // 이미 충분히 작음

  try {
    const buffer = Buffer.from(match[2], "base64");
    const image = await Jimp.read(buffer);
    const scale = Math.min(1, MAX_SIZE / Math.max(image.width, image.height));
    if (scale < 1) {
      image.resize({ w: Math.round(image.width * scale), h: Math.round(image.height * scale) });
    }
    const outBuffer = await image.getBuffer("image/jpeg", { quality: QUALITY });
    const newDataUrl = `data:image/jpeg;base64,${outBuffer.toString("base64")}`;
    // 압축 결과가 오히려 더 크면(이미 작은 저해상도 이미지 등) 원본 유지
    return newDataUrl.length < dataUrl.length ? newDataUrl : null;
  } catch (err) {
    console.error("  ! 이미지 처리 실패:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function migrateField<T extends { id: string | bigint }>(
  label: string,
  rows: (T & Record<string, unknown>)[],
  fieldName: string,
  update: (id: T["id"], value: string) => Promise<unknown>,
) {
  console.log(`\n=== ${label}: 대상 ${rows.length}건 ===`);
  let changed = 0;
  let skipped = 0;
  let totalBefore = 0;
  let totalAfter = 0;

  for (const row of rows) {
    const value = row[fieldName] as string | null;
    if (!value) continue;
    const compressed = await compressDataUrl(value);
    if (!compressed) {
      skipped++;
      continue;
    }
    totalBefore += value.length;
    totalAfter += compressed.length;
    console.log(`  ${row.id}: ${fmtKB(value.length)} → ${fmtKB(compressed.length)}`);
    if (APPLY) await update(row.id, compressed);
    changed++;
  }

  console.log(
    `${label}: ${changed}건 압축${APPLY ? " 완료" : " 대상(dry-run)"}, ${skipped}건 스킵` +
      (changed > 0 ? ` · ${fmtKB(totalBefore)} → ${fmtKB(totalAfter)}` : ""),
  );
}

async function main() {
  console.log(APPLY ? ">>> APPLY 모드 — 실제로 DB에 반영합니다." : ">>> DRY-RUN 모드 — DB에는 아무것도 쓰지 않습니다 (--apply로 실제 반영).");

  const users = await prisma.user.findMany({
    where: { profilePhoto: { not: null } },
    select: { id: true, profilePhoto: true },
  });
  await migrateField("유저 프로필 사진", users, "profilePhoto", (id, value) =>
    prisma.user.update({ where: { id: id as string }, data: { profilePhoto: value } }),
  );

  const posts = await prisma.communityPost.findMany({
    where: { imageUrl: { not: null } },
    select: { id: true, imageUrl: true },
  });
  await migrateField("게시글 첨부 이미지", posts, "imageUrl", (id, value) =>
    prisma.communityPost.update({ where: { id: id as string }, data: { imageUrl: value } }),
  );

  const comments = await prisma.comment.findMany({
    where: { imageUrl: { not: null } },
    select: { id: true, imageUrl: true },
  });
  await migrateField("댓글 첨부 이미지", comments, "imageUrl", (id, value) =>
    prisma.comment.update({ where: { id: id as bigint }, data: { imageUrl: value } }),
  );

  if (!APPLY) {
    console.log("\ndry-run이 끝났습니다. 결과가 괜찮으면 --apply를 붙여 다시 실행하세요.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
