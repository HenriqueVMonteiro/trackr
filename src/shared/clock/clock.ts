// SOLID: DIP — application/ depende de Clock (port), não de `new Date()` direto.
// Permite testar lógica temporal sem manipular o relógio do sistema.

export interface Clock {
  now(): Date;
}

// SOLID: SRP — produz o instante atual; nada mais.
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

// Test double; também serve para schedulers determinísticos.
export class FrozenClock implements Clock {
  private current: Date;

  constructor(initial: Date | string | number = new Date()) {
    this.current = new Date(initial);
  }

  now(): Date {
    return new Date(this.current);
  }

  advance(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }

  set(d: Date | string | number): void {
    this.current = new Date(d);
  }
}
