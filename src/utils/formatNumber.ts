/**
 * Formatea un número con el estilo: punto para miles, coma para decimales
 * Ejemplo: 94507.99 -> "94.507,99"
 */
export const formatNumber = (value: number, decimals: number = 2): string => {
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Formatea un precio con el símbolo de dólar
 * Ejemplo: 94507.99 -> "$94.507,99"
 */
export const formatPrice = (value: number, decimals: number = 2): string => {
  return `$${formatNumber(value, decimals)}`
}

/**
 * Formatea un número sin decimales (para precios grandes)
 * Ejemplo: 94507 -> "94.507"
 */
export const formatInteger = (value: number): string => {
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}
