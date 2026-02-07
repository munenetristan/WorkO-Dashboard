import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ModuleHeader({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-0 bg-gradient-to-r from-slate-900 to-slate-700 text-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">{title}</CardTitle>
        <p className="text-sm text-slate-200">{description}</p>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <div className="rounded-lg bg-white/10 px-3 py-1 text-xs uppercase tracking-wide">
          TowMech Ops
        </div>
        <div className="rounded-lg bg-white/10 px-3 py-1 text-xs uppercase tracking-wide">
          Live Data
        </div>
        <div className="rounded-lg bg-white/10 px-3 py-1 text-xs uppercase tracking-wide">
          Admin Controls
        </div>
      </CardContent>
    </Card>
  );
}
