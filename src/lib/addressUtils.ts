// import { getGeohashChars } from './geohashMappings'; // <-- REMOVE or COMMENT OUT this line

/**
 * *** ADDED: Defines the Base32 character set for Geohash encoding ***
 * Mimics the expected export from the missing geohashMappings file.
 * @returns A string containing the 32 valid Geohash characters.
 */
const getGeohashChars = (): string => {
    return "0123456789bcdefghjkmnpqrstuvwxyz"; // Standard Geohash Base32 characters
};

/**
 * Converts degrees to radians.
 * Needed for get11mSquareBounds calculation.
 * @param degrees - The angle in degrees.
 * @returns The angle in radians.
 */
function degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

/**
 * Generates a 6-character code based on latitude and longitude using a simplified geohashing approach.
 * Focuses on precision relevant for +/- 11m squares by incorporating decimals.
 * @param latitude - Latitude in decimal degrees.
 * @param longitude - Longitude in decimal degrees.
 * @returns A 6-character string representing the location, or null if inputs are invalid.
 */
export function generate6DCode(latitude: number, longitude: number): string | null {
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
        console.error("Invalid input for generate6DCode:", latitude, longitude);
        return null;
    }

    // Latitude: -90 to 90. Longitude: -180 to 180.
    const latRange = [-90, 90];
    const lonRange = [-180, 180];
    const precision = 16; // Target bit depth (8 pairs for 16 total bits per dimension needed for higher precision)

    let binaryLat = '';
    let binaryLon = '';

    // Interleave latitude and longitude bits
    for (let i = 0; i < precision; i++) {
        // Process latitude
        const latMid = (latRange[0] + latRange[1]) / 2;
        if (latitude >= latMid) {
            binaryLat += '1';
            latRange[0] = latMid;
        } else {
            binaryLat += '0';
            latRange[1] = latMid;
        }

        // Process longitude
        const lonMid = (lonRange[0] + lonRange[1]) / 2;
        if (longitude >= lonMid) {
            binaryLon += '1';
            lonRange[0] = lonMid;
        } else {
            binaryLon += '0';
            lonRange[1] = lonMid;
        }
    }

    // Combine and Convert Binary to 6D Code Chars (using 5 bits per character for 32 options)
    // Total bits = precision * 2 = 32. Need 6 chars, so 30 bits (5 bits/char). We'll use the first 30 bits.
    let binaryCombined = '';
    for (let i = 0; i < precision; i++) { // Interleaving
        binaryCombined += binaryLon[i]; // Longitude first for traditional Geohash order
        binaryCombined += binaryLat[i];
    }

    let resultCode = '';
    const bitsPerChar = 5;
    const geohashChars = getGeohashChars(); // *** NOW USES THE LOCAL FUNCTION ***

    for (let i = 0; i < binaryCombined.length; i += bitsPerChar) {
        const chunk = binaryCombined.substring(i, i + bitsPerChar);
        if (chunk.length < bitsPerChar) continue; // Avoid partial chunk at the end if length isn't multiple of 5
        const decimalValue = parseInt(chunk, 2);
        if (decimalValue < geohashChars.length) {
             resultCode += geohashChars[decimalValue];
        } else {
            console.warn("Calculated index out of bounds for geohash chars:", chunk, decimalValue);
            resultCode += '?'; // Or handle error more robustly
        }
        if (resultCode.length === 6) { // Stop after getting 6 characters
            break;
        }
    }

    // Pad if needed (shouldn't be if precision is high enough)
    while (resultCode.length < 6) {
       console.warn("Padding 6D code - precision might be too low");
       resultCode += geohashChars[0]; // Pad with the first character
    }

    return resultCode.toUpperCase();
}


/**
 * Calculates the approximate bounds of an 11m x 11m square centered on a given lat/lng.
 * Reference: Approximately 0.0001 degrees of latitude/longitude change near the equator
 * corresponds to 11 meters. This varies with latitude for longitude.
 * @param lat - Center latitude.
 * @param lon - Center longitude.
 * @returns A LatLngBoundsLiteral object.
 */
export function get11mSquareBounds(lat: number, lon: number): google.maps.LatLngBoundsLiteral {
    // Calculate meters per degree (approximate)
    const metersPerDegreeLat = 111132; // Fairly constant
    const metersPerDegreeLon = metersPerDegreeLat * Math.cos(degreesToRadians(lat)); // Varies with latitude

    const latDelta = 5.5 / metersPerDegreeLat; // Half of 11m in degrees latitude
    const lonDelta = 5.5 / metersPerDegreeLon; // Half of 11m in degrees longitude

    const north = lat + latDelta;
    const south = lat - latDelta;
    const east = lon + lonDelta;
    const west = lon - lonDelta;

    // Ensure bounds are within valid geographical ranges (optional but good practice)
    const clampedNorth = Math.min(north, 90);
    const clampedSouth = Math.max(south, -90);
    const clampedEast = lon + lonDelta; // Longitude wraps around, usually handled by mapping libraries
    const clampedWest = lon - lonDelta; // Longitude wraps around, usually handled by mapping libraries


    // It's generally better to let the mapping library handle longitude wrapping.
    // Return potentially >180 or <-180 values if that's what the calculation yields.
    return { north: clampedNorth, south: clampedSouth, east: east, west: west };

    // // Simpler return without clamping, often sufficient:
    // return { north, south, east, west };
}
