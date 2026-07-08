"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { FileUp, Loader2, CheckCircle2 } from "lucide-react"

import { importMetrics } from "@/app/(dashboard)/campanas/actions"
import { parseMetricsCsv, type ParseResult } from "@/lib/csv-metrics"
import { PLATFORM_LABELS } from "@/lib/campanas"
import { formatCOP } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type CampaignOption = {
  id: string
  name: string
  platform: string
}

/** Sube un CSV de Meta/TikTok, muestra preview consolidado por día e importa. */
export function MetricsUploader({ campaigns }: { campaigns: CampaignOption[] }) {
  const [campaignId, setCampaignId] = useState<string>("")
  const [result, setResult] = useState<ParseResult | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function onFile(file: File) {
    const text = await file.text()
    const parsed = parseMetricsCsv(text)
    setFileName(file.name)
    setResult(parsed)
    if (parsed.rows.length === 0) {
      toast.error("No se encontraron filas válidas (se necesita columna de fecha y gasto)")
      return
    }
    toast.success(
      `${parsed.rows.length} días detectados` +
        (parsed.platform !== "unknown"
          ? ` · formato ${PLATFORM_LABELS[parsed.platform]}`
          : ""),
    )
    // Autoselecciona campaña si el nombre del CSV coincide.
    const csvName = parsed.rows[0]?.campaignName?.toLowerCase()
    if (csvName && !campaignId) {
      const match = campaigns.find((c) => c.name.toLowerCase() === csvName)
      if (match) setCampaignId(match.id)
    }
  }

  function onImport() {
    if (!campaignId) {
      toast.error("Selecciona la campaña de destino")
      return
    }
    if (!result || result.rows.length === 0) return
    startTransition(async () => {
      const res = await importMetrics(
        campaignId,
        result.rows.map(({ date, spend, impressions, clicks, conversions }) => ({
          date,
          spend,
          impressions,
          clicks,
          conversions,
        })),
      )
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success(`${res.imported} días importados`)
      setResult(null)
      setFileName("")
      router.push(`/campanas/${campaignId}`)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-sm font-medium">Campaña de destino</p>
              <Select value={campaignId} onValueChange={setCampaignId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una campaña" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} · {PLATFORM_LABELS[c.platform] ?? c.platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium">Archivo CSV</p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void onFile(f)
                  e.target.value = ""
                }}
              />
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => inputRef.current?.click()}
              >
                <FileUp className="mr-2 h-4 w-4" />
                {fileName || "Elegir export de Meta o TikTok"}
              </Button>
            </div>
          </div>

          {result && result.rows.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary">
                Formato: {result.platform === "unknown" ? "Genérico" : PLATFORM_LABELS[result.platform]}
              </Badge>
              <Badge variant="secondary">{result.rows.length} días</Badge>
              {result.skipped > 0 && (
                <Badge variant="secondary">{result.skipped} filas omitidas</Badge>
              )}
              <span className="text-muted-foreground">
                Se consolidan filas del mismo día y se sobreescriben fechas ya existentes.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {result && result.rows.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Gasto</TableHead>
                <TableHead className="text-right">Impresiones</TableHead>
                <TableHead className="text-right">Clics</TableHead>
                <TableHead className="text-right">Conversiones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.slice(0, 31).map((r) => (
                <TableRow key={r.date}>
                  <TableCell className="font-mono text-xs">{r.date}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCOP(r.spend)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {r.impressions.toLocaleString("es-CO")}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {r.clicks}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {r.conversions}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t p-3">
            <Button onClick={onImport} disabled={isPending || !campaignId}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Importar {result.rows.length} días
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
