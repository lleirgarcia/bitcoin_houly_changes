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

    return {
      top3Positive,
      top3Negative
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

      <div className="space-y-4">
        {months.map((month, monthIndex) => {
          const monthStats = calculateMonthStats(month)
          const isOpen = openMonth === month.month
          
          return (
          <div key={monthIndex} className="bg-[#111111] border border-gray-700 rounded-lg overflow-hidden">
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
                {/* High Stats del Mes - Solo para modo previous_hour */}
                {comparisonMode === 'previous_hour' && monthStats && (
              <div className="mb-8 bg-[#0a0a0a] border border-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-200 mb-4 font-['Orbitron'] tracking-wider">
                  📊 TOP 3 HORAS SEGUIDAS (Días Laborables)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Top 3 Horas Seguidas Más Positivas */}
                  <div className="bg-green-900/10 border border-green-700/30 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-green-400 mb-3 font-mono">
                      🟢 TOP 3 HORAS SEGUIDAS MÁS POSITIVAS
                    </h4>
                    {monthStats.top3Positive.length > 0 ? (
                      <div className="space-y-2">
                        {monthStats.top3Positive.map((item, idx) => (
                          <div key={idx} className="bg-[#0a0a0a] border border-green-700/30 rounded p-3">
                            <div className="text-xs font-mono text-gray-400 mb-1">#{idx + 1}</div>
                            <div className="text-base font-bold text-green-400 font-mono">
                              De {item.startHour.toString().padStart(2, '0')}:00 a {item.endHour.toString().padStart(2, '0')}:00
                            </div>
                            <div className="text-xs font-mono text-green-400 mt-1">
                              Promedio: {formatChange(item.averageTotal)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 font-mono">No hay datos positivos</div>
                    )}
                  </div>

                  {/* Top 3 Horas Seguidas Más Negativas */}
                  <div className="bg-red-900/10 border border-red-700/30 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-red-400 mb-3 font-mono">
                      🔴 TOP 3 HORAS SEGUIDAS MÁS NEGATIVAS
                    </h4>
                    {monthStats.top3Negative.length > 0 ? (
                      <div className="space-y-2">
                        {monthStats.top3Negative.map((item, idx) => (
                          <div key={idx} className="bg-[#0a0a0a] border border-red-700/30 rounded p-3">
                            <div className="text-xs font-mono text-gray-400 mb-1">#{idx + 1}</div>
                            <div className="text-base font-bold text-red-400 font-mono">
                              De {item.startHour.toString().padStart(2, '0')}:00 a {item.endHour.toString().padStart(2, '0')}:00
                            </div>
                            <div className="text-xs font-mono text-red-400 mt-1">
                              Promedio: {formatChange(item.averageTotal)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 font-mono">No hay datos negativos</div>
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
                      
                      return (
                        <div key={dayIndex} className="border-b border-gray-700 pb-4 last:border-b-0 last:pb-0">
                          {/* Fecha y label de fin de semana arriba */}
                          <div className="flex items-center gap-2 mb-3">
                            <div className="text-sm font-medium text-gray-300 font-mono">
                              {formatDate(day.date)}
                            </div>
                            {stats.totalDayPercent !== null && stats.totalDayPercent !== 0 && (
                              <div className={`text-sm font-bold font-mono ${
                                stats.totalDayPercent > 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {formatChange(stats.totalDayPercent)}
                              </div>
                            )}
                            {isWeekendDay && (
                              <span className="px-2 py-1 bg-yellow-900/30 border border-yellow-700/50 rounded text-xs font-mono text-yellow-400" title="Día de fin de semana (sábado o domingo)">
                                WEEKEND
                              </span>
                            )}
                          </div>
                          
                          {/* Recuadros de horas y estadísticas en la misma fila */}
                          <div className="flex items-start gap-6">
                            {/* Recuadros compactos en 2 líneas (12 horas por línea) */}
                            <div className="space-y-1.5 flex-shrink-0">
                            {/* Primera línea: horas 0-11 */}
                            <div className="flex flex-wrap gap-1.5">
                              {Array.from({ length: 12 }, (_, i) => {
                                const hour = i
                                const hourData = day.hours.find(h => h.hour === hour)
                                const change = hourData?.changePercent ?? null
                                const priceToday = hourData?.price ?? null
                                const priceYesterday = hourData?.priceYesterday ?? null
                                
                                return (
                                  <div
                                    key={hour}
                                    className={`w-12 px-2 py-1.5 rounded border text-center text-xs font-mono transition-all hover:scale-110 relative group ${getChangeColor(change)}`}
                                  >
                                    <div className="text-[10px] text-gray-400 mb-0.5">
                                      {hour.toString().padStart(2, '0')}
                                    </div>
                                    <div className="text-xs font-bold">
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
                            
                            {/* Segunda línea: horas 12-23 */}
                            <div className="flex flex-wrap gap-1.5">
                              {Array.from({ length: 12 }, (_, i) => {
                                const hour = i + 12
                                const hourData = day.hours.find(h => h.hour === hour)
                                const change = hourData?.changePercent ?? null
                                const priceToday = hourData?.price ?? null
                                const priceYesterday = hourData?.priceYesterday ?? null
                                
                                return (
                                  <div
                                    key={hour}
                                    className={`w-12 px-2 py-1.5 rounded border text-center text-xs font-mono transition-all hover:scale-110 relative group ${getChangeColor(change)}`}
                                  >
                                    <div className="text-[10px] text-gray-400 mb-0.5">
                                      {hour.toString().padStart(2, '0')}
                                    </div>
                                    <div className="text-xs font-bold">
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
                            
                            {/* Estadísticas al lado, a la misma altura, en fila horizontal */}
                            <div className="flex flex-col gap-2 text-xs font-mono pt-0.5">
                              {/* Estadísticas principales en fila */}
                              <div className="flex items-center gap-4 flex-wrap">
                                <span className="text-green-400" title="Porcentaje de horas con cambio positivo sobre el total de horas con datos">
                                  +{stats.positivePercentage.toFixed(1)}% pos
                                </span>
                                {stats.maxGainHour !== null && (
                                  <span className="text-green-400" title="Hora con máxima ganancia (mayor cambio positivo)">
                                    Max: {stats.maxGainHour.toString().padStart(2, '0')}:00 ({formatChange(stats.maxGainValue)})
                                  </span>
                                )}
                                {stats.maxPositiveStreak > 0 && (
                                  <span className="text-green-400" title="Máximo de horas consecutivas con cambio positivo">
                                    {stats.maxPositiveStreak}h+ seg
                                  </span>
                                )}
                                {stats.maxNegativeStreak > 0 && (
                                  <span className="text-red-400" title="Máximo de horas consecutivas con cambio negativo">
                                    {stats.maxNegativeStreak}h- seg
                                  </span>
                                )}
                              </div>
                              
                              {/* Totales en fila */}
                              <div className="flex items-center gap-4">
                                <span className="text-green-400" title="Suma total de todos los cambios positivos del día">
                                  Total +: {stats.totalPositive.toFixed(2)}%
                                </span>
                                <span className="text-red-400" title="Suma total de todos los cambios negativos del día">
                                  Total -: {stats.totalNegative.toFixed(2)}%
                                </span>
                              </div>
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
          )
        })}
      </div>
    </div>
  )
}

export default HistoricalView
