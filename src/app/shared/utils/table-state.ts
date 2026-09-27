import { Signal, WritableSignal, computed, signal } from '@angular/core';

export type FilterValues = Record<string, string>;

export interface TableStateOptions<T> {
  /** Keyword search (Searching Systems, report 4.2.4). */
  search: (row: T, normalizedQuery: string) => boolean;
  /** Category and date-range filters. */
  filter?: (row: T, filters: FilterValues) => boolean;
  /** Default ordering: alphabetical or chronological (Organization Systems, report 4.2.1). */
  sort?: (a: T, b: T) => number;
  pageSize?: number;
}

export const PAGE_SIZE_OPTIONS = [5, 10, 20] as const;

export function normalizeText(value: string | number | null | undefined): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Row-type independent API used by the toolbar and the paginator. */
export interface TableControls {
  readonly query: Signal<string>;
  readonly filters: Signal<FilterValues>;
  readonly pageSize: Signal<number>;
  readonly total: Signal<number>;
  readonly rangeStart: Signal<number>;
  readonly rangeEnd: Signal<number>;
  readonly hasPrevious: Signal<boolean>;
  readonly hasNext: Signal<boolean>;
  readonly activeFilterCount: Signal<number>;
  setQuery(query: string): void;
  setFilter(key: string, value: string): void;
  clearFilters(): void;
  setPageSize(size: number): void;
  previousPage(): void;
  nextPage(): void;
}

/** Client-side search, filtering and pagination for a list of rows. */
export class TableState<T> implements TableControls {
  readonly rows = signal<readonly T[]>([]);
  readonly query = signal('');
  readonly filters = signal<FilterValues>({});
  readonly pageIndex = signal(0);
  readonly pageSize: WritableSignal<number>;

  readonly filtered = computed(() => {
    const query = normalizeText(this.query());
    const filters = this.filters();
    const result = this.rows().filter(
      (row) =>
        (!query || this.options.search(row, query)) && (!this.options.filter || this.options.filter(row, filters)),
    );
    return this.options.sort ? [...result].sort(this.options.sort) : result;
  });

  readonly total = computed(() => this.filtered().length);
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

  readonly pageRows = computed(() => {
    const start = this.safePageIndex() * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  readonly rangeStart = computed(() => (this.total() === 0 ? 0 : this.safePageIndex() * this.pageSize() + 1));
  readonly rangeEnd = computed(() => Math.min(this.total(), (this.safePageIndex() + 1) * this.pageSize()));
  readonly hasPrevious = computed(() => this.safePageIndex() > 0);
  readonly hasNext = computed(() => this.safePageIndex() < this.pageCount() - 1);
  readonly activeFilterCount = computed(() => Object.values(this.filters()).filter((value) => !!value).length);
  readonly isFiltering = computed(() => !!this.query().trim() || this.activeFilterCount() > 0);

  private readonly safePageIndex = computed(() => Math.min(this.pageIndex(), this.pageCount() - 1));

  constructor(private readonly options: TableStateOptions<T>) {
    this.pageSize = signal(options.pageSize ?? PAGE_SIZE_OPTIONS[0]);
  }

  setRows(rows: readonly T[]): void {
    this.rows.set(rows);
  }

  setQuery(query: string): void {
    this.query.set(query);
    this.pageIndex.set(0);
  }

  setFilter(key: string, value: string): void {
    this.filters.update((current) => ({ ...current, [key]: value }));
    this.pageIndex.set(0);
  }

  clearFilters(): void {
    this.filters.set({});
    this.pageIndex.set(0);
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.pageIndex.set(0);
  }

  previousPage(): void {
    if (this.hasPrevious()) {
      this.pageIndex.set(this.safePageIndex() - 1);
    }
  }

  nextPage(): void {
    if (this.hasNext()) {
      this.pageIndex.set(this.safePageIndex() + 1);
    }
  }
}
