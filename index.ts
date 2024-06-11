import "dotenv/config";
import { CronJob, CronJobParams } from "cron";
import Gist from "./src/lib/gist";
import { scrapeSite } from "./src/lib/scrape";

async function main() {
  console.log("\nMain job starting...");

  scrapeSite().then(async (data) => {
    console.log("\nScrape result: " + JSON.stringify(data));

    const successChance = parseFloat((data.succeed / data.total).toFixed(2));

    if (successChance <= +(process.env.ABORT_ON || 0)) {
      console.log("Not enough content, gist aborted");
      return;
    }
    await Gist.create();
  });
}

const defaultSettings: Partial<CronJobParams> = {
  timeZone: "Asia/Ho_Chi_Minh",
  start: true,
};

const fallbackJob = CronJob.from({
  ...defaultSettings,
  cronTime: "* 30 * * * *",
  runOnInit: true,
  onTick: async () => {
    console.log("\nFallback job starting...");
    const gistFiles = await Gist.get();

    if (!gistFiles || !gistFiles?.length) {
      console.log("\nFallback job starting...");
      await main();
    }
  },
});

CronJob.from({
  ...defaultSettings,
  cronTime: "* 0 8 * * *",
  onTick: main,
  onComplete: () => fallbackJob.stop(),
});
