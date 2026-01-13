import { useState, useEffect } from 'react'
import { get24HourGrid } from '../services/binanceService'
import { formatPrice, formatInteger } from '../utils/formatNumber'

type GridItem = {
  hour: number
  changePercent: number | null
  price: number | null
}

const HourlyGrid = () => {
  const [grid, setGrid] = useState<GridItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadGrid = async () => {
      setLoading(true)
      const data = await get24HourGrid()
      setGrid(data)
      setLoading(false)
    }
    loadGrid()
  }, [])

  const formatHour = (hour: number): string => {
    return `${hour.toString().padStart(2, '0')}:00`
  }

  const getChangeColor = (change: number | null): string => {
    if (change === null) return 'bg-[#0a0a0a] text-gray-600 border-gray-800'
    if (change > 0) return 'bg-[#0a0a0a] text-green-300 border-gray-800 hover:border-gray-700'
    if (change < 0) return 'bg-[#0a0a0a] text-red-300 border-gray-800 hover:border-gray-700'
    return 'bg-[#0a0a0a] text-gray-400 border-gray-800'
  }

  const formatChange = (change: number | null): string => {
    if (change === null) return '--'
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(2)}%`
  }

  if (loading) {
    return (
      <div className="w-full">
        <h2 className="text-2xl font-semibold text-gray-300 mb-2 font-['Orbitron'] tracking-wider">
          24H GRID
        </h2>
        <p className="text-xs text-gray-500 font-mono mb-6">
          [LOADING_DATA]
        </p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-semibold text-gray-300 mb-2 font-['Orbitron'] tracking-wider">
        24H GRID
      </h2>
      <p className="text-xs text-gray-500 font-mono mb-6">
        [CHANGE_VS_SAME_HOUR_YESTERDAY]
      </p>
      <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
        {grid.map((item, index) => (
          <div
            key={index}
            className={`p-3 rounded border text-center transition-all hover:scale-105 font-mono ${getChangeColor(item.changePercent)}`}
          >
            <div className="text-xs font-medium mb-2 text-gray-500">
              {formatHour(item.hour)}
            </div>
            <div className={`text-base font-bold ${item.changePercent !== null ? (item.changePercent > 0 ? 'text-green-300' : 'text-red-300') : 'text-gray-600'}`}>
              {formatChange(item.changePercent)}
            </div>
            {item.price && (
              <div className="text-xs mt-1 text-gray-500">
                {formatPrice(item.price, 0)}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-6 text-xs text-gray-500 font-mono border-t border-gray-800 pt-4">
        <p>[INFO] Each cell shows % change vs same hour from previous day</p>
      </div>
    </div>
  )
}

export default HourlyGrid
