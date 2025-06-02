// logger.ts

import { reporters } from 'mocha';
const mcoloring = reporters.Base.color;

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
}

type Style = {
  color: string;
  prefix: string | null;
  suffix: string | null;
};

const styles: Record<string, Style> = {
  debug: {
    color: 'error stack',
    prefix: mcoloring('error stack', '-'),
    suffix: null,
  },
  info: {
    color: 'pass',
    prefix: mcoloring('bright pass', 'i'),
    suffix: null,
  },
  error: {
    color: 'fail',
    prefix: mcoloring('fail', '✖'),
    suffix: null,
  },
};

class Logger {
  private currentLogLevel: LogLevel;
  public testContext: Mocha.Context | undefined;

  constructor(logLevel: LogLevel = LogLevel.DEBUG) {
    this.currentLogLevel = logLevel;
  }

  setTestContext(testContext: Mocha.Context) {
    this.testContext = testContext;
  }

  setLogLevel(level: LogLevel) {
    this.currentLogLevel = level;
  }

  private getIndentation(): string {
    let depth = 0;
    let titlePath: string[] = [];
    if (!this.testContext) {
      return '';
    }

    if (this.testContext.test && typeof this.testContext.test.titlePath === 'function') {
      titlePath = this.testContext.test.titlePath();
    } else if (this.testContext.currentTest && typeof this.testContext.currentTest.titlePath === 'function') {
      titlePath = this.testContext.currentTest.titlePath();
    } else {
      titlePath = [];
    }

    depth = titlePath.length - 1;
    depth = Math.max(0, depth);

    return '  '.repeat(depth);
  }

  private getTimestamp(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  private formatMessage(message: string, style: Style): string {
    const indentation = this.getIndentation();
    const timestamp = this.getTimestamp();
    const prefix = style.prefix ? ' ' + style.prefix : '';
    const coloredMessage = mcoloring(style.color, `[${timestamp}] ${message}`);
    return `${indentation}${prefix} ${coloredMessage}`;
  }

  debug(message: string) {
    if (this.currentLogLevel <= LogLevel.DEBUG) {
      console.log(this.formatMessage(message, styles.debug));
    }
  }

  info(message: string) {
    if (this.currentLogLevel <= LogLevel.INFO) {
      console.log(this.formatMessage(message, styles.info));
    }
  }

  error(message: string) {
    console.log(this.formatMessage(message, styles.error));
  }
}

export { Logger };
