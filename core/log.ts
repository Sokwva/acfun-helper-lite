const PREFIX = '[AcFun Helper]';

export function createLogger(scope: string) {
  return (...args: unknown[]) => {
    console.log(`${PREFIX}[${scope}]`, ...args);
  };
}

export function warn(scope: string, ...args: unknown[]) {
  console.warn(`${PREFIX}[${scope}]`, ...args);
}

export function error(scope: string, ...args: unknown[]) {
  console.error(`${PREFIX}[${scope}]`, ...args);
}
