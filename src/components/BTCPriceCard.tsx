import { BinanceTickerResponse } from '../types'
import { formatPrice } from '../utils/formatNumber'

interface BTCPriceCardProps {
  data: BinanceTickerResponse | null
  loading: boolean
  lastFetch: Date | null
}

const BTCPriceCard = ({ data, loading, lastFetch }: BTCPriceCardProps) => {
  if (loading && !data) {
    return (
      <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-800 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-800 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
        <p className="text-gray-300 font-mono">[NO_DATA]</p>
      </div>
    )
  }

  const priceChange = parseFloat(data.priceChangePercent)
  const isPositive = priceChange >= 0

  return (
    <div className="bg-[#111111] border border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6 border-b border-gray-700 pb-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-100 font-['Orbitron'] tracking-wider">BTC/USDT</h3>
        </div>
        <div className="text-right">
          <div className={`text-4xl font-bold font-['Orbitron'] ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {formatPrice(parseFloat(data.lastPrice))}
          </div>
          <div className={`text-xl font-semibold font-mono mt-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#0a0a0a] border border-gray-700 p-4 rounded font-mono">
          <p className="text-xs text-gray-300 mb-2">[OPEN_24H]</p>
          <p className="text-sm font-semibold text-gray-200">{formatPrice(parseFloat(data.openPrice))}</p>
        </div>
        <div className="bg-[#0a0a0a] border border-gray-700 p-4 rounded font-mono">
          <p className="text-xs text-gray-300 mb-2">[HIGH_24H]</p>
          <p className="text-sm font-semibold text-green-400">{formatPrice(parseFloat(data.highPrice))}</p>
        </div>
        <div className="bg-[#0a0a0a] border border-gray-700 p-4 rounded font-mono">
          <p className="text-xs text-gray-300 mb-2">[LOW_24H]</p>
          <p className="text-sm font-semibold text-red-400">{formatPrice(parseFloat(data.lowPrice))}</p>
        </div>
        <div className="bg-[#0a0a0a] border border-gray-700 p-4 rounded font-mono">
          <p className="text-xs text-gray-300 mb-2">[VOL_24H]</p>
          <p className="text-sm font-semibold text-gray-200">{(parseFloat(data.volume) / 1000).toFixed(2)}K BTC</p>
        </div>
      </div>
    </div>
  )
}

export default BTCPriceCard
