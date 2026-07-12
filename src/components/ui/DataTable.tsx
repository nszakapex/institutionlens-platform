import type { ReactNode } from "react";

type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  numeric?: boolean;
};

type Props<T> = {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
};

export function DataTable<T>({ caption, columns, rows, getRowId }: Props<T>) {
  return (
    <div className="il-table-wrap">
      <table className="il-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col" className={col.numeric ? "is-numeric" : undefined}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowId(row)}>
              {columns.map((col) => (
                <td key={col.key} className={col.numeric ? "is-numeric" : undefined}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type RecordRowProps = {
  href?: string;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  trailing?: ReactNode;
};

export function RecordRow({ href, title, subtitle, meta, trailing }: RecordRowProps) {
  const content = (
    <>
      <div className="il-record-copy">
        <strong className="il-record-title">{title}</strong>
        {subtitle ? <span className="il-record-subtitle">{subtitle}</span> : null}
        {meta ? <div className="il-record-meta">{meta}</div> : null}
      </div>
      {trailing ? <div className="il-record-trailing">{trailing}</div> : null}
    </>
  );

  if (href) {
    return (
      <a className="il-record-row" href={href}>
        {content}
      </a>
    );
  }

  return <div className="il-record-row is-static">{content}</div>;
}
