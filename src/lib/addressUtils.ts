/**
 * Generates the 6-digit non-reversible code from latitude and longitude.
 * Format: P1P2-P3P4-P5P6
 * P1 = 2nd decimal digit of abs(Lat)
 * P2 = 2nd decimal digit of abs(Lon)
 * P3 = 3rd decimal digit of abs(Lat)
 * P4 = 3rd decimal digit of abs(Lon)
 * P5 = 4th decimal digit of abs(Lat)
 * P6 = 4th decimal digit of abs(Lon)
 *
 * @param lat Latitude number
 * @param lon Longitude number
 * @returns The formatted 6D code string (e.g., "12-34-56") or null if input is invalid or lacks precision.
 */
export function generate6DCode(lat: number, lon: number): string | null {
    try {
      // Ensure inputs are valid numbers
      if (isNaN(lat) || isNaN(lon)) {
        console.error('Invalid Lat/Lon input for code generation:', { lat, lon });
        return null;
      }
  
      // Get absolute values
      const absLat = Math.abs(lat);
      const absLon = Math.abs(lon);
  
      // Convert to string with sufficient decimal places (e.g., 6)
      // Using toFixed ensures consistent decimal places, helping extract digits.
      // Need at least 4 decimal places for the logic. Using 6 for safety.
      const latStr = absLat.toFixed(6);
      const lonStr = absLon.toFixed(6);
  
      // Extract the decimal part
      const latDec = latStr.split('.')[1] || ''; // Handle cases with no decimal part (e.g., 0)
      const lonDec = lonStr.split('.')[1] || '';
  
      // Check if we have enough decimal digits (at least 4 required)
      // Indices 1, 2, 3 correspond to 2nd, 3rd, 4th decimal places
      if (latDec.length < 4 || lonDec.length < 4) {
        console.warn('Insufficient decimal precision for code generation.', { lat, lon, latDecLength: latDec.length, lonDecLength: lonDec.length });
        // Return null if not enough precision. Padding could lead to less unique codes.
         return null;
      }
  
      // Extract the required digits
      const P1 = latDec[1];
      const P2 = lonDec[1];
      const P3 = latDec[2];
      const P4 = lonDec[2];
      const P5 = latDec[3];
      const P6 = lonDec[3];
  
      // Basic validation: Ensure extracted characters are digits (0-9)
      const digits = [P1, P2, P3, P4, P5, P6];
      if (digits.some(digit => !/^\d$/.test(digit))) {
          console.error('Non-digit character encountered during code generation.', { lat, lon, P1, P2, P3, P4, P5, P6 });
          return null;
      }
  
      // Format the code
      const code = `${P1}${P2}-${P3}${P4}-${P5}${P6}`;
  
      return code;
  
    } catch (error) {
      console.error('Error generating 6D code:', error);
      return null;
    }
  }
  
  /**
   * Calculates the approximate boundaries of the ~11m x ~11m square
   * corresponding to the 4th decimal place of the given coordinates.
   * Note: This is an approximation, especially longitude step varies with latitude.
   *
   * @param lat Latitude number
   * @param lon Longitude number
   * @returns A Google Maps LatLngBoundsLiteral object or null if input is invalid.
   */
  export function get11mSquareBounds(lat: number, lon: number): google.maps.LatLngBoundsLiteral | null {
    try {
        if (isNaN(lat) || isNaN(lon)) {
            console.error('Invalid Lat/Lon input for bounds calculation:', { lat, lon });
            return null;
        }

        const precisionFactor = 10000; // Based on 4th decimal place
        const step = 0.0001; // Corresponds to ~11.1 meters at the equator

        // Calculate the base latitude and longitude floored to the 4th decimal place
        const latBase = Math.floor(lat * precisionFactor) / precisionFactor;
        const lonBase = Math.floor(lon * precisionFactor) / precisionFactor;

        // --- latSign and lonSign removed as they weren't used ---

        // Determine corners based on the base. Add step to get NE corner.
        const south = latBase;
        const west = lonBase;
        const north = latBase + step;
        const east = lonBase + step;

        // Ensure bounds don't exceed world limits
        const clampedSouth = Math.max(-90, south);
        const clampedWest = Math.max(-180, west);
        const clampedNorth = Math.min(90, north);
        const clampedEast = Math.min(180, east);

        return {
            south: clampedSouth,
            west: clampedWest,
            north: clampedNorth,
            east: clampedEast,
        };
    } catch (error) {
        console.error("Error calculating 11m square bounds:", error);
        return null;
    }
}
 