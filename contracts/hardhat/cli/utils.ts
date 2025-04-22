import { Type } from 'cmd-ts';
import pino from 'pino';
import { type Options, type Ora } from 'ora';
import pretty from 'pino-pretty';

export const createEnumType = <
  T extends { [key: string]: string | number },
  O = false
>(
  enumObj: T,
  name: string,
  description: string,
  isOptional?: O
): O extends true ? Type<string, undefined | number> : Type<string, number> => {
  const parsedDescription = `${isOptional ? '(Optional) ' : ''}${description} (${Object.entries(
    enumObj
  )
    .flatMap(([k, v]) => (!isNaN(Number(k)) ? `${k} => ${v}` : []))
    .join(', ')})`;

  return {
    defaultValue: isOptional ? () => undefined : undefined,
    description: parsedDescription,
    from: async (str) => {
      if (isOptional && str === undefined) return undefined;
      const value = parseInt(str, 10);

      if (enumObj[value] === undefined) {
        throw new Error(
          `Invalid ${name} (${value}). Valid values are: ${Object.values(
            enumObj
          )
            .filter((k) => isNaN(Number(k)))
            .join(', ')}`
        );
      }

      return value;
    }
  } as O extends true ? Type<string, undefined | number> : Type<string, number>;
};

const stream = pretty({
  ignore: 'time,hostname,pid',
  sync: true
});

export const Logger = pino({ level: process.env.LOG_LEVEL || 'info' }, stream);

// Workaround for ESM import
export const Spinner = async (opt: string | Options) => {
  const ora = await (new Function("return import('ora');")() as Promise<{
    default: (opt?: Options | string) => Ora;
  }>);

  const [text, options] = typeof opt === 'string' ? [opt, {}] : [opt.text, opt];

  const x = ora
    .default({
      suffixText: '\n',
      ...options,
      text: text
    })
    .start();

  x.clear();
  x.frame();

  process.on('exit', (code) => {
    if (!x.isSpinning && code !== 0) x.fail('Process exited unexpectedly');
  });

  return x;
};
