import { useState, useEffect } from 'react'
import { getHistoricalDataByWeek, ComparisonMode } from '../services/binanceService'
import { formatPrice } from '../utils/formatNumber'

type MonthData = {
  month: string
  monthLabel: string
  weeks: Array<{
    weekStart: string
    weekEnd: string
    days: Array<{
      date: string
      hours: Array<{
        hour: number
        price: number
        priceYesterday: number | null
        priceChangePercent: number
        changePercent: number | null
      }>
    }>
  }>
}

const HistoricalView = () => {
  const [months, setMonths] = useState<MonthData[]>([])
  const [loading, setLoading] = useState(true)
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('hour_yesterday')
  const [openMonth, setOpenMonth] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const data = await getHistoricalDataByWeek(comparisonMode)
        setMonths(data)
        // Abrir el primer mes por defecto
        if (data.length > 0 && openMonth === null) {
          setOpenMonth(data[0].month)
        }
      } catch (error) {
        console.error('❌ Error cargando datos históricos:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [comparisonMode])

  // Abrir el primer mes cuando se cargan los datos por primera vez
  useEffect(() => {
    if (months.length > 0 && openMonth === null) {
      setOpenMonth(months[0].month)
    }
  }, [months])

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00Z')
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
  }

  const formatWeekRange = (weekStart: string, weekEnd: string): string => {
    const start = formatDate(weekStart)
    const end = formatDate(weekEnd)
    return `${start} - ${end}`
  }

  const getChangeColor = (change: number | null): string => {
    if (change === null) return 'bg-[#0a0a0a] text-gray-400 border-gray-700'
    if (change > 0) return 'bg-green-900/30 text-green-400 border-gray-700'
    if (change < 0) return 'bg-red-900/30 text-red-400 border-gray-700'
    return 'bg-[#0a0a0a] text-gray-300 border-gray-700'
  }

  const formatChange = (change: number | null): string => {
    if (change === null) return '--'
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(2)}%`
  }

  const isWeekend = (dateStr: string): boolean => {
    const date = new Date(dateStr + 'T00:00:00Z')
    const dayOfWeek = date.getUTCDay()
    return dayOfWeek === 0 || dayOfWeek === 6 // 0 = domingo, 6 = sábado
  }

  const calculateDayStats = (day: { date: string; hours: Array<{ hour: number; price: number; priceYesterday: number | null; priceChangePercent: number; changePercent: number | null }> }) => {
    const validHours = day.hours.filter(h => h.changePercent !== null)
    
    // Porcentaje positivo (cantidad de horas positivas / total de horas con datos)
    const positiveHours = validHours.filter(h => h.changePercent! > 0).length
    const positivePercentage = validHours.length > 0 ? (positiveHours / validHours.length) * 100 : 0
    
    // Hora de máxima ganancia
    const maxGainHour = validHours.reduce((max, h) => {
      if (!max || (h.changePercent! > max.changePercent)) {
        return { hour: h.hour, changePercent: h.changePercent! }
      }
      return max
    }, null as { hour: number; changePercent: number } | null)
    
    // Horas seguidas positivas y negativas
    let maxPositiveStreak = 0
    let maxNegativeStreak = 0
    let currentPositiveStreak = 0
    let currentNegativeStreak = 0
    
    validHours.forEach(h => {
      if (h.changePercent! > 0) {
        currentPositiveStreak++
        currentNegativeStreak = 0
        maxPositiveStreak = Math.max(maxPositiveStreak, currentPositiveStreak)
      } else if (h.changePercent! < 0) {
        currentNegativeStreak++
        currentPositiveStreak = 0
        maxNegativeStreak = Math.max(maxNegativeStreak, currentNegativeStreak)
      } else {
        currentPositiveStreak = 0
        currentNegativeStreak = 0
      }
    })
    
    // Porcentaje total positivo y negativo (suma de todos los cambios)
    const totalPositive = validHours
      .filter(h => h.changePercent! > 0)
      .reduce((sum, h) => sum + h.changePercent!, 0)
    
    const totalNegative = validHours
      .filter(h => h.changePercent! < 0)
      .reduce((sum, h) => sum + Math.abs(h.changePercent!), 0)
    
    // Porcentaje total del día (suma de todos los cambios)
    const totalDayPercent = validHours.reduce((sum, h) => sum + h.changePercent!, 0)
    
    return {
      positivePercentage,
      maxGainHour: maxGainHour?.hour ?? null,
      maxGainValue: maxGainHour?.changePercent ?? null,
      maxPositiveStreak,
      maxNegativeStreak,
      totalPositive,
      totalNegative,
      totalDayPercent
    }
  }

  // Calcular porcentaje positivo/negativo por hora para el mes
  const calculateHourTrends = (month: MonthData) => {
    // Obtener todos los días del mes excluyendo fines de semana
    const weekdays = month.weeks.flatMap(week => 
      week.days.filter(day => !isWeekend(day.date))
    )

    // Agrupar cambios por hora (0-23)
    const hoursData = new Map<number, number[]>()
    
    weekdays.forEach(day => {
      day.hours.forEach(hourData => {
        if (hourData.changePercent !== null) {
          if (!hoursData.has(hourData.hour)) {
            hoursData.set(hourData.hour, [])
          }
          hoursData.get(hourData.hour)!.push(hourData.changePercent)
        }
      })
    })

    // Calcular porcentaje positivo para cada hora
    const hourTrends = new Map<number, { positive: number; negative: number; total: number; percentage: number }>()
    
    for (let hour = 0; hour < 24; hour++) {
      const changes = hoursData.get(hour) || []
      if (changes.length === 0) {
        hourTrends.set(hour, { positive: 0, negative: 0, total: 0, percentage: 0 })
        continue
      }

      const positiveCount = changes.filter(c => c > 0).length
      const negativeCount = changes.filter(c => c < 0).length
      const totalCount = changes.length
      const positivePercentage = (positiveCount / totalCount) * 100

      hourTrends.set(hour, {
        positive: positiveCount,
        negative: negativeCount,
        total: totalCount,
        percentage: positivePercentage
      })
    }

    return hourTrends
  }

  // Calcular las 3 horas seguidas más positivas y negativas basadas en promedio del mes
  const calculateMonthStats = (month: MonthData) => {
    // Solo calcular si estamos en modo "previous_hour"
    if (comparisonMode !== 'previous_hour') {
      return null
    }

    // Obtener todos los días del mes excluyendo fines de semana
    const weekdays = month.weeks.flatMap(week => 
      week.days.filter(day => !isWeekend(day.date))
    )

    // Agrupar cambios por hora (0-23) para calcular promedios
    const hoursData = new Map<number, number[]>()
    
    weekdays.forEach(day => {
      day.hours.forEach(hourData => {
        if (hourData.changePercent !== null) {
          if (!hoursData.has(hourData.hour)) {
            hoursData.set(hourData.hour, [])
          }
          hoursData.get(hourData.hour)!.push(hourData.changePercent)
        }
      })
    })

    // Calcular promedio para cada hora (0-23)
    const hourAverages = new Map<number, number>()
    for (let hour = 0; hour < 24; hour++) {
      const changes = hoursData.get(hour) || []
      if (changes.length > 0) {
        const average = changes.reduce((sum, val) => sum + val, 0) / changes.length
        hourAverages.set(hour, average)
      }
    }

    // Buscar grupos de 3 horas consecutivas y calcular su promedio total
    const consecutive3Groups: Array<{ startHour: number; endHour: number; averageTotal: number }> = []
    
    for (let startHour = 0; startHour <= 21; startHour++) {
      const hour1 = hourAverages.get(startHour)
      const hour2 = hourAverages.get(startHour + 1)
      const hour3 = hourAverages.get(startHour + 2)
      
      // Solo considerar si las 3 horas tienen datos
      if (hour1 !== undefined && hour2 !== undefined && hour3 !== undefined) {
        const averageTotal = hour1 + hour2 + hour3
        consecutive3Groups.push({
          startHour,
          endHour: startHour + 2,
          averageTotal
        })
      }
    }

    // Ordenar y obtener top 3 positivas y negativas
    const top3Positive = consecutive3Groups
      .filter(g => g.averageTotal > 0)
      .sort((a, b) => b.averageTotal - a.averageTotal)
      .slice(0, 3)

    const top3Negative = consecutive3Groups
      .filter(g => g.averageTotal < 0)
      .sort((a, b) => a.averageTotal - b.averageTotal)
      .slice(0, 3)

    // Calcular horas consistentemente positivas y negativas (siempre se repiten)
    // Una hora es "consistente" si tiene el mismo signo en >80% de los días
    const consistentHours: {
      positive: number[]
      negative: number[]
    } = {
      positive: [],
      negative: []
    }

    for (let hour = 0; hour < 24; hour++) {
      const changes = hoursData.get(hour) || []
      if (changes.length === 0) continue

      const positiveCount = changes.filter(c => c > 0).length
      const negativeCount = changes.filter(c => c < 0).length
      const zeroCount = changes.filter(c => c === 0).length
      const totalCount = changes.length
      
      const positivePercentage = (positiveCount / totalCount) * 100
      const negativePercentage = (negativeCount / totalCount) * 100

      // Debug: mostrar horas con datos significativos
      if (totalCount >= 5) { // Solo mostrar si hay al menos 5 días de datos
        console.log(`Hora ${hour.toString().padStart(2, '0')}:00 - Total: ${totalCount}, Positivas: ${positiveCount} (${positivePercentage.toFixed(1)}%), Negativas: ${negativeCount} (${negativePercentage.toFixed(1)}%), Ceros: ${zeroCount}`)
      }

      // Si >=80% de las veces es positiva, es consistentemente positiva
      if (positivePercentage >= 80) {
        consistentHours.positive.push(hour)
        console.log(`✅ Hora ${hour.toString().padStart(2, '0')}:00 es consistentemente POSITIVA (${positivePercentage.toFixed(1)}%)`)
      }
      
      // Si >=80% de las veces es negativa, es consistentemente negativa
      if (negativePercentage >= 80) {
        consistentHours.negative.push(hour)
        console.log(`❌ Hora ${hour.toString().padStart(2, '0')}:00 es consistentemente NEGATIVA (${negativePercentage.toFixed(1)}%)`)
      }
    }

    // Debug: resumen final
    console.log(`📊 Horas consistentemente positivas: [${consistentHours.positive.join(', ')}]`)
    console.log(`📊 Horas consistentemente negativas: [${consistentHours.negative.join(', ')}]`)

    return {
      top3Positive,
      top3Negative,
      consistentHours
    }
  }

  if (loading) {
    return (
      <div className="w-full">
        <h2 className="text-2xl font-semibold text-gray-300 mb-2 font-['Orbitron'] tracking-wider">
          HISTÓRICO
        </h2>
        <p className="text-xs text-gray-300 font-mono mb-6">
          [LOADING_DATA...]
        </p>
        <div className="animate-pulse">
          <div className="bg-[#0a0a0a] border border-gray-800 p-4 rounded h-32"></div>
        </div>
      </div>
    )
  }

  if (months.length === 0) {
    return (
      <div className="w-full">
        <h2 className="text-2xl font-semibold text-gray-300 mb-2 font-['Orbitron'] tracking-wider">
          HISTÓRICO
        </h2>
        <p className="text-xs text-gray-300 font-mono mb-6">
          [NO_DATA_AVAILABLE]
        </p>
        <div className="bg-[#0a0a0a] border border-gray-700 p-6 rounded text-center">
          <p className="text-gray-300 font-mono">No hay datos históricos disponibles</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[95vw] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-100 font-['Orbitron'] tracking-wider">
          HISTÓRICO
        </h2>
        {/* Botones cuadrados con labels */}
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault()
              setComparisonMode('hour_yesterday')
            }}
            className={`px-4 py-2 border rounded text-xs font-mono transition-all ${
              comparisonMode === 'hour_yesterday'
                ? 'bg-gray-700 border-gray-600 text-gray-100'
                : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600'
            }`}
          >
            compare with hour yesterday
          </button>
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault()
              setComparisonMode('previous_hour')
            }}
            className={`px-4 py-2 border rounded text-xs font-mono transition-all ${
              comparisonMode === 'previous_hour'
                ? 'bg-gray-700 border-gray-600 text-gray-100'
                : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600'
            }`}
          >
            compare with previous hour
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-300 font-mono mb-6">
        [MONTHLY_DATA] :: Cambio porcentual según modo seleccionado
      </p>

      <div className="space-y-8">
        {months.map((month, monthIndex) => {
          const monthStats = calculateMonthStats(month)
          const isOpen = openMonth === month.month
          
          return (
          <div key={monthIndex}>
            {/* Separador visual entre meses */}
            {monthIndex > 0 && (
              <div className="mb-6 border-t border-gray-600"></div>
            )}
            <div className="bg-[#111111] border border-gray-700 rounded-lg overflow-hidden">
            {/* Header clickeable del mes */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                setOpenMonth(isOpen ? null : month.month)
              }}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
            >
              <h2 className="text-xl font-semibold text-gray-100 font-['Orbitron'] tracking-wider">
                {month.monthLabel}
              </h2>
              <div className="text-gray-400">
                <svg
                  className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            
            {/* Contenido del mes (solo visible si está abierto) */}
            {isOpen && (
              <div className="px-6 pb-6">
                {/* Línea de tendencias por hora - muestra qué horas suelen ser positivas/negativas */}
                <div className="mb-6">
                  <div className="text-xs text-gray-400 font-mono mb-2">TENDENCIAS POR HORA (positivas/negativas en el mes)</div>
                  <div className="flex gap-1">
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i
                      const hourTrends = calculateHourTrends(month)
                      const trend = hourTrends.get(hour)
                      
                      if (!trend || trend.total === 0) {
                        return (
                          <div
                            key={hour}
                            className="w-10 px-1.5 py-2 rounded border text-center text-xs font-mono bg-[#0a0a0a] text-gray-500 border-gray-700 flex-shrink-0"
                            title={`Hora ${hour.toString().padStart(2, '0')}:00 - Sin datos`}
                          >
                            <div className="text-[9px] text-gray-500 mb-0.5">
                              {hour.toString().padStart(2, '0')}
                            </div>
                            <div className="text-[10px]">—</div>
                          </div>
                        )
                      }
                      
                      // Verde si >50% positivo, rojo si >50% negativo, gris si empate
                      const isPositive = trend.percentage > 50
                      const isNegative = trend.percentage < 50
                      const isTie = trend.percentage === 50
                      
                      const bgColor = isPositive 
                        ? 'bg-green-900/30 text-green-400 border-green-700' 
                        : isNegative 
                        ? 'bg-red-900/30 text-red-400 border-red-700'
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                      
                      return (
                        <div
                          key={hour}
                          className={`w-10 px-1.5 py-2 rounded border text-center text-xs font-mono flex-shrink-0 ${bgColor}`}
                          title={`Hora ${hour.toString().padStart(2, '0')}:00 - ${trend.positive} positivas (${trend.percentage.toFixed(1)}%), ${trend.negative} negativas, ${trend.total} total`}
                        >
                          <div className="text-[9px] text-gray-400 mb-0.5">
                            {hour.toString().padStart(2, '0')}
                          </div>
                          <div className="text-[10px] font-bold">
                            {isPositive ? '+' : isNegative ? '−' : '='}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                {/* High Stats del Mes - Solo para modo previous_hour */}
                {comparisonMode === 'previous_hour' && monthStats && (
              <div className="mb-6 space-y-4">
                {/* Top 3 Horas Seguidas */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-400 font-mono mb-2">TOP 3 POSITIVAS</div>
                    {monthStats.top3Positive.length > 0 ? (
                      <div className="space-y-1">
                        {monthStats.top3Positive.map((item, idx) => (
                          <div key={idx} className="text-sm font-mono text-green-400">
                            {item.startHour.toString().padStart(2, '0')}-{item.endHour.toString().padStart(2, '0')} {formatChange(item.averageTotal)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 font-mono">—</div>
                    )}
                  </div>
                  
                  <div>
                    <div className="text-xs text-gray-400 font-mono mb-2">TOP 3 NEGATIVAS</div>
                    {monthStats.top3Negative.length > 0 ? (
                      <div className="space-y-1">
                        {monthStats.top3Negative.map((item, idx) => (
                          <div key={idx} className="text-sm font-mono text-red-400">
                            {item.startHour.toString().padStart(2, '0')}-{item.endHour.toString().padStart(2, '0')} {formatChange(item.averageTotal)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 font-mono">—</div>
                    )}
                  </div>
                </div>

                {/* Horas Consistentes */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-700">
                  <div>
                    <div className="text-xs text-gray-400 font-mono mb-2">HORAS SIEMPRE +</div>
                    {monthStats.consistentHours.positive.length > 0 ? (
                      <div className="text-sm font-mono text-green-400">
                        {monthStats.consistentHours.positive.map(h => h.toString().padStart(2, '0')).join(', ')}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 font-mono">—</div>
                    )}
                  </div>
                  
                  <div>
                    <div className="text-xs text-gray-400 font-mono mb-2">HORAS SIEMPRE -</div>
                    {monthStats.consistentHours.negative.length > 0 ? (
                      <div className="text-sm font-mono text-red-400">
                        {monthStats.consistentHours.negative.map(h => h.toString().padStart(2, '0')).join(', ')}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 font-mono">—</div>
                    )}
                  </div>
                </div>
              </div>
                )}
                
                <div className="space-y-8 mt-6">
              {month.weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="border-l-2 border-gray-600 pl-4">
                  <h3 className="text-base font-semibold text-gray-300 mb-4 font-mono">
                    Semana: {formatWeekRange(week.weekStart, week.weekEnd)}
                  </h3>
                  
                  <div className="space-y-4">
                    {week.days.map((day, dayIndex) => {
                      const stats = calculateDayStats(day)
                      const isWeekendDay = isWeekend(day.date)
                      
                      // Calcular movimiento del día actual vs día anterior
                      // Usar el precio de la hora 0 del día actual
                      const currentDayHour0 = day.hours.find(h => h.hour === 0)
                      const currentDayPrice = currentDayHour0?.price ?? null
                      
                      // Buscar día anterior
                      let previousDayPrice: number | null = null
                      let dayMovement: number | null = null
                      
                      // Buscar en la misma semana primero
                      if (dayIndex > 0) {
                        const prevDay = week.days[dayIndex - 1]
                        // Usar la hora 0 del día anterior, o si no existe, la hora 23
                        const prevDayHour0 = prevDay.hours.find(h => h.hour === 0)
                        const prevDayHour23 = prevDay.hours.find(h => h.hour === 23)
                        previousDayPrice = prevDayHour0?.price ?? prevDayHour23?.price ?? null
                      } else {
                        // Si es el primer día de la semana, buscar en todas las semanas del mes
                        const prevDate = new Date(day.date + 'T00:00:00Z')
                        prevDate.setUTCDate(prevDate.getUTCDate() - 1)
                        const prevDateStr = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, '0')}-${String(prevDate.getUTCDate()).padStart(2, '0')}`
                        
                        // Buscar en todas las semanas del mes
                        const allDays = month.weeks.flatMap(w => w.days)
                        const prevDay = allDays.find(d => d.date === prevDateStr)
                        if (prevDay) {
                          // Preferir hora 0, sino hora 23
                          const prevDayHour0 = prevDay.hours.find(h => h.hour === 0)
                          const prevDayHour23 = prevDay.hours.find(h => h.hour === 23)
                          previousDayPrice = prevDayHour0?.price ?? prevDayHour23?.price ?? null
                        }
                      }
                      
                      // Calcular movimiento: diferencia entre precio hora 0 del día actual vs precio hora 0 (o 23) del día anterior
                      if (currentDayPrice !== null && previousDayPrice !== null) {
                        dayMovement = ((currentDayPrice - previousDayPrice) / previousDayPrice) * 100
                      }
                      
                      return (
                        <div key={dayIndex} className="border-b border-gray-700 pb-4 last:border-b-0 last:pb-0">
                          {/* Todo en una sola línea: Día → Estadísticas → Movimiento → Total → Weekend → Cuadrados */}
                          <div className="flex items-center gap-3 flex-wrap">
                            {/* Día */}
                            <div className="text-sm font-medium text-gray-300 font-mono flex-shrink-0">
                              {formatDate(day.date)}
                            </div>
                            
                            {/* Estadísticas */}
                            <div className="flex items-center gap-3 text-xs font-mono flex-shrink-0">
                              <span className="text-green-400" title="Porcentaje de horas con cambio positivo">
                                +{stats.positivePercentage.toFixed(1)}% pos
                              </span>
                              {stats.maxGainHour !== null && (
                                <span className="text-green-400" title="Hora con máxima ganancia">
                                  Max: {stats.maxGainHour.toString().padStart(2, '0')}:00 ({formatChange(stats.maxGainValue)})
                                </span>
                              )}
                              {stats.maxPositiveStreak > 0 && (
                                <span className="text-green-400" title="Máximo de horas consecutivas positivas">
                                  {stats.maxPositiveStreak}h+ seg
                                </span>
                              )}
                              {stats.maxNegativeStreak > 0 && (
                                <span className="text-red-400" title="Máximo de horas consecutivas negativas">
                                  {stats.maxNegativeStreak}h- seg
                                </span>
                              )}
                              <span className="text-green-400" title="Suma total de cambios positivos">
                                Total +: {stats.totalPositive.toFixed(2)}%
                              </span>
                              <span className="text-red-400" title="Suma total de cambios negativos">
                                Total -: {stats.totalNegative.toFixed(2)}%
                              </span>
                            </div>
                            
                            {/* Movimiento del día vs día anterior */}
                            {dayMovement !== null && (
                              <div className={`text-sm font-bold font-mono flex-shrink-0 ${
                                dayMovement > 0 ? 'text-green-400' : dayMovement < 0 ? 'text-red-400' : 'text-gray-400'
                              }`} title="Movimiento del día actual vs día anterior (precio hora 0)">
                                Día: {formatChange(dayMovement)}
                              </div>
                            )}
                            
                            {/* Total del día */}
                            {stats.totalDayPercent !== null && stats.totalDayPercent !== 0 && (
                              <div className={`text-sm font-bold font-mono flex-shrink-0 ${
                                stats.totalDayPercent > 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {formatChange(stats.totalDayPercent)}
                              </div>
                            )}
                            
                            {/* Weekend label */}
                            {isWeekendDay && (
                              <span className="px-2 py-1 bg-yellow-900/30 border border-yellow-700/50 rounded text-xs font-mono text-yellow-400 flex-shrink-0" title="Día de fin de semana (sábado o domingo)">
                                WEEKEND
                              </span>
                            )}
                            
                            {/* Todos los cuadrados de horas */}
                            <div className="flex gap-1 flex-shrink-0">
                            {Array.from({ length: 24 }, (_, i) => {
                              const hour = i
                              const hourData = day.hours.find(h => h.hour === hour)
                              const change = hourData?.changePercent ?? null
                              const priceToday = hourData?.price ?? null
                              const priceYesterday = hourData?.priceYesterday ?? null
                              
                              return (
                                <div
                                  key={hour}
                                  className={`w-10 px-1.5 py-1 rounded border text-center text-xs font-mono transition-all hover:scale-110 relative group flex-shrink-0 ${getChangeColor(change)}`}
                                >
                                  <div className="text-[9px] text-gray-400 mb-0.5">
                                    {hour.toString().padStart(2, '0')}
                                  </div>
                                  <div className="text-[10px] font-bold leading-tight">
                                    {formatChange(change)}
                                  </div>
                                  
                                  {/* Tooltip con precios en hover */}
                                  {priceToday !== null && (
                                    <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-10 bg-[#1a1a1a] border border-gray-600 rounded p-2 text-xs font-mono whitespace-nowrap shadow-lg">
                                      <div className="text-gray-300 mb-1">Hora {hour.toString().padStart(2, '0')}:00</div>
                                      {priceYesterday !== null ? (
                                        <>
                                          <div className="text-gray-400">Ayer: {formatPrice(priceYesterday, 0)}</div>
                                          <div className="text-gray-200">Hoy: {formatPrice(priceToday, 0)}</div>
                                          <div className={`mt-1 ${change !== null && change > 0 ? 'text-green-400' : change !== null && change < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                            {formatChange(change)}
                                          </div>
                                        </>
                                      ) : (
                                        <div className="text-gray-200">Hoy: {formatPrice(priceToday, 0)}</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
                </div>
              </div>
            )}
            </div>
          </div>
          )
        })}
      </div>
    </div>
  )
}

export default HistoricalView
