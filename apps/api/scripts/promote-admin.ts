/**
 * 최초 관리자 계정을 지정하기 위한 CLI 스크립트.
 * 이후 추가 관리자 임명은 관리자 페이지(회원 관리)에서 처리하므로, 이 스크립트는
 * 최초 1명을 ADMIN으로 올릴 때만 쓰면 된다.
 *
 * 실행 예:
 *   npx tsx scripts/promote-admin.ts user@example.com            # ADMIN으로 승격
 *   npx tsx scripts/promote-admin.ts user@example.com --revoke   # USER로 되돌림
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const email = process.argv[2];
const REVOKE = process.argv.includes("--revoke");

async function main() {
  if (!email) {
    console.error("사용법: npx tsx scripts/promote-admin.ts <email> [--revoke]");
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`이메일 ${email}에 해당하는 사용자를 찾을 수 없습니다.`);
    process.exitCode = 1;
    return;
  }

  const role = REVOKE ? "USER" : "ADMIN";
  if (user.role === role) {
    console.log(`${email}은(는) 이미 role=${role} 입니다.`);
    return;
  }

  await prisma.user.update({ where: { email }, data: { role } });
  console.log(`${email}: role ${user.role} → ${role} 변경 완료`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
