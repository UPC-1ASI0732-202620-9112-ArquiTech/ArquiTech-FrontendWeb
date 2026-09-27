import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { PAGE_SIZE_OPTIONS, TableControls } from '../../../utils/table-state';

/** "Filas por página: 5 · 1–3 de 3 ‹ ›" footer from the Figma data panels. */
@Component({
  selector: 'app-paginator',
  imports: [TranslatePipe, LucideAngularModule],
  templateUrl: './paginator.component.html',
  styleUrl: './paginator.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginatorComponent {
  readonly state = input.required<TableControls>();
  protected readonly pageSizes = PAGE_SIZE_OPTIONS;

  protected onPageSizeChange(event: Event): void {
    this.state().setPageSize(Number((event.target as HTMLSelectElement).value));
  }
}
