import { TableState, normalizeText } from './table-state';

interface Row {
  name: string;
  status: string;
}

describe('TableState', () => {
  const rows: Row[] = [
    { name: 'Ladrillos', status: 'OK' },
    { name: 'Cemento', status: 'LOW' },
    { name: 'Pintura', status: 'OK' },
    { name: 'Arena', status: 'OK' },
    { name: 'Fierro', status: 'LOW' },
    { name: 'Yeso', status: 'OK' },
  ];
  let table: TableState<Row>;

  beforeEach(() => {
    table = new TableState<Row>({
      search: (row, query) => normalizeText(row.name).includes(query),
      filter: (row, filters) => !filters['status'] || row.status === filters['status'],
      sort: (a, b) => a.name.localeCompare(b.name),
    });
    table.setRows(rows);
  });

  it('sorts alphabetically and paginates by 5', () => {
    expect(table.pageRows().map((row) => row.name)).toEqual(['Arena', 'Cemento', 'Fierro', 'Ladrillos', 'Pintura']);
    expect(table.rangeStart()).toBe(1);
    expect(table.rangeEnd()).toBe(5);
    expect(table.hasNext()).toBeTrue();
    table.nextPage();
    expect(table.pageRows().map((row) => row.name)).toEqual(['Yeso']);
  });

  it('searches ignoring case and accents', () => {
    table.setQuery('  CEMÉNTO ');
    expect(table.total()).toBe(1);
    expect(table.isFiltering()).toBeTrue();
  });

  it('applies category filters and counts them', () => {
    table.setFilter('status', 'LOW');
    expect(table.total()).toBe(2);
    expect(table.activeFilterCount()).toBe(1);
    table.clearFilters();
    expect(table.total()).toBe(6);
  });

  it('reports an empty range when nothing matches', () => {
    table.setQuery('acero');
    expect(table.rangeStart()).toBe(0);
    expect(table.rangeEnd()).toBe(0);
  });
});
