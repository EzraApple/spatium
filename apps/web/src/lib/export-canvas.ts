type ExportOptions = {
  filename?: string
  backgroundColor?: string
  padding?: number
  scale?: number
}

function inlineStyles(svg: SVGElement): void {
  const computed = window.getComputedStyle(svg)
  for (const prop of computed) {
    svg.style.setProperty(prop, computed.getPropertyValue(prop))
  }

  for (const child of svg.querySelectorAll("*")) {
    const childComputed = window.getComputedStyle(child)
    for (const prop of childComputed) {
      ;(child as HTMLElement).style.setProperty(prop, childComputed.getPropertyValue(prop))
    }
  }
}

function getSvgBounds(svg: SVGSVGElement): { x: number; y: number; width: number; height: number } {
  const viewBox = svg.getAttribute("viewBox")
  if (viewBox) {
    const [x, y, width, height] = viewBox.split(" ").map(Number)
    return { x, y, width, height }
  }
  const bbox = svg.getBBox()
  return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height }
}

export async function exportToPng(
  svgElement: SVGSVGElement,
  options: ExportOptions = {}
): Promise<void> {
  const {
    filename = "spatium-layout.png",
    backgroundColor = "#f0f5ff",
    padding = 40,
    scale = 2,
  } = options

  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement

  const bounds = getSvgBounds(svgElement)
  const width = bounds.width + padding * 2
  const height = bounds.height + padding * 2

  clonedSvg.setAttribute("viewBox", `${bounds.x - padding} ${bounds.y - padding} ${width} ${height}`)
  clonedSvg.setAttribute("width", String(width * scale))
  clonedSvg.setAttribute("height", String(height * scale))
  clonedSvg.style.backgroundColor = backgroundColor

  inlineStyles(clonedSvg)

  const serializer = new XMLSerializer()
  const svgString = serializer.serializeToString(clonedSvg)
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })
  const url = URL.createObjectURL(svgBlob)

  const img = new Image()
  img.crossOrigin = "anonymous"

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
    img.src = url
  })

  const canvas = document.createElement("canvas")
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext("2d")!

  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0)

  URL.revokeObjectURL(url)

  const dataUrl = canvas.toDataURL("image/png")
  const link = document.createElement("a")
  link.download = filename
  link.href = dataUrl
  link.click()
}

export async function exportToPdf(
  svgElement: SVGSVGElement,
  layoutName: string,
  options: ExportOptions = {}
): Promise<void> {
  const {
    filename = "spatium-layout.pdf",
    backgroundColor = "#f0f5ff",
    padding = 40,
    scale = 2,
  } = options

  const { jsPDF } = await import("jspdf")

  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement

  const bounds = getSvgBounds(svgElement)
  const width = bounds.width + padding * 2
  const height = bounds.height + padding * 2

  clonedSvg.setAttribute("viewBox", `${bounds.x - padding} ${bounds.y - padding} ${width} ${height}`)
  clonedSvg.setAttribute("width", String(width * scale))
  clonedSvg.setAttribute("height", String(height * scale))
  clonedSvg.style.backgroundColor = backgroundColor

  inlineStyles(clonedSvg)

  const serializer = new XMLSerializer()
  const svgString = serializer.serializeToString(clonedSvg)
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })
  const url = URL.createObjectURL(svgBlob)

  const img = new Image()
  img.crossOrigin = "anonymous"

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
    img.src = url
  })

  const canvas = document.createElement("canvas")
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext("2d")!

  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0)

  URL.revokeObjectURL(url)

  const imgDataUrl = canvas.toDataURL("image/png")

  const pdfWidth = width * 0.75
  const pdfHeight = height * 0.75
  const orientation = pdfWidth > pdfHeight ? "landscape" : "portrait"

  const pdf = new jsPDF({
    orientation,
    unit: "pt",
    format: [pdfWidth + 80, pdfHeight + 120],
  })

  pdf.setFillColor(backgroundColor)
  pdf.rect(0, 0, pdfWidth + 80, pdfHeight + 120, "F")

  pdf.setFontSize(18)
  pdf.setTextColor(34, 54, 90)
  pdf.text(layoutName, 40, 40)

  pdf.setFontSize(10)
  pdf.setTextColor(100, 116, 139)
  pdf.text(`Exported from Spatium • ${new Date().toLocaleDateString()}`, 40, 58)

  pdf.addImage(imgDataUrl, "PNG", 40, 80, pdfWidth, pdfHeight)

  pdf.save(filename)
}

