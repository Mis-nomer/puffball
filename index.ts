import {
  createWriteStream,
  readdirSync,
  readFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { join } from "node:path";
import scrapeIt from "scrape-it";
import { CronJob, CronJobParams } from "cron";
import { ISiteConfig, IScrapeResult } from "./src/common/type";
import { is, strOps, nowTS } from "./src/utils";
import Gist from "./src/gist";

const scrapper = async (configs: ISiteConfig, siteName: string) => {
  const { url, filter, format, scrapeContent } = configs;
  const dir = "./logs";

  if (!existsSync(dir)) mkdirSync(dir);

  const fileName = `${dir}/${siteName}_${nowTS()}.txt`;
  const stream = createWriteStream(fileName, { flags: "a" });

  let operationResult = false;

  try {
    if (is.mt(url, "string")) throw new Error("URL must be a string!");
    const { data } = await scrapeIt<IScrapeResult>(url, scrapeContent);

    if (data.content?.length) {
      const filteredResult = data.content.filter((content) => {
        for (let key in filter) {
          let regex = new RegExp(filter[key].join("|"), "i");
          if (regex.test(strOps.plain(content[key]))) {
            return false;
          }
        }
        return true;
      });

      filteredResult.forEach((result) => {
        stream.write(strOps.literal(format, result));
      });
    }

    console.log("\nData written into " + fileName);
    operationResult = true;
  } catch (error) {
    console.log((error as Error)?.message);
  } finally {
    stream.end();
  }

  return operationResult;
};

const scrapeSite = async () => {
  const siteFiles = readdirSync("./sites");
  const scrapeResult = {
    total: siteFiles.length,
    succeed: 0,
    failed: 0,
  };
  for (const file of siteFiles) {
    const filePath = join("./sites", file);
    const siteConfig = JSON.parse(readFileSync(filePath, "utf-8"));
    const siteName = file.split(".")[0]; // get the filename without extension
    const res = await scrapper(siteConfig, siteName);

    res ? scrapeResult.succeed++ : scrapeResult.failed++;
  }

  return scrapeResult;
};

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

    //? For better checking in the future
    // gistFiles.forEach(async (file) => {
    //   if (file) {
    //     const parts = file!.filename.split("_");
    //     const datePart = parts[parts.length - 1];

    //     if (nowTS() !== datePart) {
    //       console.log("\nRestarting main job...");
    //       await main();
    //     }
    //   }
    // });
    if (!gistFiles || !gistFiles?.length) {
      console.log("\nFallback job starting...");
      await main();
    }
  },
});

const mainjob = CronJob.from({
  ...defaultSettings,
  cronTime: "* 0 8 * * *",
  onTick: main,
  onComplete: () => fallbackJob.stop(),
});
