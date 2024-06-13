import fs from "node:fs";
import path from "node:path";
import { Page } from "puppeteer";
import { newInjectedPage } from "fingerprint-injector";

import { ScrapeInstruction } from "../common/type";
import { nowTS, strOps } from "./utils";
import logger from "./logger";

// Store scraped data
const store = (
  siteName: string,
  data: string,
  dir = path.resolve(process.cwd(), "temp")
) => {
  const fileName = path.join(dir, `${siteName}_${nowTS()}.log`);
  const stream = fs.createWriteStream(fileName, { flags: "a" });
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    stream.write(data);
  } catch (error) {
    logger.error((error as Error)?.message);
  }
  stream.end();
};

// Main scraper function
export const scraper = async ({
  page: oldPage,
  data,
}: {
  page: Page;
  data: { configs: ScrapeInstruction; site: string };
}) => {
  const { configs, site } = data;

  // This masks the bot's fingerprints
  const page = await newInjectedPage(oldPage.browser());

  // Log requests and responses
  page.on("request", (request) => logger.debug(request.url()));
  page.on("response", (response) => logger.debug(response.url()));

  try {
    await page.goto(configs.url);
  } catch (error) {
    logger.error(`Failed to navigate to ${configs.url}`);
    return;
  }

  // Scrape the target list or parent element that contains multiple similar children
  const listHandle = await page.$$(configs.html.list);

  const scrapeData = await Promise.all(
    listHandle.map((item) =>
      page.evaluate(
        (configs, item) => {
          let parseData: Record<string, any> = {};

          // Extract the required data from each item
          for (const [field, { selector, attr }] of Object.entries(
            configs.html.data
          )) {
            const element = item.querySelector(selector!);
            if (!element) continue;
            parseData[field] = attr
              ? element.getAttribute(attr)?.trim()
              : element.textContent?.trim();
          }

          return parseData;
        },
        configs,
        item
      )
    )
  );

  // Filter the scraped data based on the provided filter rules
  const filteredData = scrapeData.filter((data) => {
    for (let key in configs.filter) {
      let regex = new RegExp(configs.filter[key].join("|"), "i");
      if (regex.test(strOps.plain(data[key]))) return false;
    }
    return true;
  });

  // Store the filtered data
  filteredData.forEach((data) =>
    store(site, strOps.literal(configs.format, data))
  );

  await page.close();
};

export const instructionParser = async (
  dir = path.resolve(process.cwd(), "sites")
) => {
  const templates = fs.readdirSync(dir);
  const processResult = { total: templates.length, success: 0, failure: 0 };

  // Parse each template and generate the scraping instructions
  const instructions = templates.reduce((prev, template) => {
    try {
      const filePath = path.join(dir, template);
      const configs = JSON.parse(
        fs.readFileSync(filePath, "utf-8")
      ) as ScrapeInstruction;
      const site = template.split(".")[0]; // get the filename without extension

      prev[site] = configs;
      processResult.success++;
    } catch (error) {
      logger.error((error as Error)?.message);
      processResult.failure++;
    } finally {
      return prev;
    }
  }, {} as Record<string, ScrapeInstruction>);

  logger.debug("\nGenerate instructions result: " + processResult);

  return instructions;
};
