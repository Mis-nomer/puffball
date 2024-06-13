import fs, { existsSync, mkdirSync } from "fs";
import util from "util";
import path from "path";
import { DateTime } from "luxon";
import axios, { AxiosError } from "axios";
import { mt, nowTS } from "../utils";
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
  dir = path.resolve(process.cwd(), "temp");
  private headers = defaultHeaders;

  constructor(dir?: string, headers?: NonNullable<any>) {
    if (!mt.str(dir)) this.dir = path.resolve(process.cwd(), dir!);
    if (!mt.obj(headers)) this.headers = headers;
    if (!existsSync(this.dir)) mkdirSync(this.dir);
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
          `\nGist ${file} created: ${response?.data?.files[file]?.raw_url}`
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

      const filteredFiles = files.filter((file) => {
        const regexp = new RegExp(nowTS(), "gi");
        return regexp.test(file.filename);
      });

      if (mt.arr(files)) {
        logger.warn("No gist found!");
        return;
      } else {
        logger.info(
          `Found ${filteredFiles.length} gists. Main task rescheduling...`
        );
        return filteredFiles;
      }
    } catch (error) {
      logger.error(`Error: ${(error as AxiosError)?.message}`);
      return;
    }
  }
}

export default GistSuite;
