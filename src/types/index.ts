export interface DataItem {
  id: number
  nombre: string
  simbolo: string
  precio: number
  cambio: number
  volumen: number
}

export interface BinanceTickerResponse {
  symbol: string
  priceChange: string
  priceChangePercent: string
  weightedAvgPrice: string
  prevClosePrice: string
  lastPrice: string
  bidPrice: string
  askPrice: string
  openPrice: string
  highPrice: string
  lowPrice: string
  volume: string
  quoteVolume: string
  openTime: number
  closeTime: number
  firstId: number
  lastId: number
  count: number
}

export interface HourlyData {
  timestamp: number
  hour: number
  priceChangePercent: number
  price: number
  date: string
}
