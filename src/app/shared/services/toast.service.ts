import { Injectable, signal } from '@angular/core';

export type ToastTone = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  tone: ToastTone;
  messageKey: string;
  params?: Record<string, unknown>;
}

const TOAST_DURATION_MS = 4500;

/** Short confirmation or error messages announced through an aria-live region. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private sequence = 0;
  private readonly items = signal<Toast[]>([]);
  readonly toasts = this.items.asReadonly();

  success(messageKey: string, params?: Record<string, unknown>): void {
    this.show('success', messageKey, params);
  }

  error(messageKey: string, params?: Record<string, unknown>): void {
    this.show('error', messageKey, params);
  }

  info(messageKey: string, params?: Record<string, unknown>): void {
    this.show('info', messageKey, params);
  }

  dismiss(id: number): void {
    this.items.update((items) => items.filter((toast) => toast.id !== id));
  }

  private show(tone: ToastTone, messageKey: string, params?: Record<string, unknown>): void {
    const toast: Toast = { id: ++this.sequence, tone, messageKey, params };
    this.items.update((items) => [...items.slice(-2), toast]);
    setTimeout(() => this.dismiss(toast.id), TOAST_DURATION_MS);
  }
}
