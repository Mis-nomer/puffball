import "dotenv/config";
import { CronJob, CronJobParams, CronTime } from "cron";
import { DateTime, Settings, IANAZone } from "luxon";

import { concurrentCluster } from "./src/libs/cluster";
import logger from "./src/libs/logger";
import Gist from "./src/libs/suite/gist";
import { mt } from "./src/libs/utils";

const STORE = new Gist();
const TZ = new IANAZone(process.env.TZ || "Asia/Ho_Chi_Minh");

Settings.defaultZone = TZ.isValid ? TZ.name : "system";

async function main(): Promise<boolean> {
  logger.info("\nMain job starting...");

  await concurrentCluster();

  return await STORE.create();
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
    logger.info("Task starting...");

    const gists = await STORE.get();
    const isTodayGistEmpty = mt.arr(gists);
    const reschedule = isTodayGistEmpty && (await main());

    mainJob.setTime(new CronTime(reschedule ? "0 30 * * * *" : "0 0 8 * * *"));

    logger.info(
      `Task rescheduled to ${mainJob
        .nextDate()
        .toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)}`
    );
  },
  onComplete: () => {
    logger.info(
      `Task ran on ${DateTime.fromJSDate(
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
