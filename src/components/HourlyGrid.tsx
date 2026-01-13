import { useState, useEffect } from 'react'
import { get24HourGrid, getHourlyDataWithLatest } from '../services/binanceService'
import { formatPrice } from '../utils/formatNumber'

type GridItem = {
  hour: number
  changePercent: number | null
  price: number | null
}

type HourlyDataItem = {
  hour: number
  price: number | null
  priceYesterday: number | null
  changePercent: number | null
  latestPrice: number | null
  latestTimestamp: number | null
}

const HourlyGrid = () => {
  const [grid, setGrid] = useState<GridItem[]>([])
  const [hourlyData, setHourlyData] = useState<HourlyDataItem[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'comparison' | 'hourly'>('comparison')

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [comparisonData, hourlyDataResult] = await Promise.all([
          get24HourGrid(),
          getHourlyDataWithLatest()
        ])
        console.log('📊 Datos cargados para el grid:', comparisonData.length, 'horas')
        setGrid(comparisonData)
        setHourlyData(hourlyDataResult)
      } catch (error) {
        console.error('❌ Error cargando grid:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const formatHour = (hour: number): string => {
    return `${hour.toString().padStart(2, '0')}:00`
  }

  const getChangeColor = (change: number | null): string => {
    if (change === null) return 'bg-[#0a0a0a] text-gray-400 border-gray-700'
    if (change > 0) return 'bg-green-900/30 text-green-400 border-gray-700 hover:border-gray-600'
    if (change < 0) return 'bg-red-900/30 text-red-400 border-gray-700 hover:border-gray-600'
    return 'bg-[#0a0a0a] text-gray-300 border-gray-700'
  }

  const formatChange = (change: number | null): string => {
    if (change === null) return '--'
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(2)}%`
  }

  const formatPriceDifference = (priceToday: number, priceYesterday: number): string => {
    const difference = priceToday - priceYesterday
    const sign = difference >= 0 ? '+' : ''
    return `${sign}${formatPrice(Math.abs(difference), 0)}`
  }

  if (loading) {
    return (
      <div className="w-full">
        <h2 className="text-2xl font-semibold text-gray-300 mb-2 font-['Orbitron'] tracking-wider">
          24H GRID
        </h2>
        <p className="text-xs text-gray-300 font-mono mb-6">
          [LOADING_DATA...]
        </p>
        <div className="animate-pulse">
          <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="bg-[#0a0a0a] border border-gray-800 p-3 rounded h-20"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (grid.length === 0 || grid.every(item => item.changePercent === null && item.price === null)) {
    return (
      <div className="w-full">
        <h2 className="text-2xl font-semibold text-gray-300 mb-2 font-['Orbitron'] tracking-wider">
          24H GRID
        </h2>
        <p className="text-xs text-gray-300 font-mono mb-6">
          [NO_DATA_AVAILABLE]
        </p>
        <div className="bg-[#0a0a0a] border border-gray-700 p-6 rounded text-center">
          <p className="text-gray-300 font-mono mb-2">No hay datos disponibles aún</p>
          <p className="text-xs text-gray-400 font-mono">
            Los datos se cargarán automáticamente cuando el cron job se ejecute
          </p>
        </div>
      </div>
    )
  }

  const renderComparisonView = () => (
    <>
      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 gap-3">
        {grid.map((item, index) => (
          <div
            key={index}
            className={`p-4 rounded border text-center transition-all hover:scale-105 font-mono ${getChangeColor(item.changePercent)}`}
          >
            <div className="text-sm font-medium mb-3 text-gray-300">
              {formatHour(item.hour)}
            </div>
            <div className={`text-xl font-bold ${item.changePercent !== null ? (item.changePercent > 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}`}>
              {formatChange(item.changePercent)}
            </div>
            {item.price && (
              <div className="text-sm mt-2 text-gray-300">
                {formatPrice(item.price, 0)}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-6 text-xs text-gray-300 font-mono border-t border-gray-700 pt-4">
        <p>[INFO] Each cell shows % change vs same hour from previous day</p>
      </div>
    </>
  )

  const renderHourlyView = () => {
    const latestItem = hourlyData.find(item => item.latestPrice !== null && item.latestTimestamp !== null)
    const latestHour = latestItem?.hour
    
    return (
      <>
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 gap-3">
          {hourlyData.map((item, index) => {
            const isLatest = item.latestPrice !== null && item.hour === latestHour
            return (
              <div
                key={index}
                className={`p-4 rounded border text-center transition-all hover:scale-105 font-mono ${
                  isLatest 
                    ? 'bg-blue-900/30 text-blue-400 border-blue-600 ring-2 ring-blue-500' 
                    : getChangeColor(item.changePercent)
                }`}
              >
                <div className="text-sm font-medium mb-3 text-gray-300">
                  {formatHour(item.hour)}
                  {isLatest && <span className="ml-1 text-blue-400">●</span>}
                </div>
                {item.price !== null && item.priceYesterday !== null ? (
                  <>
                    {/* Diferencia absoluta calculada (precio hoy - precio ayer) */}
                    <div className={`text-xl font-bold ${item.price > item.priceYesterday ? 'text-green-400' : item.price < item.priceYesterday ? 'text-red-400' : 'text-gray-300'}`}>
                      {formatPriceDifference(item.price, item.priceYesterday)}
                    </div>
                  </>
                ) : item.price !== null || item.priceYesterday !== null ? (
                  <>
                    {/* Si solo hay uno de los dos precios, mostrar el disponible */}
                    {item.price !== null && (
                      <div className="text-base font-semibold text-gray-300">
                        {formatPrice(item.price, 0)}
                      </div>
                    )}
                    {item.priceYesterday !== null && (
                      <div className="text-base font-semibold text-gray-300">
                        {formatPrice(item.priceYesterday, 0)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-base text-gray-500">--</div>
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-6 text-xs text-gray-300 font-mono border-t border-gray-700 pt-4">
          <p>[INFO] Shows hourly prices with % change vs previous day. Latest data highlighted.</p>
        </div>
      </>
    )
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-gray-100 font-['Orbitron'] tracking-wider">
          24H GRID
        </h2>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-mono ${viewMode === 'comparison' ? 'text-gray-100' : 'text-gray-500'}`}>
            COMPARISON
          </span>
          <button
            onClick={() => setViewMode(viewMode === 'comparison' ? 'hourly' : 'comparison')}
            className={`relative inline-flex h-7 w-14 items-center rounded transition-colors ${
              viewMode === 'hourly' ? 'bg-green-600' : 'bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded bg-white transition-transform ${
                viewMode === 'hourly' ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-xs font-mono ${viewMode === 'hourly' ? 'text-gray-100' : 'text-gray-500'}`}>
            HOURLY
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-300 font-mono mb-6">
        {viewMode === 'comparison' 
          ? '[CHANGE_VS_SAME_HOUR_YESTERDAY]' 
          : '[HOURLY_DATA_WITH_LATEST]'}
      </p>
      {viewMode === 'comparison' ? renderComparisonView() : renderHourlyView()}
    </div>
  )
}

export default HourlyGrid
