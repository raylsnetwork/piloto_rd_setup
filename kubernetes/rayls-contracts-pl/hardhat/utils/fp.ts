export type None = null | undefined;

export type Result<OkData, ErrorData> = Ok<OkData> | Err<ErrorData, OkData>;

export type Err<Error, Data = unknown> = {
  data: None;
  err: Error;
  isErr: true;
  isOk: false;
  unwrapOr: <T extends Data | null>(fallback: T) => T;
};

export const Err = <E = null>(err: E): Err<E> => ({
  data: null,
  err,
  unwrapOr: (x) => x,
  isErr: true,
  isOk: false
});

export type Ok<Data> = {
  data: Data;
  err: None;
  isErr: false;
  isOk: true;
  unwrapOr: <T extends Data | null>(fallback: T) => Data;
};

export const Ok = <O>(data: O): Ok<O> => ({
  data,
  err: null,
  unwrapOr: () => data,
  isErr: false,
  isOk: true
});

/**
 * USAGE
 */
// const get = (): Result<string, undefined> => {
//   return Ok('ok');
// };

// const x = get();

// const y = x.unwrapOr(null); // y = string | null

// if (x.isOk) {
//   x.data; // data = string
// }
