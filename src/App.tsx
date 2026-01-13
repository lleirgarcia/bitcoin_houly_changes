import { useState, useEffect } from 'react'
import { useBinanceHourly } from './hooks/useBinanceHourly'
import BTCPriceCard from './components/BTCPriceCard'
import HourlyGrid from './components/HourlyGrid'

function App() {
  const { currentData, loading, error, lastFetch, refetch } = useBinanceHourly()
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    // Actualizar el reloj cada segundo
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 border-b border-gray-600 pb-4">
          <h1 className="text-5xl font-bold text-gray-100 mb-2 font-['Orbitron'] tracking-wider">
            TRADING_X
          </h1>
          <p className="text-gray-300 text-sm font-mono">
            [BTC_MONITOR] :: Auto-update every 60min :: {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </header>

        {error && (
          <div className="bg-red-900/10 border border-red-800/30 text-red-300 px-4 py-3 rounded mb-4 font-mono">
            <p className="font-semibold text-red-200">[ERROR]</p>
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={refetch}
              className="mt-2 px-4 py-2 bg-red-900/20 border border-red-800/30 text-red-300 rounded hover:bg-red-900/30 transition-all font-mono text-sm"
            >
              [RETRY]
            </button>
          </div>
        )}

        <div className="mb-8">
          <BTCPriceCard data={currentData} loading={loading} lastFetch={lastFetch} />
        </div>

        <div className="bg-[#111111] border border-gray-700 rounded-lg p-6">
          <HourlyGrid />
        </div>
      </div>
    </div>
  )
}

export default App
