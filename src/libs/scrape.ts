import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { Page } from "puppeteer";
import { faker } from "@faker-js/faker";
import path from "path";
import fs from "fs";
import logger from "./logger";
import { ScrapeInstruction } from "../common/type";
import { nowTS, strOps } from "./utils";
const store = (
  siteName: string,
  data: string,
  dir = path.resolve(process.cwd(), "temp")
) => {
  const fileName = `${dir}/${siteName}_${nowTS()}.log`;
  const stream = createWriteStream(fileName, { flags: "a" });
  try {
    if (!existsSync(dir)) mkdirSync(dir);

    stream.write(data);
  } catch (error) {
    logger.error((error as Error)?.message);
  }
  stream.end();
};

const requestHeaders = {
  authority: "www.google.com",
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "max-age=0",
  "sec-ch-ua-arch": '"x86"',
  "sec-ch-ua-bitness": '"64"',
  "sec-ch-ua-full-version": '"120.0.0.0"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-wow64": "?0",
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "same-origin",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1",
};

export const scraper = async ({
  page,
  data,
}: {
  page: Page;
  data: { configs: ScrapeInstruction; site: string };
}) => {
  const randomUA = faker.internet.userAgent();
  const { configs, site } = data;

  await page.setUserAgent(randomUA);
  await page.setExtraHTTPHeaders({
    ...requestHeaders,
  });

  page.on("request", (request) => {
    logger.debug(request.url());
  });

  page.on("response", (response) => {
    logger.debug(response.url());
  });

  // page.on("console", (msg) => {
  //   const type = msg.type();
  //   if (type === "error") {
  //     logger.error(msg.text());
  //   }
  // });

  await page.goto(configs.url);

  //! Scraper only target list or parent element that contain multiple similiar children
  const listHandle = await page.$$(configs.html.list);
  const scrapeData = [];

  for (const item of listHandle) {
    const rawData = await page.evaluate(
      (configs, item) => {
        let parseData: Record<string, any> = {};

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
    );

    scrapeData.push(rawData);
  }

  const filteredData = scrapeData.filter((data) => {
    for (let key in configs.filter) {
      let regex = new RegExp(configs.filter[key].join("|"), "i");

      if (regex.test(strOps.plain(data[key]))) return false;
    }
    return true;
  });

  filteredData.forEach((data) =>
    store(site, strOps.literal(configs.format, data))
  );
};

export const instructionParser = async (
  dir = path.resolve(process.cwd(), "sites")
) => {
  const templates = fs.readdirSync(dir);
  const processResult = {
    total: templates.length,
    success: 0,
    failure: 0,
  };

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
