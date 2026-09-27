import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { User } from '../../../iam/model/user.entity';
import { SessionService } from '../../../iam/services/session.service';
import { UserService } from '../../../iam/services/user.service';
import { FieldErrorComponent } from '../../../shared/presentation/components/field-error/field-error.component';
import { ToastService } from '../../../shared/services/toast.service';
import { apiErrorKey } from '../../../shared/utils/api-error';
import { todayIsoDate } from '../../../shared/utils/date.utils';
import { dateRangeValidator, notBlankValidator } from '../../../shared/utils/form-validators';
import { ProjectStatus } from '../../model/project.entity';
import { ProjectService } from '../../services/project.service';

/** Registration of a construction project (HU09, TS09). Supervisor only (TS21). */
@Component({
  selector: 'app-project-create',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, LucideAngularModule, FieldErrorComponent],
  templateUrl: './project-create.component.html',
  styleUrl: './project-create.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCreateComponent implements OnInit {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly projectService = inject(ProjectService);
  private readonly userService = inject(UserService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly session = inject(SessionService);

  protected readonly statuses = Object.values(ProjectStatus);
  protected readonly contractors = signal<User[]>([]);
  protected readonly contractorsError = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorKey = signal<string | null>(null);

  protected readonly form = this.formBuilder.group(
    {
      name: ['', [Validators.required, notBlankValidator(), Validators.maxLength(120)]],
      location: ['', [Validators.required, notBlankValidator(), Validators.maxLength(120)]],
      contractorId: [null as number | null, [Validators.required]],
      startDate: [todayIsoDate(), [Validators.required]],
      endDate: ['', [Validators.required]],
      budget: [0, [Validators.required, Validators.min(0)]],
      progress: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      status: [ProjectStatus.Pending as string, [Validators.required]],
    },
    { validators: dateRangeValidator('startDate', 'endDate') },
  );

  ngOnInit(): void {
    this.userService
      .getContractors()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (contractors) => this.contractors.set(contractors),
        error: () => this.contractorsError.set(true),
      });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const user = this.session.user();
    if (!user) {
      return;
    }
    const value = this.form.getRawValue();
    this.submitting.set(true);
    this.errorKey.set(null);
    this.projectService
      .register({
        name: value.name.trim(),
        location: value.location.trim(),
        startDate: value.startDate,
        endDate: value.endDate,
        budget: Number(value.budget),
        progress: Number(value.progress),
        status: value.status,
        supervisorId: user.id,
        contractorId: Number(value.contractorId),
      })
      .subscribe({
        next: (project) => {
          this.toast.success('projects.create.success', { name: project.name });
          void this.router.navigate(['/projects']);
        },
        error: (error: unknown) => {
          // HU09 AC2: invalid data does not create the project.
          this.submitting.set(false);
          this.errorKey.set(apiErrorKey(error));
        },
      });
  }
}
