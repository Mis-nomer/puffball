import "dotenv/config";
import { CronJob, CronJobParams, CronTime } from "cron";
import { scrapeSite } from "./src/lib/scrape";
import logger from "./src/lib/logger";
import Gist from "./src/lib/gist";
import { mt } from "./src/lib/utils";
import { DateTime, Settings, IANAZone } from "luxon";

const TZ = new IANAZone(process.env.TZ || "Asia/Ho_Chi_Minh");

Settings.defaultZone = TZ.isValid ? TZ.name : "system";

async function main(): Promise<boolean> {
  logger.info("\nMain job starting...");

  const scrapeResult = await scrapeSite();
  const successChance = parseFloat(
    (scrapeResult.succeed / scrapeResult.total).toFixed(2)
  );

  if (successChance <= +(process.env.ABORT_ON || 0)) {
    logger.warn("Not enough content, gist creation aborted");
    return false;
  }

  return await Gist.create();
}

const defaultSettings: Partial<CronJobParams> = {
  timeZone: "Asia/Ho_Chi_Minh",
  start: true,
};

const mainJob = CronJob.from({
  ...defaultSettings,
  cronTime: "0 30 * * * *",
  runOnInit: true,
  start: true,
  onTick: async () => {
    logger.info("\nMain task starting...");

    const isTodayGistEmpty = mt.arr(await Gist.get());
    const reschedule = isTodayGistEmpty && (await main());

    mainJob.setTime(new CronTime(reschedule ? "0 30 * * * *" : "0 0 8 * * *"));

    logger.info(
      `\nTask rescheduled to ${mainJob
        .nextDate()
        .toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)}`
    );
  },
  onComplete: () => {
    //@ts-ignore
    logger.info(
      `\nMain task ran on ${DateTime.fromJSDate(
        mainJob.lastExecution || new Date()
      ).toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)}`
    );
  },
});

process
  .on("unhandledRejection", (reason, p) => {
    logger.error(reason + "\nUnhandled Rejection at Promise", p);
    process.exit(1);
  })
  .on("uncaughtException", (err) => {
    logger.error(err?.message + "\nUncaught Exception thrown");
    process.exit(1);
  });
