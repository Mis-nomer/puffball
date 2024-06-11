import axios, { AxiosError } from "axios";
import { Gists, File } from "../common/type";
import { DateTime } from "luxon";
import fs from "fs";
import util from "util";
import path from "path";
import { mt } from "./utils";

const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const unlink = util.promisify(fs.unlink);

class Gist {
  //! Doesn't work in development
  dir = path.resolve(__dirname, "logs");
  headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${process.env.GIT_TOKEN}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  date = DateTime.now().startOf("day").toISO();

  constructor(
    newDir?: string | undefined,
    newHeaders?: Record<string, string> | undefined,
    newDate?: string | undefined
  ) {
    if (newDir) this.dir = newDir;
    if (!mt.obj(newHeaders)) this.headers = newHeaders!;
    if (newDate) this.date = newDate;
  }

  async get(): Promise<Pick<File, "filename" | "raw_url">[] | undefined> {
    try {
      const response = await axios.get<Gists>("https://api.github.com/gists", {
        headers: this.headers,
        params: {
          since: this.date,
        },
      });

      const gists = response.data;
      const files = gists.map((gist) => gist.files[0]);

      if (!files) {
        console.log("No gist found!");
        return;
      }

      const result = files.map(({ filename, raw_url }) => ({
        filename,
        raw_url,
      }));

      return result;
    } catch (error) {
      console.error(`Error: ${(error as AxiosError)?.message}`);
      throw error;
    }
  }

  async create(): Promise<void> {
    try {
      const files = await readdir(this.dir);

      for (const file of files) {
        const filePath = path.join(this.dir, file);
        const content = await readFile(filePath, "utf8");

        const response = await axios.post(
          "https://api.github.com/gists",
          {
            description: "Auto-generated gist",
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

        console.log(
          `\nGist ${file} created successfully at:\n`,
          response?.data?.files[file]?.raw_url
        );
        await unlink(filePath);
      }
    } catch (error) {
      console.error(`Error: ${(error as AxiosError)?.message}`);
      throw error;
    }
  }
}

export default new Gist();
