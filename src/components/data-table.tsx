import { useMemo, useState, type ReactNode } from "react";
import { Download, Filter, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  accessor?: (row: T) => string | number;
  className?: string;
  sortable?: boolean;
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchKeys?: (keyof T | ((row: T) => string))[];
  filters?: { label: string; key: string; options: { value: string; label: string }[]; predicate: (row: T, v: string) => boolean }[];
  onCreate?: () => void;
  createLabel?: string;
  actions?: (row: T) => ReactNode;
  emptyText?: string;
  pageSize?: number;
  filename?: string;
  rowKey: (row: T) => string;
}

export function DataTable<T>({ rows, columns, searchPlaceholder = "Search…", searchKeys, filters = [], onCreate, createLabel = "New", actions, emptyText = "No records found.", pageSize = 10, filename = "export.csv", rowKey }: Props<T>) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const filtered = useMemo(() => {
    let r = rows;
    if (q && searchKeys) {
      const ql = q.toLowerCase();
      r = r.filter(row => searchKeys.some(k => {
        const v = typeof k === "function" ? k(row) : String((row as Record<string, unknown>)[k as string] ?? "");
        return v.toLowerCase().includes(ql);
      }));
    } else if (q) {
      const ql = q.toLowerCase();
      r = r.filter(row => JSON.stringify(row).toLowerCase().includes(ql));
    }
    for (const f of filters) {
      const v = activeFilters[f.key];
      if (v && v !== "__all__") r = r.filter(row => f.predicate(row, v));
    }
    if (sort) {
      const col = columns.find(c => c.key === sort.key);
      if (col?.accessor) {
        r = [...r].sort((a, b) => {
          const va = col.accessor!(a), vb = col.accessor!(b);
          if (va < vb) return sort.dir === "asc" ? -1 : 1;
          if (va > vb) return sort.dir === "asc" ? 1 : -1;
          return 0;
        });
      }
    }
    return r;
  }, [rows, q, activeFilters, sort, columns, filters, searchKeys]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const exportCsv = () => {
    const header = columns.map(c => c.header).join(",");
    const lines = filtered.map(row =>
      columns.map(c => {
        const v = c.accessor ? c.accessor(row) : String((row as Record<string, unknown>)[c.key] ?? "");
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(",")
    );
    const blob = new Blob([header + "\n" + lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder={searchPlaceholder} className="pl-8" />
        </div>
        {filters.map(f => (
          <Select key={f.key} value={activeFilters[f.key] ?? "__all__"} onValueChange={v => { setActiveFilters(s => ({ ...s, [f.key]: v })); setPage(1); }}>
            <SelectTrigger className="w-[180px]"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue placeholder={f.label} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All {f.label}</SelectItem>
              {f.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        ))}
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export</Button>
        {onCreate && <Button size="sm" onClick={onCreate}><Plus className="h-4 w-4 mr-1" />{createLabel}</Button>}
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map(c => (
                <TableHead key={c.key} className={c.className}
                  onClick={() => c.sortable && c.accessor && setSort(s => s?.key === c.key ? (s.dir === "asc" ? { key: c.key, dir: "desc" } : null) : { key: c.key, dir: "asc" })}
                  style={{ cursor: c.sortable ? "pointer" : undefined }}>
                  {c.header}{sort?.key === c.key && (sort.dir === "asc" ? " ↑" : " ↓")}
                </TableHead>
              ))}
              {actions && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow><TableCell colSpan={columns.length + (actions ? 1 : 0)} className="text-center text-muted-foreground py-12">{emptyText}</TableCell></TableRow>
            ) : pageRows.map(row => (
              <TableRow key={rowKey(row)} className="hover:bg-muted/30">
                {columns.map(c => <TableCell key={c.key} className={c.className}>{c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "—")}</TableCell>)}
                {actions && <TableCell className="text-right">{actions(row)}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
        <span>{filtered.length} record{filtered.length === 1 ? "" : "s"}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <span>Page {page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      </div>
    </Card>
  );
}
