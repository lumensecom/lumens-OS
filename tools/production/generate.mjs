import { readFile, writeFile } from "node:fs/promises"
import { runProduction } from "../../lib/production/pipeline.ts"

const [briefPath, output, ...files] = process.argv.slice(2)
if (!briefPath || !output || !files.length) {
  console.error("Uso: node tools/production/generate.mjs brief.json entrega.zip foto1.webp [foto2.webp …]")
  process.exitCode = 1
} else {
  const demo = briefPath === "lib/production/demo/brief.json"
  try {
    const brief = JSON.parse(await readFile(briefPath, "utf8"))
    const photos = await Promise.all(files.map(async (file) => ({ data: await readFile(file) })))
    const result = await runProduction(brief, photos, demo)
    await writeFile(output, result.zip)
    console.log(`${output} · ${result.stages.length} oficinas · ${result.blockSizes.join(" + ")} bytes Liquid`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
