export const towerInput = "w-full min-w-0 rounded-md border bg-background px-3 py-2 text-sm"

export function TowerField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0 space-y-1 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  )
}
