import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { ComponentType } from '@angular/cdk/portal';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../presentation/components/confirm-dialog/confirm-dialog.component';

/** Opens a form dialog with the shared panel styling; the dialog closes with the saved entity. */
export function openFormDialog<TResult, TData>(
  dialog: Dialog,
  component: ComponentType<unknown>,
  data: TData,
): DialogRef<TResult, unknown> {
  return dialog.open<TResult, TData>(component, {
    data,
    panelClass: 'app-dialog-panel',
    backdropClass: 'app-dialog-backdrop',
    autoFocus: 'first-tabbable',
    restoreFocus: true,
  });
}

export function openConfirmDialog(dialog: Dialog, data: ConfirmDialogData): DialogRef<boolean, unknown> {
  return dialog.open<boolean, ConfirmDialogData>(ConfirmDialogComponent, {
    data,
    panelClass: ['app-dialog-panel', 'app-dialog-panel--sm'],
    backdropClass: 'app-dialog-backdrop',
    autoFocus: 'dialog',
    restoreFocus: true,
    role: 'alertdialog',
  });
}
