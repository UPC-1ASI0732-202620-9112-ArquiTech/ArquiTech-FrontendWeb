import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Project } from '../model/project.entity';
import { ProjectService } from '../services/project.service';
import { ProjectContextService } from '../services/project-context.service';
import { apiErrorKey } from '../../shared/utils/api-error';
@Component({
  selector: 'app-delete-project-dialog',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './delete-project-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteProjectDialogComponent {
  protected readonly project = inject<Project>(DIALOG_DATA);
  private readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);
  private readonly projects = inject(ProjectService);
  private readonly context = inject(ProjectContextService);
  protected name = '';
  protected readonly submitting = signal(false);
  protected readonly errorKey = signal<string | null>(null);
  protected close(): void {
    if (!this.submitting()) this.dialogRef.close(false);
  }
  protected submit(): void {
    if (this.submitting() || this.name !== this.project.name) return;
    this.submitting.set(true);
    this.errorKey.set(null);
    this.dialogRef.disableClose = true;
    this.projects.delete(this.project.id).subscribe({
      next: () => {
        this.context.forget(this.project.id);
        this.dialogRef.close(true);
      },
      error: (e: unknown) => {
        this.submitting.set(false);
        this.dialogRef.disableClose = false;
        this.errorKey.set(apiErrorKey(e));
      },
    });
  }
}
