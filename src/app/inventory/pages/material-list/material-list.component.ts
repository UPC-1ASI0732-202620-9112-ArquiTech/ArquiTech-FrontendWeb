import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { Observable } from 'rxjs';
import {
  DataToolbarComponent,
  FilterField,
} from '../../../shared/presentation/components/data-toolbar/data-toolbar.component';
import { ListStateComponent } from '../../../shared/presentation/components/list-state/list-state.component';
import { PaginatorComponent } from '../../../shared/presentation/components/paginator/paginator.component';
import { ProjectScopedListPage } from '../../../shared/presentation/pages/project-scoped-list.page';
import { AppDatePipe, AppNumberPipe, PenCurrencyPipe } from '../../../shared/presentation/pipes/format.pipes';
import { openFormDialog } from '../../../shared/services/dialog.helpers';
import { isWithinIsoRange } from '../../../shared/utils/date.utils';
import { TableState, normalizeText } from '../../../shared/utils/table-state';
import {
  MaterialFormDialogComponent,
  MaterialFormDialogData,
} from '../../components/material-form-dialog/material-form-dialog.component';
import {
  MaterialMovementDialogComponent,
  MaterialMovementDialogData,
} from '../../components/material-movement-dialog/material-movement-dialog.component';
import { MaterialMovement, MovementType } from '../../model/material-movement.entity';
import { Material } from '../../model/material.entity';
import { MaterialService } from '../../services/material.service';

/**
 * Figma "Materiales": inventory of the work (HU28, HU40) with entries (HU01),
 * usages (HU02), updates (HU29) and deletions (HU47) for Supervisors.
 */
@Component({
  selector: 'app-material-list',
  imports: [
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    LucideAngularModule,
    CdkMenu,
    CdkMenuItem,
    CdkMenuTrigger,
    DataToolbarComponent,
    ListStateComponent,
    PaginatorComponent,
    AppDatePipe,
    AppNumberPipe,
    PenCurrencyPipe,
  ],
  templateUrl: './material-list.component.html',
  styleUrl: './material-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaterialListComponent extends ProjectScopedListPage<Material> {
  private readonly materialService = inject(MaterialService);
  private readonly router = inject(Router);

  protected readonly table = new TableState<Material>({
    search: (material, query) =>
      normalizeText(`${material.name} ${material.provider} ${material.providerRuc} ${material.unit}`).includes(query),
    filter: (material, filters) =>
      (!filters['stock'] || (filters['stock'] === 'LOW' ? material.isBelowMinimum() : !material.isBelowMinimum())) &&
      isWithinIsoRange(material.date, filters['from'], filters['to']),
    // Alphabetical order for material lists (Organization Systems, report 4.2.1).
    sort: (a, b) => a.name.localeCompare(b.name),
  });

  protected readonly filterFields: FilterField[] = [
    {
      key: 'stock',
      labelKey: 'materials.filters.stock',
      type: 'select',
      options: [
        { value: 'LOW', labelKey: 'materials.filters.lowStock' },
        { value: 'OK', labelKey: 'materials.filters.enoughStock' },
      ],
    },
    { key: 'from', labelKey: 'filters.updatedFrom', type: 'date' },
    { key: 'to', labelKey: 'filters.to', type: 'date' },
  ];

  protected fetch(projectId: number): Observable<Material[]> {
    return this.materialService.getByProject(projectId);
  }

  protected openCreate(): void {
    openFormDialog<Material, MaterialFormDialogData>(this.dialog, MaterialFormDialogComponent, {
      projectId: this.currentProjectId,
    }).closed.subscribe((material) => {
      if (material) {
        this.afterChange('materials.messages.created', { name: material.name });
      }
    });
  }

  protected openEdit(material: Material): void {
    openFormDialog<Material, MaterialFormDialogData>(this.dialog, MaterialFormDialogComponent, {
      projectId: this.currentProjectId,
      material,
    }).closed.subscribe((updated) => {
      if (updated) {
        this.afterChange('materials.messages.updated', { name: updated.name });
      }
    });
  }

  protected openMovement(type: 'entry' | 'usage', material?: Material): void {
    openFormDialog<MaterialMovement, MaterialMovementDialogData>(this.dialog, MaterialMovementDialogComponent, {
      type: type === 'entry' ? MovementType.Entry : MovementType.Usage,
      materials: [...this.table.rows()],
      material,
    }).closed.subscribe((movement) => {
      if (movement) {
        this.afterChange(movement.isEntry() ? 'movements.messages.entry' : 'movements.messages.usage', {
          quantity: movement.quantity,
          unit: movement.unit,
          name: movement.materialName,
        });
      }
    });
  }

  protected viewHistory(material: Material): void {
    void this.router.navigate(['/projects', this.currentProjectId, 'materials', 'movements'], {
      queryParams: { material: material.id },
    });
  }

  protected delete(material: Material): void {
    this.confirmDelete({
      titleKey: 'materials.delete.title',
      messageKey: 'materials.delete.message',
      params: { name: material.name },
      successKey: 'materials.messages.deleted',
      remove: () => this.materialService.delete(material.id),
    });
  }
}
