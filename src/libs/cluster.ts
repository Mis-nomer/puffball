import { Cluster } from "puppeteer-cluster";
import logger from "./logger";
import { mt } from "./utils";
import { scraper } from "./scrape";
import { instructionParser } from "./scrape";

export const concurrentCluster = async () => {
  try {
    const cluster = await Cluster.launch({
      concurrency: Cluster.CONCURRENCY_BROWSER,
      maxConcurrency: 2,
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
      await cluster.queue({ configs, site });
    }
    await cluster.idle();
    await cluster.close();
  } catch (error) {
    logger.error((error as Error)?.message);
    throw error;
  }
};
