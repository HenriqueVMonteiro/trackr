// SOLID: SRP — Result<T,E> só representa sucesso ou falha; nada mais.
// Usado por toda a camada application/ no lugar de throw para erros de negócio.

export type Result<T, E> = Ok<T> | Err<E>;

export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

export const isOk = <T, E>(r: Result<T, E>): r is Ok<T> => r.ok;
export const isErr = <T, E>(r: Result<T, E>): r is Err<E> => !r.ok;

export const map = <T, U, E>(r: Result<T, E>, fn: (v: T) => U): Result<U, E> =>
  r.ok ? ok(fn(r.value)) : r;

export const flatMap = <T, U, E>(
  r: Result<T, E>,
  fn: (v: T) => Result<U, E>,
): Result<U, E> => (r.ok ? fn(r.value) : r);

export const mapErr = <T, E, F>(r: Result<T, E>, fn: (e: E) => F): Result<T, F> =>
  r.ok ? r : err(fn(r.error));

export const unwrapOr = <T, E>(r: Result<T, E>, defaultValue: T): T =>
  r.ok ? r.value : defaultValue;

export const unwrap = <T, E>(r: Result<T, E>): T => {
  if (!r.ok) {
    throw new Error(`unwrap() called on Err: ${JSON.stringify(r.error)}`);
  }
  return r.value;
};
