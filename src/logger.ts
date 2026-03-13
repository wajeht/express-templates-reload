import { styleText } from 'node:util';

function writeLog(
  color: Parameters<typeof styleText>[0],
  output: typeof process.stdout | typeof process.stderr,
  message: string,
  data?: unknown,
): void {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = `${timestamp} ${styleText(color, '[expressTemplatesReload]')}`;
  const suffix = data !== undefined ? ` ${JSON.stringify(data)}` : '';
  output.write(`${prefix} ${message}${suffix}\n`);
}

export const logger = {
  info(message: string, data?: unknown): void {
    writeLog('cyan', process.stdout, message, data);
  },
  error(message: string, data?: unknown): void {
    writeLog('red', process.stderr, message, data);
  },
};
