import { createClient } from './supabase'

export const guardarAnalisis = async (
  resultado: any,
  clasificacionFinal: string,
  fueCorregida: boolean,
  motivoCorreccion: string,
  frenteFile: File | null,
  dorsoFile: File | null
): Promise<string | null> => {
  const supabase = createClient()

  try {
    let imagenFrenteUrl = null
    let imagenDorsoUrl  = null

    // Subir imagen frente
    if (frenteFile) {
      const nombre = `frente_${Date.now()}.${frenteFile.name.split('.').pop()}`
      const { data, error } = await supabase.storage
        .from('vision-imagenes')
        .upload(nombre, frenteFile, { contentType: frenteFile.type })
      if (!error && data) {
        const { data: urlData } = supabase.storage
          .from('vision-imagenes')
          .getPublicUrl(data.path)
        imagenFrenteUrl = urlData.publicUrl
      }
    }

    // Subir imagen dorso
    if (dorsoFile) {
      const nombre = `dorso_${Date.now()}.${dorsoFile.name.split('.').pop()}`
      const { data, error } = await supabase.storage
        .from('vision-imagenes')
        .upload(nombre, dorsoFile, { contentType: dorsoFile.type })
      if (!error && data) {
        const { data: urlData } = supabase.storage
          .from('vision-imagenes')
          .getPublicUrl(data.path)
        imagenDorsoUrl = urlData.publicUrl
      }
    }

    // Guardar en tabla analisis
    const { data, error } = await supabase.from('analisis').insert({
      marca:   resultado.panel_info?.marca  !== 'No visible' ? resultado.panel_info?.marca  : null,
      modelo:  resultado.panel_info?.modelo !== 'No visible' ? resultado.panel_info?.modelo : null,

      nom_voc:  resultado.panel_info?.parametros_nominales?.voc  !== 'No visible' ? resultado.panel_info?.parametros_nominales?.voc  : null,
      nom_isc:  resultado.panel_info?.parametros_nominales?.isc  !== 'No visible' ? resultado.panel_info?.parametros_nominales?.isc  : null,
      nom_vmp:  resultado.panel_info?.parametros_nominales?.vmp  !== 'No visible' ? resultado.panel_info?.parametros_nominales?.vmp  : null,
      nom_imp:  resultado.panel_info?.parametros_nominales?.imp  !== 'No visible' ? resultado.panel_info?.parametros_nominales?.imp  : null,
      nom_pmax: resultado.panel_info?.parametros_nominales?.pmax !== 'No visible' ? resultado.panel_info?.parametros_nominales?.pmax : null,

      imagen_frente_url: imagenFrenteUrl,
      imagen_dorso_url:  imagenDorsoUrl,

      insp_marco:              resultado.inspeccion?.marco?.estado,
      insp_marco_certeza:      resultado.inspeccion?.marco?.certeza,
      insp_marco_nota:         resultado.inspeccion?.marco?.nota,
      insp_vidrio:             resultado.inspeccion?.vidrio?.estado,
      insp_vidrio_certeza:     resultado.inspeccion?.vidrio?.certeza,
      insp_vidrio_nota:        resultado.inspeccion?.vidrio?.nota,
      insp_backsheet:          resultado.inspeccion?.backsheet?.estado,
      insp_backsheet_certeza:  resultado.inspeccion?.backsheet?.certeza,
      insp_backsheet_nota:     resultado.inspeccion?.backsheet?.nota,
      insp_celulas:            resultado.inspeccion?.celulas?.estado,
      insp_celulas_certeza:    resultado.inspeccion?.celulas?.certeza,
      insp_celulas_nota:       resultado.inspeccion?.celulas?.nota,
      insp_caja:               resultado.inspeccion?.caja_conexiones?.estado,
      insp_caja_certeza:       resultado.inspeccion?.caja_conexiones?.certeza,
      insp_caja_nota:          resultado.inspeccion?.caja_conexiones?.nota,

      ia_clasificacion:    resultado.clasificacion,
      ia_confianza:        resultado.confianza,
      ia_certeza:          resultado.clasificacion_certeza,
      ia_justificacion:    resultado.justificacion,
      ia_alertas:          resultado.alertas,
      ia_recomendaciones:  resultado.recomendaciones,
      requiere_limpieza:   resultado.requiere_limpieza,

      clasificacion_final: clasificacionFinal,
      fue_corregida:       fueCorregida,
      motivo_correccion:   motivoCorreccion || null,
    }).select().single()

    if (error) { console.error(error); return null }
    return data.id

  } catch (err) {
    console.error(err)
    return null
  }
}