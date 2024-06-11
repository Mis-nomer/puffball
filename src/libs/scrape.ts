import {
  createWriteStream,
  readdirSync,
  readFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { join } from "node:path";
import scrapeIt from "scrape-it";
import { ISiteConfig, IScrapeResult } from "../common/type";
import { mt, strOps, nowTS } from "./utils";
import logger from "./logger";
const scrapper = async (configs: ISiteConfig, siteName: string) => {
  const { url, filter, format, instructions } = configs;
  const dir = "./logs";

  if (!existsSync(dir)) mkdirSync(dir);

  const fileName = `${dir}/${siteName}_${nowTS()}.log`;
  const stream = createWriteStream(fileName, { flags: "a" });

  let operationResult = false;

  try {
    if (mt.str(url)) throw new Error("URL must be a string!");
    const { data } = await scrapeIt<IScrapeResult>(url, instructions);

    if (data.content?.length) {
      const filteredContent = data.content.filter((content) => {
        for (let key in filter) {
          let regex = new RegExp(filter[key].join("|"), "i");
          if (regex.test(strOps.plain(content[key]))) {
            return false;
          }
        }
        return true;
      });

      filteredContent.forEach((content) => {
        stream.write(strOps.literal(format, content));
      });
    }

    logger.info("\nData written into " + fileName);
    operationResult = true;
  } catch (error) {
    logger.error((error as Error)?.message);
  } finally {
    stream.end();
  }

  return operationResult;
};

export const scrapeSite = async () => {
  const siteFiles = readdirSync("./sites");
  const scrapeResult = {
    total: siteFiles.length,
    succeed: 0,
    failed: 0,
  };

  for (const file of siteFiles) {
    try {
      const filePath = join("./sites", file);
      const siteConfig = JSON.parse(readFileSync(filePath, "utf-8"));
      const siteName = file.split(".")[0]; // get the filename without extension
      const res = await scrapper(siteConfig, siteName);

      res ? scrapeResult.succeed++ : scrapeResult.failed++;
    } catch (error) {
      logger.error((error as Error)?.message);
    }
  }

  return scrapeResult;
};
