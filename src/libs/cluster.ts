import { DateTime } from "luxon";
import { Cluster } from "puppeteer-cluster";

import { mt } from "./utils";
import { scraper, instructionParser } from "./scrape";
import logger from "./logger";

export const concurrentCluster = async () => {
  const taskStart = DateTime.now();

  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_BROWSER,
    maxConcurrency: 3,
    retryDelay: 60 * 1000,
    retryLimit: 3,
  });

  await cluster.task(scraper);

  // Load instructions from ./sites/*.json
  const instructions = await instructionParser();

  if (mt.obj(instructions)) {
    logger.error("[libs/scrape.ts] - Unable to retrieve instructions");
    return;
  }

  for (const [site, configs] of Object.entries(instructions)) {
    if (mt.str(site) || mt.obj(configs)) {
      logger.error("[libs/scrape.ts] - Bad instructions format");
      return;
    }
    // Queue each site with its corresponding configs
    cluster.queue({ configs, site });
  }

  await cluster.idle();

  try {
    await cluster.close();
    const timeTaken = DateTime.now().diff(taskStart).toObject().milliseconds;
    logger.info(`Task took ${timeTaken}ms (${timeTaken! / 1000}s)`);
  } catch (error) {
    logger.error((error as Error)?.message);
    throw error;
  }
};
