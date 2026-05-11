import type { ReactNode } from "react";

interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  caption: string;
  columns: Array<DataTableColumn<T>>;
  items: T[];
  getKey: (item: T) => string;
}

export function DataTable<T>({
  caption,
  columns,
  items,
  getKey,
}: DataTableProps<T>) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={getKey(item)}>
              {columns.map((column) => (
                <td key={column.key}>{column.render(item)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

