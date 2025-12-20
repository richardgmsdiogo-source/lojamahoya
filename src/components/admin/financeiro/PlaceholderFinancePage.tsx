export default function PlaceholderFinancePage({ title }: { title: string }) {
  return (
    <div className="space-y-2">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="text-muted-foreground">Página em construção.</p>
    </div>
  );
}
