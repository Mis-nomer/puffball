import fs from "fs";
import util from "util";
import path from "path";
import { DateTime } from "luxon";
import axios, { AxiosError } from "axios";
import { mt } from "../utils";
import logger from "../logger";
import { Suite, Gists, GistFile } from "../../common/type";

const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const unlink = util.promisify(fs.unlink);

const defaultHeaders = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${process.env.GIT_TOKEN}`,
  "X-GitHub-Api-Version": "2022-11-28",
};

class GistSuite
  implements Suite<boolean, Pick<GistFile, "filename" | "raw_url">[]>
{
  dir = path.resolve(process.cwd(), "logs");

  private headers = defaultHeaders;

  constructor(headers?: NonNullable<any>, dir?: string) {
    if (!mt.obj(headers)) this.headers = headers;
    if (dir) this.dir = dir;
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

  async get(): Promise<Pick<GistFile, "filename" | "raw_url">[] | undefined> {
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
}

export default GistSuite;
