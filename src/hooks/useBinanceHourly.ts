import { useEffect, useState, useCallback } from 'react'
import { fetchBinanceData, saveHourlyData, getStoredHourlyData } from '../services/binanceService'
import { BinanceTickerResponse } from '../types'

const ONE_HOUR = 60 * 60 * 1000 // 1 hora en milisegundos

export const useBinanceHourly = () => {
  const [currentData, setCurrentData] = useState<BinanceTickerResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await fetchBinanceData()
      setCurrentData(data)
      await saveHourlyData(data)
      setLastFetch(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      console.error('Error fetching Binance data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Cargar datos almacenados al iniciar
    const loadStoredData = async () => {
      const stored = await getStoredHourlyData()
      if (stored.length > 0) {
        const lastStored = stored[stored.length - 1]
        setLastFetch(new Date(lastStored.timestamp))
      }
    }
    
    loadStoredData()

    // Fetch inicial
    fetchData()

    // Configurar intervalo para fetch cada hora
    const interval = setInterval(() => {
      fetchData()
    }, ONE_HOUR)

    return () => clearInterval(interval)
  }, [fetchData])

  return {
    currentData,
    loading,
    error,
    lastFetch,
    refetch: fetchData
  }
}
