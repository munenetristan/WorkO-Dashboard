import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const rows = Array.from({ length: 5 }).map((_, index) => ({
  id: `#TM-${1200 + index}`,
  status: index % 2 === 0 ? "In Progress" : "Completed",
  owner: index % 2 === 0 ? "Dispatch" : "Operations",
  updated: "Just now",
}));

export function TablePlaceholder({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-slate-900">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium text-slate-900">
                  {row.id}
                </TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell>{row.owner}</TableCell>
                <TableCell>{row.updated}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
