import jsPDF from 'jspdf'

const CLASES: Record<string, { label: string; desc: string; r: number; g: number; b: number }> = {
  A: { label: 'CLASE A', desc: 'Listo para comercializar sin intervencion', r: 26,  g: 122, b: 58  },
  B: { label: 'CLASE B', desc: 'Intervencion minima',                       r: 21,  g: 101, b: 192 },
  C: { label: 'CLASE C', desc: 'Intervencion compleja',                     r: 230, g: 81,  b: 0   },
  D: { label: 'CLASE D', desc: 'Para estructuras',                          r: 106, g: 27,  b: 154 },
}

export const generarPDF = async (analisis: any) => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  pdf.setFont('times', 'normal')

  const W = 210
  const M = 14
  let y = M

  const checkPage = (n: number) => {
    if (y + n > 282) { pdf.addPage(); y = M }
  }

  const txt = (
    text: string, size: number,
    r: number, g: number, b: number,
    bold = false,
    align: 'left' | 'center' | 'right' = 'left'
  ) => {
    pdf.setFontSize(size)
    pdf.setTextColor(r, g, b)
    pdf.setFont('times', bold ? 'bold' : 'normal')
    const lines = pdf.splitTextToSize(String(text), W - M * 2)
    const x = align === 'center' ? W / 2 : align === 'right' ? W - M : M
    pdf.text(lines, x, y, { align })
    y += lines.length * (size * 0.45) + 2
  }

  const line = () => {
    pdf.setDrawColor(220, 220, 220)
    pdf.line(M, y, W - M, y)
    y += 5
  }

  const fillBox = (r: number, g: number, b: number, h: number) => {
    pdf.setFillColor(r, g, b)
    pdf.roundedRect(M, y, W - M * 2, h, 2, 2, 'F')
  }

  // Fila de inspección — sin notas, solo label + certeza + valor
  const rowInsp = (label: string, valor: string, certeza: string) => {
    checkPage(14)
    const esBueno = valor === 'Sin daño' || valor === 'Completa y sellada'
    const esMedio = ['Daño leve', 'Microfisura', 'Microcrack', 'Decoloración', 'Abierta'].includes(valor)

    if      (esBueno) fillBox(232, 245, 233, 11)
    else if (esMedio) fillBox(255, 243, 224, 11)
    else              fillBox(254, 242, 242, 11)

    // Label
    pdf.setFontSize(9)
    pdf.setFont('times', 'bold')
    pdf.setTextColor(40, 40, 40)
    pdf.text(label, M + 3, y + 7.5)

    // Certeza
    if (certeza) {
      const cc = certeza === 'Alta' ? [26, 122, 58] : certeza === 'Media' ? [180, 60, 0] : [180, 28, 28]
      pdf.setFontSize(7)
      pdf.setFont('times', 'normal')
      pdf.setTextColor(cc[0], cc[1], cc[2])
      pdf.text(certeza, W / 2, y + 7.5, { align: 'center' })
    }

    // Valor
    const vc = esBueno ? [26, 122, 58] : esMedio ? [180, 60, 0] : [180, 28, 28]
    pdf.setFontSize(9)
    pdf.setFont('times', 'bold')
    pdf.setTextColor(vc[0], vc[1], vc[2])
    pdf.text(valor, W - M - 3, y + 7.5, { align: 'right' })

    y += 13
  }

  // ══ ENCABEZADO ══
  pdf.setFillColor(26, 46, 26)
  pdf.rect(0, 0, W, 24, 'F')
  pdf.setFontSize(18)
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('times', 'bold')
  pdf.text('CSPM Vision AI', M, 13)
  pdf.setFontSize(9)
  pdf.setFont('times', 'normal')
  pdf.text('Clasificacion inteligente de paneles solares', M, 19)
  const fecha = new Date(analisis.created_at).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
  pdf.text(fecha, W - M, 13, { align: 'right' })
  pdf.text(`ID: ${analisis.id.slice(0, 8)}`, W - M, 19, { align: 'right' })
  y = 32

  // ══ IMÁGENES ══
  const cargarImagen = (url: string): Promise<string> =>
    new Promise((res, rej) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        canvas.getContext('2d')!.drawImage(img, 0, 0)
        res(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.onerror = rej
      img.src = url
    })

  if (analisis.imagen_frente_url || analisis.imagen_dorso_url) {
    checkPage(70)
    const ambas = analisis.imagen_frente_url && analisis.imagen_dorso_url
    const imgW = ambas ? (W - M * 2 - 6) / 2 : W - M * 2
    const imgH = 55

    if (analisis.imagen_frente_url) {
      try {
        const data = await cargarImagen(analisis.imagen_frente_url)
        pdf.addImage(data, 'JPEG', M, y, imgW, imgH)
        pdf.setFontSize(8)
        pdf.setFont('times', 'normal')
        pdf.setTextColor(100, 100, 100)
        pdf.text('Frente', M + imgW / 2, y + imgH + 4, { align: 'center' })
      } catch {}
    }

    if (analisis.imagen_dorso_url) {
      try {
        const data = await cargarImagen(analisis.imagen_dorso_url)
        const x = ambas ? M + imgW + 6 : M
        pdf.addImage(data, 'JPEG', x, y, imgW, imgH)
        pdf.setFontSize(8)
        pdf.setFont('times', 'normal')
        pdf.setTextColor(100, 100, 100)
        pdf.text('Dorso', x + imgW / 2, y + imgH + 4, { align: 'center' })
      } catch {}
    }
    y += imgH + 10
  }

  // ══ INFO DEL PANEL ══
  if (analisis.marca || analisis.modelo) {
    checkPage(30)
    txt('INFORMACION DEL PANEL', 8, 120, 120, 120)
    if (analisis.marca)  txt(`Marca:  ${analisis.marca}`,  11, 26, 46, 26, true)
    if (analisis.modelo) txt(`Modelo: ${analisis.modelo}`, 11, 26, 46, 26, true)

    const params = [
      ['VOC', analisis.nom_voc], ['ISC', analisis.nom_isc],
      ['VMP', analisis.nom_vmp], ['IMP', analisis.nom_imp],
      ['PMAX', analisis.nom_pmax],
    ].filter(([, v]) => v)

    if (params.length > 0) {
      y += 2
      txt('Parametros nominales (placa):', 8, 120, 120, 120)
      params.forEach(([k, v]) => txt(`  ${k}: ${v}`, 10, 60, 60, 60))
    }
    line()
  }

  // ══ CLASIFICACIÓN ══
  checkPage(35)
  const claveClase = analisis.fue_corregida ? analisis.clasificacion_final : analisis.ia_clasificacion
  const cl = CLASES[claveClase] || CLASES['B']
  const clLabel = analisis.fue_corregida ? `${cl.label} (corregida por operario)` : cl.label

  fillBox(cl.r, cl.g, cl.b, 26)
  pdf.setFontSize(20)
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('times', 'bold')
  pdf.text(clLabel, W / 2, y + 11, { align: 'center' })
  pdf.setFontSize(10)
  pdf.setFont('times', 'normal')
  pdf.text(cl.desc, W / 2, y + 18, { align: 'center' })
  y += 30

  if (analisis.fue_corregida) {
    txt(`IA sugirio: ${CLASES[analisis.ia_clasificacion]?.label || ''} (${analisis.ia_confianza}% confianza)`, 8, 150, 150, 150, false, 'center')
    if (analisis.motivo_correccion) txt(`Motivo: "${analisis.motivo_correccion}"`, 9, 100, 100, 100, false, 'center')
  } else {
    txt(`Confianza: ${analisis.ia_confianza}%   |   Certeza: ${analisis.ia_certeza}`, 9, 100, 100, 100, false, 'center')
  }

  if (analisis.requiere_limpieza) {
    y += 2
    fillBox(255, 251, 230, 10)
    pdf.setFontSize(8)
    pdf.setTextColor(138, 80, 0)
    pdf.setFont('times', 'bold')
    pdf.text('ATENCION: Panel requiere limpieza previa - clasificacion provisional', W / 2, y + 6.5, { align: 'center' })
    y += 14
  }
  line()

  // ══ INSPECCIÓN POR COMPONENTE ══
  checkPage(20)

  // Encabezado de tabla
  fillBox(240, 240, 240, 10)
  pdf.setFontSize(8)
  pdf.setFont('times', 'bold')
  pdf.setTextColor(80, 80, 80)
  pdf.text('COMPONENTE', M + 3, y + 7)
  pdf.text('CERTEZA', W / 2, y + 7, { align: 'center' })
  pdf.text('ESTADO', W - M - 3, y + 7, { align: 'right' })
  y += 12

  const inspItems = [
    { label: 'Marco fisico',          val: analisis.insp_marco,     certeza: analisis.insp_marco_certeza     },
    { label: 'Vidrio frontal',        val: analisis.insp_vidrio,    certeza: analisis.insp_vidrio_certeza    },
    { label: 'Backsheet (dorso)',      val: analisis.insp_backsheet, certeza: analisis.insp_backsheet_certeza },
    { label: 'Celulas fotovoltaicas', val: analisis.insp_celulas,   certeza: analisis.insp_celulas_certeza   },
    { label: 'Caja de conexiones',    val: analisis.insp_caja,      certeza: analisis.insp_caja_certeza      },
  ]

  inspItems.forEach(({ label, val, certeza }) => {
    if (val) rowInsp(label, val, certeza || '')
  })
  line()

  // ══ DIAGNÓSTICO ══
  checkPage(20)
  txt('DIAGNOSTICO', 8, 120, 120, 120)
  if (analisis.ia_justificacion) txt(analisis.ia_justificacion, 10, 60, 60, 60)
  line()

  // ══ ALERTAS ══
  const alertas: string[] = analisis.ia_alertas || []
  if (alertas.length > 0) {
    checkPage(16)
    txt('ALERTAS', 9, 185, 28, 28, true)
    alertas.forEach((a: string) => { checkPage(10); txt(`• ${a}`, 10, 185, 28, 28) })
    line()
  }

  // ══ RECOMENDACIONES ══
  const recom: string[] = analisis.ia_recomendaciones || []
  if (recom.length > 0) {
    checkPage(16)
    txt('RECOMENDACIONES', 9, 45, 106, 45, true)
    recom.forEach((r: string) => { checkPage(10); txt(`• ${r}`, 10, 45, 106, 45) })
    line()
  }

  // ══ PIE ══
  checkPage(10)
  y += 4
  txt('CSPM Vision AI  |  Economia Circular RAEE  |  Documento generado automaticamente', 7, 180, 180, 180, false, 'center')

  // ══ GUARDAR ══
  const fechaArchivo = new Date().toISOString().slice(0, 10)
  const modelo = analisis.modelo || 'panel'
  pdf.save(`CSPM_${modelo}_${fechaArchivo}.pdf`)
}