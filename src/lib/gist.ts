import axios, { AxiosError } from "axios";
import { DateTime } from "luxon";
import { Gists, File } from "../common/type";
import { mt } from "./utils";
import logger from "./logger";
import fs from "fs";
import util from "util";
import path from "path";

const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const unlink = util.promisify(fs.unlink);

class Gist {
  dir = path.resolve(process.cwd(), "logs");
  headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${process.env.GIT_TOKEN}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };

  constructor(
    newDir?: string | undefined,
    newHeaders?: Record<string, string> | undefined
  ) {
    if (newDir) this.dir = newDir;
    if (!mt.obj(newHeaders)) this.headers = newHeaders!;
  }

  async get(): Promise<Pick<File, "filename" | "raw_url">[] | undefined> {
    try {
      const response = await axios.get<Gists>("https://api.github.com/gists", {
        headers: this.headers,
        params: {
          since: DateTime.now().startOf("day").toISO(),
        },
      });

      const gists = response.data;
      const files = gists.map((gist) => Object.values(gist.files)[0]);

      if (mt.arr(files)) {
        logger.warn("No gist found!");
        return files;
      }

      const result = files.map(({ filename, raw_url }) => ({
        filename,
        raw_url,
      }));

      return result;
    } catch (error) {
      logger.error(`Error: ${(error as AxiosError)?.message}`);
      return;
    }
  }

  async create(): Promise<boolean> {
    try {
      const files = await readdir(this.dir);

      for (const file of files) {
        const filePath = path.join(this.dir, file);
        const content = await readFile(filePath, "utf8");

        const response = await axios.post(
          "https://api.github.com/gists",
          {
            description: `Auto-generated gist on: ${DateTime.now().toLocaleString(
              DateTime.DATETIME_SHORT_WITH_SECONDS
            )}`,
            public: false,
            files: {
              [file]: {
                content,
              },
            },
          },
          {
            headers: this.headers,
          }
        );

        logger.info(
          `\nGist ${file} created: `,
          response?.data?.files[file]?.raw_url
        );
        await unlink(filePath);
      }

      return true;
    } catch (error) {
      logger.error((error as AxiosError)?.message);
      return false;
    }
  }
}

export default new Gist();
