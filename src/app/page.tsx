'use client'
import { useState, useRef } from 'react'
import { guardarAnalisis } from '@/lib/guardarAnalisis'
import { generarPDF } from '@/lib/generarPDF'

const CLASES: Record<string, { color: string; bg: string; label: string; desc: string; icon: string }> = {
  A: { color: '#1a7a3a', bg: '#e8f5e9', label: 'Clase A', desc: 'Listo para comercializar', icon: '✅' },
  B: { color: '#1565c0', bg: '#e3f2fd', label: 'Clase B', desc: 'Intervención mínima',      icon: '🔧' },
  C: { color: '#e65100', bg: '#fff3e0', label: 'Clase C', desc: 'Intervención compleja',    icon: '⚙️' },
  D: { color: '#6a1b9a', bg: '#f3e5f5', label: 'Clase D', desc: 'Para estructuras',         icon: '🏗️' },
}

const INSP_LABELS: Record<string, string> = {
  marco:            'Marco físico',
  marco_fisico:     'Marco físico',
  vidrio:           'Vidrio frontal',
  vidrio_frontal:   'Vidrio frontal',
  backsheet:        'Backsheet (dorso)',
  celulas:          'Células fotovoltaicas',
  celulas_fv:       'Células fotovoltaicas',
  caja_conexiones:  'Caja de conexiones',
  caja:             'Caja de conexiones',
}

const ESTADO_COLORS: Record<string, { color: string; bg: string }> = {
  'Sin daño':           { color: '#1a7a3a', bg: '#e8f5e9' },
  'Completa y sellada': { color: '#1a7a3a', bg: '#e8f5e9' },
  'No visible':         { color: '#888',    bg: '#f5f5f5' },
  'Daño leve':          { color: '#e65100', bg: '#fff3e0' },
  'Microfisuras':       { color: '#e65100', bg: '#fff3e0' },
  'Microcrack':         { color: '#e65100', bg: '#fff3e0' },
  'Decoloración':       { color: '#e65100', bg: '#fff3e0' },
  'Abierta':            { color: '#e65100', bg: '#fff3e0' },
  'Daño severo':        { color: '#b91c1c', bg: '#fef2f2' },
  'Fisura visible':     { color: '#b91c1c', bg: '#fef2f2' },
  'Quemaduras':         { color: '#b91c1c', bg: '#fef2f2' },
  'Burbujas':           { color: '#b91c1c', bg: '#fef2f2' },
  'Dañada':             { color: '#b91c1c', bg: '#fef2f2' },
  'Roto':               { color: '#b91c1c', bg: '#fef2f2' },
  'Perforado':          { color: '#b91c1c', bg: '#fef2f2' },
  'Rotas':              { color: '#b91c1c', bg: '#fef2f2' },
  'Ausente':            { color: '#b91c1c', bg: '#fef2f2' },
}

const getColor = (val: string) => ESTADO_COLORS[val] || { color: '#555', bg: '#f5f5f5' }

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const reader = new FileReader()
    reader.onload = () => res((reader.result as string).split(',')[1])
    reader.onerror = rej
    reader.readAsDataURL(file)
  })

export default function Home() {
  const [frenteFile, setFrenteFile]       = useState<File | null>(null)
  const [dorsoFile, setDorsoFile]         = useState<File | null>(null)
  const [frentePreview, setFrentePreview] = useState<string | null>(null)
  const [dorsoPreview, setDorsoPreview]   = useState<string | null>(null)
  const [analizando, setAnalizando]       = useState(false)
  const [resultado, setResultado]         = useState<any>(null)
  const [error, setError]                 = useState<string | null>(null)
  const [corregida, setCorregida]         = useState(false)
  const [claseCorrecta, setClaseCorrecta] = useState<string | null>(null)
  const [motivo, setMotivo]               = useState('')
  const [corrGuardada, setCorrGuardada]   = useState(false)
  const [guardando, setGuardando]         = useState(false)
  const [descargando, setDescargando]     = useState(false)
  const [analisisId, setAnalisisId]       = useState<string | null>(null)
  const [guardadoOk, setGuardadoOk]       = useState(false)
  const frenteRef = useRef<HTMLInputElement>(null)
  const dorsoRef  = useRef<HTMLInputElement>(null)

  const handleFile = (file: File, tipo: 'frente' | 'dorso') => {
    const url = URL.createObjectURL(file)
    if (tipo === 'frente') { setFrenteFile(file); setFrentePreview(url) }
    else                   { setDorsoFile(file);  setDorsoPreview(url)  }
    setResultado(null); setError(null)
    setCorregida(false); setCorrGuardada(false)
    setAnalisisId(null); setGuardadoOk(false)
  }

  const analizar = async () => {
    if (!frenteFile && !dorsoFile) { setError('Subí al menos una imagen'); return }
    setAnalizando(true); setError(null); setResultado(null)
    setAnalisisId(null); setGuardadoOk(false)
    try {
      const imagenes: any = {}
      if (frenteFile) imagenes.frente = { data: await fileToBase64(frenteFile), tipo: frenteFile.type }
      if (dorsoFile)  imagenes.dorso  = { data: await fileToBase64(dorsoFile),  tipo: dorsoFile.type  }
      const res  = await fetch('/api/analizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagenes })
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)
      setResultado(data.resultado)
      setClaseCorrecta(data.resultado.clasificacion)
    } catch (err: any) {
      setError('Error al analizar. Intentá de nuevo.')
      console.error(err)
    } finally {
      setAnalizando(false)
    }
  }

  const confirmar = async () => {
    if (!resultado) return
    setGuardando(true)
    const id = await guardarAnalisis(
      resultado,
      claseCorrecta || resultado.clasificacion,
      false, '',
      frenteFile, dorsoFile
    )
    setAnalisisId(id)
    setGuardadoOk(true)
    setGuardando(false)
  }

  const guardarCorreccion = async () => {
    if (!resultado || !claseCorrecta) return
    setGuardando(true)
    const id = await guardarAnalisis(
      resultado,
      claseCorrecta,
      true, motivo,
      frenteFile, dorsoFile
    )
    setAnalisisId(id)
    setCorrGuardada(true)
    setCorregida(false)
    setGuardadoOk(true)
    setGuardando(false)
  }

  const descargarPDF = async () => {
    if (!analisisId) return
    setDescargando(true)
    try {
      const { createClient } = await import('@/lib/supabase')
      const supabase = createClient()
      const { data } = await supabase
        .from('analisis')
        .select('*')
        .eq('id', analisisId)
        .single()
      if (data) await generarPDF(data)
    } catch (err) {
      console.error(err)
    } finally {
      setDescargando(false)
    }
  }

  const resetear = () => {
    setFrenteFile(null); setDorsoFile(null)
    setFrentePreview(null); setDorsoPreview(null)
    setResultado(null); setError(null)
    setCorregida(false); setCorrGuardada(false)
    setClaseCorrecta(null); setMotivo('')
    setAnalisisId(null); setGuardadoOk(false)
  }

  const clase  = resultado ? CLASES[resultado.clasificacion] : null
  const claseF = claseCorrecta ? CLASES[claseCorrecta] : null

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: '#f0f4f8', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* Header */}
      <div style={{ background: '#1a2e1a', color: '#fff', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ width: 38, height: 38, background: '#2d6a2d', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>☀️</div>
        <div>
          <div style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 18 }}>CSPM Vision AI</div>
          <div style={{ fontSize: 10, opacity: 0.65 }}>Clasificación inteligente de paneles solares</div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 40px', overflowX: 'hidden', boxSizing: 'border-box' }}>

        {/* ── FORMULARIO ── */}
        {!resultado && (
          <>
            <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', marginBottom: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 17, color: '#1a2e1a', marginBottom: 6 }}>Nuevo análisis</div>
              <div style={{ fontSize: 13, color: '#666' }}>Subí una o dos fotos del panel y la IA lo clasificará automáticamente.</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
              {([
                { label: '📷 Foto frente', preview: frentePreview, ref: frenteRef, tipo: 'frente' as const },
                { label: '📷 Foto dorso',  preview: dorsoPreview,  ref: dorsoRef,  tipo: 'dorso'  as const },
              ]).map(({ label, preview, ref, tipo }) => (
                <div key={tipo}>
                  <input type="file" accept="image/*" capture="environment" ref={ref}
                    onChange={e => e.target.files?.[0] && handleFile(e.target.files[0], tipo)}
                    style={{ display: 'none' }} />
                  <div onClick={() => ref.current?.click()}
                    style={{ border: `2px dashed ${preview ? '#2d6a2d' : '#ccc'}`, borderRadius: 12, minHeight: 160, cursor: 'pointer', background: preview ? '#000' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                    {preview
                      ? <img src={preview} style={{ width: '100%', maxHeight: 220, objectFit: 'contain' }} alt={tipo} />
                      : <div style={{ textAlign: 'center', padding: 20 }}>
                          <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
                          <div style={{ fontSize: 13, color: '#888', fontWeight: 600 }}>{label}</div>
                          <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>Tocá para subir</div>
                        </div>
                    }
                    {preview && (
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 11, padding: '5px 8px', textAlign: 'center' }}>
                        ✅ {label} · Tocá para cambiar
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 14, color: '#b91c1c', fontSize: 13 }}>
                ⚠️ {error}
              </div>
            )}

            <button onClick={analizar} disabled={analizando || (!frenteFile && !dorsoFile)}
              style={{ width: '100%', background: analizando ? '#aaa' : '#2d6a2d', color: '#fff', border: 'none', borderRadius: 10, padding: 14, fontSize: 16, fontWeight: 700, cursor: analizando ? 'not-allowed' : 'pointer' }}>
              {analizando ? '⏳ Analizando con IA...' : '🔍 Analizar panel'}
            </button>
            {analizando && (
              <div style={{ textAlign: 'center', color: '#666', fontSize: 13, marginTop: 10 }}>
                CSPM Vision AI analizando el panel...
              </div>
            )}
          </>
        )}

        {/* ── RESULTADO ── */}
        {resultado && clase && (
          <div>

            {/* Fotos */}
            {(frentePreview || dorsoPreview) && (
              <div style={{ display: 'grid', gridTemplateColumns: frentePreview && dorsoPreview ? '1fr 1fr' : '1fr', gap: 10, marginBottom: 14 }}>
                {frentePreview && (
                  <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #ddd' }}>
                    <img src={frentePreview} style={{ width: '100%', maxHeight: 180, objectFit: 'contain', background: '#000' }} alt="frente" />
                    <div style={{ background: '#f0f0f0', padding: '4px 10px', fontSize: 11, textAlign: 'center', color: '#555' }}>Frente</div>
                  </div>
                )}
                {dorsoPreview && (
                  <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #ddd' }}>
                    <img src={dorsoPreview} style={{ width: '100%', maxHeight: 180, objectFit: 'contain', background: '#000' }} alt="dorso" />
                    <div style={{ background: '#f0f0f0', padding: '4px 10px', fontSize: 11, textAlign: 'center', color: '#555' }}>Dorso</div>
                  </div>
                )}
              </div>
            )}

            {/* Alerta limpieza */}
            {resultado.requiere_limpieza && (
              <div style={{ background: '#fffbe6', border: '1px solid #f0d000', borderRadius: 10, padding: '12px 16px', marginBottom: 14, display: 'flex', gap: 10 }}>
                <span style={{ fontSize: 20 }}>🧹</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#8a5000', fontSize: 14 }}>Panel requiere limpieza previa</div>
                  <div style={{ fontSize: 12, color: '#a07020', marginTop: 2 }}>Limpiar antes de confirmar la clasificación.</div>
                </div>
              </div>
            )}

            {/* Info del panel */}
            {resultado.panel_info?.marca !== 'No visible' && (
              <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: '#1a2e1a', marginBottom: 12 }}>📋 Información del panel</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  {[{ l: 'Marca', v: resultado.panel_info.marca }, { l: 'Modelo', v: resultado.panel_info.modelo }]
                    .filter(x => x.v && x.v !== 'No visible')
                    .map(x => (
                      <div key={x.l} style={{ background: '#f8f8f8', borderRadius: 8, padding: '8px 12px' }}>
                        <div style={{ fontSize: 11, color: '#888' }}>{x.l}</div>
                        <div style={{ fontWeight: 700, color: '#1a2e1a', fontSize: 14 }}>{x.v}</div>
                      </div>
                    ))}
                </div>
                {resultado.panel_info.parametros_nominales && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                    {Object.entries(resultado.panel_info.parametros_nominales)
                      .filter(([, v]) => v !== 'No visible')
                      .map(([k, v]) => (
                        <div key={k} style={{ background: '#f0f7f0', borderRadius: 8, padding: '6px 10px', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: '#2d6a2d', fontWeight: 700 }}>{k.toUpperCase()}</div>
                          <div style={{ fontSize: 13, color: '#1a2e1a', fontWeight: 700 }}>{v as string}</div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Clasificación */}
            {!corrGuardada ? (
              <div style={{ background: clase.bg, border: `2px solid ${clase.color}`, borderRadius: 14, padding: '20px', marginBottom: 14, textAlign: 'center' }}>
                {resultado.requiere_limpieza && (
                  <div style={{ fontSize: 11, background: 'rgba(0,0,0,0.08)', borderRadius: 20, padding: '3px 12px', display: 'inline-block', marginBottom: 8, color: clase.color }}>PROVISIONAL</div>
                )}
                <div style={{ fontSize: 40 }}>{clase.icon}</div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 900, color: clase.color, margin: '6px 0 4px' }}>{clase.label}</div>
                <div style={{ fontSize: 14, color: clase.color }}>{clase.desc}</div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10 }}>
                  <div style={{ background: clase.color, color: '#fff', borderRadius: 20, padding: '4px 16px', fontSize: 13, fontWeight: 700 }}>
                    Confianza: {resultado.confianza}%
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.08)', color: clase.color, borderRadius: 20, padding: '4px 16px', fontSize: 13, fontWeight: 700 }}>
                    Certeza: {resultado.clasificacion_certeza}
                  </div>
                </div>
                <div style={{ height: 8, background: 'rgba(0,0,0,0.1)', borderRadius: 4, marginTop: 12 }}>
                  <div style={{ height: '100%', background: clase.color, borderRadius: 4, width: `${resultado.confianza}%` }} />
                </div>
              </div>
            ) : claseF && (
              <div style={{ background: claseF.bg, border: `2px solid ${claseF.color}`, borderRadius: 14, padding: '20px', marginBottom: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>CORREGIDA POR OPERARIO</div>
                <div style={{ fontSize: 40 }}>{claseF.icon}</div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 900, color: claseF.color, margin: '6px 0 4px' }}>{claseF.label}</div>
                <div style={{ fontSize: 14, color: claseF.color }}>{claseF.desc}</div>
                {motivo && <div style={{ marginTop: 10, fontSize: 13, color: '#555', fontStyle: 'italic' }}>"{motivo}"</div>}
                <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>IA sugirió: {clase.label} ({resultado.confianza}%)</div>
              </div>
            )}

            {/* Inspección */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden', width: '100%' }}>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: '#1a2e1a', marginBottom: 12 }}>Inspección por componente</div>
              {/* {Object.entries(resultado.inspeccion).map(([key, val]: [string, any]) => {
                const estado  = val?.estado || val
                const certeza = val?.certeza
                const nota    = val?.nota
                const c = getColor(estado)
                const certezaColor = certeza === 'Alta' ? '#2d6a2d' : certeza === 'Media' ? '#e65100' : '#b91c1c'
                return (
                  <div key={key} style={{ padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontSize: 14, color: '#333', flexShrink: 0 }}>{INSP_LABELS[key] || key}</span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {certeza && (
                          <span style={{ fontSize: 10, color: certezaColor, fontWeight: 700 }}>
                            {certeza === 'Alta' ? '✓' : certeza === 'Media' ? '~' : '?'} {certeza}
                          </span>
                        )}
                        <span style={{ fontSize: 12, fontWeight: 700, background: c.bg, color: c.color, padding: '4px 12px', borderRadius: 20 }}>{estado}</span>
                      </div>
                    </div>
                    {nota && <div style={{ fontSize: 11, color: '#888', marginTop: 4, fontStyle: 'italic', wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: 1.5 }}>→ {nota}</div>}
                  </div>
                )
              })} */}
           {Object.entries(resultado.inspeccion).map(([key, val]: [string, any]) => {
              const estado  = val?.estado || val
              const certeza = val?.certeza
              const nota    = val?.nota
              const c = getColor(estado)
              const certezaColor = certeza === 'Alta' ? '#2d6a2d' : certeza === 'Media' ? '#e65100' : '#b91c1c'
              return (
                // <div key={key} style={{ marginBottom: 10, borderRadius: 8, background: c.bg, border: `1px solid ${c.color}22`, padding: '10px 14px' }}>
                <div key={key} style={{ marginBottom: 10, borderRadius: 8, background: c.bg, border: `1px solid ${c.color}22`, padding: '10px 14px', overflow: 'hidden', width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: nota ? 6 : 0 }}>
                    <span style={{ fontSize: 13, color: '#333', fontWeight: 600 }}>
                      {INSP_LABELS[key] || key}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 8 }}>
                      {certeza && (
                        <span style={{ fontSize: 10, color: certezaColor, fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {certeza === 'Alta' ? '✓' : certeza === 'Media' ? '~' : '?'} {certeza}
                        </span>
                      )}
                      <span style={{ fontSize: 12, fontWeight: 700, color: c.color, whiteSpace: 'nowrap' }}>
                        {estado}
                      </span>
                    </div>
                  </div>
                  {nota && (
                    <div style={{ fontSize: 11, color: '#666', lineHeight: 1.6, wordBreak: 'break-word', marginTop: 4 }}>
                      → {nota}
                    </div>
                  )}
                </div>
              )
            })}
            </div>

            {/* Diagnóstico */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: '#1a2e1a', marginBottom: 10 }}>Diagnóstico</div>
              <div style={{ fontSize: 14, color: '#444', lineHeight: 1.6 }}>{resultado.justificacion}</div>
            </div>

            {/* Alertas */}
            {resultado.alertas?.length > 0 && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '16px 20px', marginBottom: 14 }}>
                <div style={{ fontWeight: 700, color: '#b91c1c', marginBottom: 10 }}>⚠️ Alertas</div>
                {resultado.alertas.map((a: string, i: number) => (
                  <div key={i} style={{ fontSize: 13, color: '#b91c1c', padding: '4px 0' }}>• {a}</div>
                ))}
              </div>
            )}

            {/* Recomendaciones */}
            {resultado.recomendaciones?.length > 0 && (
              <div style={{ background: '#f0f7f0', border: '1px solid #c3dfc3', borderRadius: 12, padding: '16px 20px', marginBottom: 14 }}>
                <div style={{ fontWeight: 700, color: '#2d6a2d', marginBottom: 10 }}>💡 Recomendaciones</div>
                {resultado.recomendaciones.map((r: string, i: number) => (
                  <div key={i} style={{ fontSize: 13, color: '#2d6a2d', padding: '4px 0' }}>• {r}</div>
                ))}
              </div>
            )}

            {/* ── ACCIONES ── */}

            {/* Guardado OK */}
            {guardadoOk && (
              <div style={{ background: '#f0f7f0', border: '1px solid #2d6a2d', borderRadius: 10, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>✅</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#2d6a2d', fontSize: 14 }}>Análisis guardado en base de datos</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>ID: {analisisId?.slice(0, 8)}...</div>
                </div>
              </div>
            )}

            {/* Botones principales */}
            {!corrGuardada && !corregida && !guardadoOk && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <button onClick={confirmar} disabled={guardando}
                  style={{ background: '#2d6a2d', color: '#fff', border: 'none', borderRadius: 10, padding: 13, fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: guardando ? 0.7 : 1 }}>
                  {guardando ? '⏳ Guardando...' : '✅ Confirmar y guardar'}
                </button>
                <button onClick={() => setCorregida(true)}
                  style={{ background: '#fff', color: '#e65100', border: '2px solid #e65100', borderRadius: 10, padding: 13, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  ✏️ Corregir clase
                </button>
              </div>
            )}

            {/* Botones post-guardado */}
            {guardadoOk && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <button onClick={resetear}
                  style={{ background: '#2d6a2d', color: '#fff', border: 'none', borderRadius: 10, padding: 13, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  + Nuevo análisis
                </button>
                <button onClick={descargarPDF} disabled={descargando}
                  style={{ background: '#1a4a5a', color: '#fff', border: 'none', borderRadius: 10, padding: 13, fontSize: 14, fontWeight: 700, cursor: descargando ? 'not-allowed' : 'pointer', opacity: descargando ? 0.7 : 1 }}>
                  {descargando ? '⏳ Generando...' : '📄 Descargar PDF'}
                </button>
              </div>
            )}

            {/* Panel corrección */}
            {corregida && !corrGuardada && (
              <div style={{ background: '#fff', border: '2px solid #e65100', borderRadius: 12, padding: '18px 20px', marginTop: 10 }}>
                <div style={{ fontWeight: 700, color: '#e65100', marginBottom: 14 }}>✏️ Corregir clasificación</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                  {Object.entries(CLASES).map(([id, c]) => (
                    <div key={id} onClick={() => setClaseCorrecta(id)}
                      style={{ border: `2px solid ${claseCorrecta === id ? c.color : '#ddd'}`, background: claseCorrecta === id ? c.bg : '#fff', borderRadius: 10, padding: 12, cursor: 'pointer', textAlign: 'center' }}>
                      <div style={{ fontSize: 22 }}>{c.icon}</div>
                      <div style={{ fontWeight: 700, color: c.color, fontSize: 14 }}>{c.label}</div>
                      <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{c.desc}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Motivo (opcional)</label>
                  <textarea value={motivo} onChange={e => setMotivo(e.target.value)}
                    placeholder="Ej: El daño es mayor al detectado por la IA..."
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 13, height: 70, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button onClick={() => setCorregida(false)}
                    style={{ background: '#f0f0f0', border: 'none', borderRadius: 8, padding: 11, cursor: 'pointer', fontSize: 14 }}>
                    Cancelar
                  </button>
                  <button onClick={guardarCorreccion} disabled={guardando}
                    style={{ background: '#e65100', color: '#fff', border: 'none', borderRadius: 8, padding: 11, fontWeight: 700, cursor: 'pointer', fontSize: 14, opacity: guardando ? 0.7 : 1 }}>
                    {guardando ? '⏳ Guardando...' : 'Guardar corrección'}
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  )
}
