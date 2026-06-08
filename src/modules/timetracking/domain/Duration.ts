import { ok, err, type Result } from "@/shared/result";
import { ValidationError } from "@/shared/errors";

// SOLID: SRP — Duration é um Value Object: representa um intervalo de tempo
// não-negativo em segundos e sabe formatá-lo. Nada além disso.

export class Duration {
  private constructor(private readonly _seconds: number) {
    Object.freeze(this);
  }

  // Factory com validação: segundos devem ser inteiros não-negativos.
  static fromSeconds(seconds: number): Result<Duration, ValidationError> {
    if (!Number.isFinite(seconds) || !Number.isInteger(seconds)) {
      return err(
        new ValidationError("Duration seconds must be an integer", {
          field: "seconds",
        }),
      );
    }
    if (seconds < 0) {
      return err(
        new ValidationError("Duration seconds must be non-negative", {
          field: "seconds",
        }),
      );
    }
    return ok(new Duration(seconds));
  }

  // Total: zero é sempre válido. Útil como neutro em agregações/fallbacks.
  static zero(): Duration {
    return new Duration(0);
  }

  get seconds(): number {
    return this._seconds;
  }

  get minutes(): number {
    return this._seconds / 60;
  }

  get hours(): number {
    return this._seconds / 3600;
  }

  // "Hh Mm" — ex.: 3661s -> "1h 1m".
  format(): string {
    const totalMinutes = Math.floor(this._seconds / 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
  }

  equals(other: Duration): boolean {
    return this._seconds === other._seconds;
  }
}
