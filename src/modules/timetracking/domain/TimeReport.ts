import { Duration } from "./Duration";
import type { TimeEntry } from "./TimeEntry";

// SOLID: SRP — TimeReport é um Value Object de agregação: soma durações e conta
// entradas. Puro e determinístico; não conhece persistência nem use cases.

export interface TimeReportJSON {
  readonly totalSeconds: number;
  readonly count: number;
}

export class TimeReport {
  private constructor(
    private readonly _totalSeconds: number,
    private readonly _count: number,
  ) {
    Object.freeze(this);
  }

  // Fábrica pura: agrega uma coleção de TimeEntry.
  static fromEntries(entries: TimeEntry[]): TimeReport {
    let totalSeconds = 0;
    for (const entry of entries) {
      totalSeconds += entry.durationSeconds;
    }
    return new TimeReport(totalSeconds, entries.length);
  }

  static empty(): TimeReport {
    return new TimeReport(0, 0);
  }

  get totalSeconds(): number {
    return this._totalSeconds;
  }

  get count(): number {
    return this._count;
  }

  // Duração total como Value Object. totalSeconds é não-negativo (soma de
  // durações não-negativas), então a factory é sempre Ok aqui.
  total(): Duration {
    const safeSeconds = Math.max(0, Math.round(this._totalSeconds));
    const r = Duration.fromSeconds(safeSeconds);
    return r.ok ? r.value : Duration.zero();
  }

  toJSON(): TimeReportJSON {
    return { totalSeconds: this._totalSeconds, count: this._count };
  }
}
