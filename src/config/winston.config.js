const appRoot = require("app-root-path");
const winstonConfig = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const { createLogger, format, transports } = winstonConfig;
const { combine, timestamp, label, printf } = format;

const myFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`;
});

const options = {
  rotate_file: {
    filename: `${appRoot}/logs/%DATE%.log`,
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    handleExceptions: true,
    //maxSize: "20m",
    //maxFiles: "14d",
  },
  app_file: {
    filename: `${appRoot}/logs/app.log`,
    handleExceptions: true,
    json: true,
    maxsize: 5242880, // 5MB
    maxFiles: 15,
    colorize: true,
  },
  info_file: {
    level: "info",
    filename: `${appRoot}/logs/info.log`,
    json: true,
    maxsize: 5242880, // 5MB
    maxFiles: 1,
    colorize: true,
  },
  error_file: {
    level: "error",
    filename: `${appRoot}/logs/error.log`,
    json: true,
    maxsize: 5242880, // 5MB
    maxFiles: 15,
    colorize: true,
  },
  exceptions_file: {
    filename: `${appRoot}/logs/exceptions.log`,
    handleExceptions: true,
    json: true,
    maxsize: 5242880, // 5MB
    maxFiles: 15,
    colorize: true,
  },
  console: {
    level: "debug",
    handleExceptions: true,
    json: false,
    colorize: true,
  },
};

const logger = createLogger({
  format: combine(timestamp(), format.json()),
  transports: [
    // new transports.File(options.error_file),
    // new transports.File(options.info_file),
    // new transports.File(options.exceptions_file),
    //new transports.File(options.app_file),
    new DailyRotateFile(options.rotate_file),
    new transports.Console(options.console),
  ],
  //exceptionHandlers: [new transports.File({ filename: 'exceptions.log' })],
  exitOnError: false, // do not exit on handled exceptions
});

logger.stream = {
  write: function (message, encoding) {
    logger.info(message);
  },
};

module.exports = logger;
