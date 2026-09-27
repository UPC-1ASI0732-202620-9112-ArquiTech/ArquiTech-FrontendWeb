import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { TableControls } from '../../../utils/table-state';

export interface FilterOption {
  value: string;
  labelKey: string;
}

export interface FilterField {
  key: string;
  labelKey: string;
  type: 'select' | 'date';
  options?: FilterOption[];
}

/**
 * Search box and filter panel of every list (Searching Systems, report 4.2.4):
 * keywords, category filters and date ranges.
 */
@Component({
  selector: 'app-data-toolbar',
  imports: [TranslatePipe, LucideAngularModule, CdkConnectedOverlay, CdkOverlayOrigin],
  templateUrl: './data-toolbar.component.html',
  styleUrl: './data-toolbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataToolbarComponent {
  readonly state = input.required<TableControls>();
  readonly searchPlaceholderKey = input.required<string>();
  readonly filters = input<FilterField[]>([]);

  protected readonly filterOpen = signal(false);
  protected readonly panelId = `filter-panel-${Math.random().toString(36).slice(2, 8)}`;
  protected readonly positions: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 },
  ];

  protected onSearch(event: Event): void {
    this.state().setQuery((event.target as HTMLInputElement).value);
  }

  protected onFilterChange(key: string, event: Event): void {
    this.state().setFilter(key, (event.target as HTMLInputElement | HTMLSelectElement).value);
  }

  protected valueOf(key: string): string {
    return this.state().filters()[key] ?? '';
  }

  protected clear(): void {
    this.state().clearFilters();
  }
}
