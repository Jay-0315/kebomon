import type { Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type CronWindowUnit = "minute" | "hour" | "day" | "week" | "month";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function cronWindowKey(date = new Date(), unit: CronWindowUnit = "minute") {
  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  const h = pad(date.getUTCHours());
  const min = pad(date.getUTCMinutes());
  if (unit === "minute") return `${y}${m}${d}${h}${min}`;
  if (unit === "hour") return `${y}${m}${d}${h}`;
  if (unit === "day") return `${y}${m}${d}`;
  if (unit === "month") return `${y}${m}`;

  const weekDate = new Date(Date.UTC(y, date.getUTCMonth(), date.getUTCDate()));
  const day = weekDate.getUTCDay() || 7;
  weekDate.setUTCDate(weekDate.getUTCDate() + 4 - day);
  const weekYear = weekDate.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const week = Math.ceil(((weekDate.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${weekYear}W${pad(week)}`;
}

export async function runSingletonCron<T>(
  prisma: PrismaService,
  logger: Pick<Logger, "log" | "warn" | "error">,
  jobKey: string,
  windowKey: string,
  task: () => Promise<T>,
): Promise<T | null> {
  let executionId: bigint | null = null;
  try {
    const execution = await prisma.jobExecution.create({ data: { jobKey, windowKey } });
    executionId = execution.id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      logger.warn(`${jobKey} skipped: already claimed for ${windowKey}`);
      return null;
    }
    throw err;
  }

  try {
    const result = await task();
    await prisma.jobExecution.update({
      where: { id: executionId },
      data: { status: "SUCCESS", finishedAt: new Date() },
    });
    return result;
  } catch (err) {
    await prisma.jobExecution
      .update({
        where: { id: executionId },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          errorMessage: err instanceof Error ? err.message.slice(0, 500) : String(err).slice(0, 500),
        },
      })
      .catch(() => undefined);
    throw err;
  }
}
