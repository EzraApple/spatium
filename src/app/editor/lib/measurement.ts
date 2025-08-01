/**
 * Convert inches to feet and inches display format
 * @param totalInches - Total inches to convert
 * @returns Formatted string like "12'6"" or "8'0""
 */
export function formatInches(totalInches: number): string {
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  
  // Handle fractional inches (half-inch precision)
  const wholeInches = Math.floor(inches);
  const fractionalPart = inches - wholeInches;
  
  let inchesDisplay = wholeInches.toString();
  if (fractionalPart >= 0.5) {
    inchesDisplay += "½";
  }
  
  return `${feet}'${inchesDisplay}"`;
}

/**
 * Convert feet and inches input to total inches
 * @param feet - Number of feet
 * @param inches - Number of inches (can include 0.5 for half inches)
 * @returns Total inches
 */
export function feetAndInchesToInches(feet: number, inches: number): number {
  return feet * 12 + inches;
}

/**
 * Parse a measurement string like "12'6"" or "8'0"" to total inches
 * @param measurement - Formatted measurement string
 * @returns Total inches, or null if invalid format
 */
export function parseMeasurement(measurement: string): number | null {
  const regex = /^(\d+)'(\d+(?:½)?)"$/;
  const match = measurement.match(regex);
  
  if (!match) return null;
  
  const feet = parseInt(match[1]!);
  const inchesStr = match[2]!;
  
  let inches = 0;
  if (inchesStr.includes('½')) {
    inches = parseInt(inchesStr.replace('½', '')) + 0.5;
  } else {
    inches = parseInt(inchesStr);
  }
  
  return feetAndInchesToInches(feet, inches);
}

/**
 * Validate measurement inputs
 * @param feet - Number of feet
 * @param inches - Number of inches
 * @returns Validation result
 */
export function validateMeasurement(feet: number, inches: number): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (feet < 0) {
    errors.push("Feet cannot be negative");
  }
  if (inches < 0) {
    errors.push("Inches cannot be negative");
  }
  if (inches >= 12) {
    errors.push("Inches must be less than 12");
  }
  if (feet > 100) {
    errors.push("Maximum dimension is 100 feet");
  }
  
  const totalInches = feetAndInchesToInches(feet, inches);
  if (totalInches < 12) {
    errors.push("Minimum dimension is 1 foot");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Round to nearest half inch
 * @param inches - Inches to round
 * @returns Rounded to nearest 0.5
 */
export function roundToNearestHalfInch(inches: number): number {
  return Math.round(inches * 2) / 2;
}

/**
 * Convert inches to pixels for canvas display (4 pixels per inch)
 * @param inches - Inches to convert
 * @returns Pixels
 */
export function inchesToPixels(inches: number): number {
  return inches * 4; // 4 pixels per inch for good granularity
}

/**
 * Convert pixels to inches
 * @param pixels - Pixels to convert
 * @returns Inches
 */
export function pixelsToInches(pixels: number): number {
  return pixels / 4;
}