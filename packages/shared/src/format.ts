const FRACTION_CHARS: Record<number, string> = {
  1: "⅛",
  2: "¼",
  3: "⅜",
  4: "½",
  5: "⅝",
  6: "¾",
  7: "⅞",
}

export function formatEighths(eighths: number): string {
  const totalInches = Math.floor(eighths / 8)
  const remainingEighths = eighths % 8

  const feet = Math.floor(totalInches / 12)
  const inches = totalInches % 12

  let result = ""

  if (feet > 0) {
    result += `${feet}'`
  }

  if (inches > 0 || remainingEighths > 0 || feet === 0) {
    if (remainingEighths === 0) {
      result += `${inches}"`
    } else {
      const fraction = FRACTION_CHARS[remainingEighths]
      if (inches > 0) {
        result += `${inches}${fraction}"`
      } else {
        result += `${fraction}"`
      }
    }
  }

  return result
}

export function parseToEighths(input: string): number | null {
  const cleaned = input.trim().replace(/\s+/g, " ")

  const feetInchesMatch = cleaned.match(/^(\d+)'?\s*(\d+)?(?:\s*(\d)\/(\d))?\s*"?$/)
  if (feetInchesMatch) {
    const feet = parseInt(feetInchesMatch[1], 10)
    const inches = feetInchesMatch[2] ? parseInt(feetInchesMatch[2], 10) : 0
    let eighths = 0

    if (feetInchesMatch[3] && feetInchesMatch[4]) {
      const numerator = parseInt(feetInchesMatch[3], 10)
      const denominator = parseInt(feetInchesMatch[4], 10)
      eighths = Math.round((numerator / denominator) * 8)
    }

    return feet * 12 * 8 + inches * 8 + eighths
  }

  const inchesOnlyMatch = cleaned.match(/^(\d+)(?:\s*(\d)\/(\d))?\s*"?$/)
  if (inchesOnlyMatch) {
    const inches = parseInt(inchesOnlyMatch[1], 10)
    let eighths = 0

    if (inchesOnlyMatch[2] && inchesOnlyMatch[3]) {
      const numerator = parseInt(inchesOnlyMatch[2], 10)
      const denominator = parseInt(inchesOnlyMatch[3], 10)
      eighths = Math.round((numerator / denominator) * 8)
    }

    return inches * 8 + eighths
  }

  const fractionOnlyMatch = cleaned.match(/^(\d)\/(\d)\s*"?$/)
  if (fractionOnlyMatch) {
    const numerator = parseInt(fractionOnlyMatch[1], 10)
    const denominator = parseInt(fractionOnlyMatch[2], 10)
    return Math.round((numerator / denominator) * 8)
  }

  const decimalMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*"?$/)
  if (decimalMatch) {
    const decimal = parseFloat(decimalMatch[1])
    return Math.round(decimal * 8)
  }

  return null
}

export function eighthsToInches(eighths: number): number {
  return eighths / 8
}

export function inchesToEighths(inches: number): number {
  return Math.round(inches * 8)
}

export function feetToEighths(feet: number): number {
  return feet * 12 * 8
}

export function eighthsToFeet(eighths: number): number {
  return eighths / 8 / 12
}

