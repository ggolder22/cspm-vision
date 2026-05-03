import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const PROMPT = `Sos un experto en inspección técnica de paneles solares fotovoltaicos para economía circular y gestión de residuos RAEE.

REGLAS IMPORTANTES:
1. Diferenciá siempre entre daño estructural real y apariencia alterada por suciedad
2. Si un componente está sucio pero no dañado, indicalo en la nota
3. Si la suciedad impide una inspección confiable, indicalo como alerta
4. Nunca confundas suciedad con daño real
5. Leé siempre la etiqueta del dorso si es visible: marca, modelo y parámetros eléctricos
6. El campo "nota" debe tener MAXIMO 80 caracteres
7. Si el panel está limpio y en buen estado, requiere_limpieza debe ser false

Los valores posibles para cada componente son EXACTAMENTE estos, sin variaciones:

marco:           "Sin daño" | "Daño leve" | "Daño severo" | "Roto"
vidrio:          "Sin daño" | "Microfisura" | "Fisura grande" | "Roto"
backsheet:       "Sin daño" | "Decoloración" | "Burbujas" | "Perforado"
celulas:         "Sin daño" | "Microcrack" | "Quemadura" | "Rota"
caja_conexiones: "Completa y sellada" | "Abierta" | "Dañada" | "Ausente" | "No visible"

Respondé ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown.

{
  "panel_info": {
    "marca": "nombre o No visible",
    "modelo": "modelo o No visible",
    "parametros_nominales": {
      "voc": "valor o No visible",
      "isc": "valor o No visible",
      "vmp": "valor o No visible",
      "imp": "valor o No visible",
      "pmax": "valor o No visible"
    }
  },
  "requiere_limpieza": true,
  "inspeccion": {
    "marco":           { "estado": "Sin daño",          "certeza": "Alta | Media | Baja", "nota": "max 80 caracteres" },
    "vidrio":          { "estado": "Sin daño",          "certeza": "Alta | Media | Baja", "nota": "max 80 caracteres" },
    "backsheet":       { "estado": "Sin daño",          "certeza": "Alta | Media | Baja", "nota": "max 80 caracteres" },
    "celulas":         { "estado": "Sin daño",          "certeza": "Alta | Media | Baja", "nota": "max 80 caracteres" },
    "caja_conexiones": { "estado": "Completa y sellada","certeza": "Alta | Media | Baja", "nota": "max 80 caracteres" }
  },
  "clasificacion": "A | B | C | D",
  "clasificacion_certeza": "Alta | Media | Baja",
  "confianza": 85,
  "justificacion": "Explicacion tecnica en maximo 200 caracteres",
  "alertas": ["alerta corta"],
  "recomendaciones": ["recomendacion corta"]
}

Criterios de clasificacion:
- Clase A: Apto para comercializar sin intervencion
- Clase B: Intervencion minima
- Clase C: Intervencion compleja
- Clase D: Solo apto para estructuras`

export async function POST(req: NextRequest) {
  try {
    const { imagenes } = await req.json()
    const content: any[] = []

    if (imagenes.frente) {
      content.push({ type: 'image', source: { type: 'base64', media_type: imagenes.frente.tipo, data: imagenes.frente.data } })
      content.push({ type: 'text', text: 'Esta es la imagen del FRENTE del panel solar.' })
    }

    if (imagenes.dorso) {
      content.push({ type: 'image', source: { type: 'base64', media_type: imagenes.dorso.tipo, data: imagenes.dorso.data } })
      content.push({ type: 'text', text: 'Esta es la imagen del DORSO del panel solar.' })
    }

    content.push({ type: 'text', text: 'Analiza estas imagenes y responde con el JSON de diagnostico.' })

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1500,
      system: PROMPT,
      messages: [{ role: 'user', content }],
    })

    const texto = response.content.map((b: any) => b.text || '').join('').trim()
    const clean = texto.replace(/```json|```/g, '').trim()
    const resultado = JSON.parse(clean)

    return NextResponse.json({ ok: true, resultado })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}