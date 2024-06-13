import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const DEFAULT_LOGS = ["debug", "error", "main"];
const LOG_DIR = path.join(process.cwd(), "logs");

if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR);

function createDailyRotateFile(...levels: string[]) {
  return levels.map((level) => {
    return new DailyRotateFile({
      filename: path.join(LOG_DIR, `${level}-%DATE%.log`),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "3d",
      dirname: LOG_DIR,
      level,
    });
  });
}

const logger = createLogger({
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  ...(process.env.NODE_ENV === "production" && {
    transports: createDailyRotateFile(...DEFAULT_LOGS),
  }),
});

// If we're not in production then log to the `console`
if (process.env.NODE_ENV === "development" || Boolean(process.env.PM2_ON)) {
  logger.add(
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    })
  );
}

export default logger;
