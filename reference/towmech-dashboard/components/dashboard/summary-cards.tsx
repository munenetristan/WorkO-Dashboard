import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const cards = [
  { title: "Active Today", value: "128", badge: "Live" },
  { title: "Weekly Growth", value: "+18%", badge: "Trending" },
  { title: "Open Items", value: "42", badge: "Attention" },
  { title: "System Health", value: "99.2%", badge: "Stable" },
];

export function SummaryCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <Badge variant="secondary">{card.badge}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-900">
              {card.value}
            </div>
            <p className="text-xs text-muted-foreground">Updated just now</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
