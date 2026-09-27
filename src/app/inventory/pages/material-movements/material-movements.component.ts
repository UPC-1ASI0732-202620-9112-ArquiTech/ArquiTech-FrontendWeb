import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { Observable, forkJoin, map } from 'rxjs';
import {
  DataToolbarComponent,
  FilterField,
} from '../../../shared/presentation/components/data-toolbar/data-toolbar.component';
import { ListStateComponent } from '../../../shared/presentation/components/list-state/list-state.component';
import { PaginatorComponent } from '../../../shared/presentation/components/paginator/paginator.component';
import { StatusBadgeComponent } from '../../../shared/presentation/components/status-badge/status-badge.component';
import { ProjectScopedListPage } from '../../../shared/presentation/pages/project-scoped-list.page';
import { AppDatePipe, AppNumberPipe } from '../../../shared/presentation/pipes/format.pipes';
import { compareIsoDesc, isWithinIsoRange } from '../../../shared/utils/date.utils';
import { TableState, normalizeText } from '../../../shared/utils/table-state';
import { MaterialMovement, MovementType } from '../../model/material-movement.entity';
import { MaterialService } from '../../services/material.service';

/** History of entries and usages of the work's materials (HU04, TS04). */
@Component({
  selector: 'app-material-movements',
  imports: [
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    LucideAngularModule,
    DataToolbarComponent,
    ListStateComponent,
    PaginatorComponent,
    StatusBadgeComponent,
    AppDatePipe,
    AppNumberPipe,
  ],
  templateUrl: './material-movements.component.html',
  styleUrl: './material-movements.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaterialMovementsComponent extends ProjectScopedListPage<MaterialMovement> implements OnInit {
  private readonly materialService = inject(MaterialService);

  /** Optional `?material=<id>` query parameter set by "Ver historial". */
  readonly material = input<string>();

  protected readonly entryType = MovementType.Entry;
  protected readonly filterFields = signal<FilterField[]>(this.buildFilters([]));

  protected readonly table = new TableState<MaterialMovement>({
    search: (movement, query) =>
      normalizeText(
        `${movement.materialName} ${movement.supplier} ${movement.note} ${movement.registeredByName}`,
      ).includes(query),
    filter: (movement, filters) =>
      (!filters['type'] || movement.type === filters['type']) &&
      (!filters['material'] || String(movement.materialId) === filters['material']) &&
      isWithinIsoRange(movement.occurredAt, filters['from'], filters['to']),
    // Chronological order, newest first (Organization Systems, report 4.2.1).
    sort: (a, b) => compareIsoDesc(a.occurredAt, b.occurredAt),
    pageSize: 10,
  });

  ngOnInit(): void {
    const material = this.material();
    if (material) {
      this.table.setFilter('material', material);
    }
  }

  protected fetch(projectId: number): Observable<MaterialMovement[]> {
    return forkJoin([
      this.materialService.getMovementsByProject(projectId),
      this.materialService.getByProject(projectId),
    ]).pipe(
      map(([movements, materials]) => {
        this.filterFields.set(
          this.buildFilters(
            [...materials]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((item) => ({ value: String(item.id), label: `${item.name} (${item.unit})` })),
          ),
        );
        return movements;
      }),
    );
  }

  private buildFilters(materials: { value: string; label: string }[]): FilterField[] {
    return [
      {
        key: 'type',
        labelKey: 'movements.fields.type',
        type: 'select',
        options: Object.values(MovementType).map((value) => ({ value, labelKey: `movements.types.${value}` })),
      },
      {
        key: 'material',
        labelKey: 'movements.fields.material',
        type: 'select',
        // Material names are data, not translation keys; the translate pipe returns them unchanged.
        options: materials.map((material) => ({ value: material.value, labelKey: material.label })),
      },
      { key: 'from', labelKey: 'filters.from', type: 'date' },
      { key: 'to', labelKey: 'filters.to', type: 'date' },
    ];
  }
}
