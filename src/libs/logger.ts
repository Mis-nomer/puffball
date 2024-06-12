import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "logs");
if (!existsSync(dir)) mkdirSync(dir);

function createDailyRotateFile(level: string) {
  return new DailyRotateFile({
    dirname: "logs",
    filename: `${level}-%DATE%.log`,
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "14d",
    level: level,
  });
}

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  transports: [
    ...(process.env.NODE_ENV === "production"
      ? [
          createDailyRotateFile("error"),
          createDailyRotateFile("debug"),
          createDailyRotateFile("combined"),
        ]
      : []),
  ],
});

if (process.env.NODE_ENV !== "production" || !Boolean(process.env.PM2_ON)) {
  logger.add(
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    })
  );
}

export default logger;
