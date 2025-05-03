// Define a simple structure for the address components we need
export interface AddressContext {
    sublocality: string;
    locality: string;
    error?: string; // Optional field to pass specific geocoding errors
}

/**
 * Performs reverse geocoding using Google Maps API to get address context.
 * USES THE UNRESTRICTED VITE_GEOCODING_API_KEY FOR THIS SPECIFIC CALL.
 *
 * @param lat Latitude number
 * @param lon Longitude number
 * @returns A Promise resolving to an object with sublocality and locality, or null if a critical error occurs.
 *          The returned object might contain an error message if geocoding fails gracefully (e.g., ZERO_RESULTS).
 */
export async function reverseGeocode(lat: number, lon: number): Promise<AddressContext | null> {
    // *** Retrieve the SEPARATE, UNRESTRICTED key for Geocoding ***
    const geocodingApiKey = import.meta.env.VITE_GEOCODING_API_KEY;
    // You might still need the regular maps key elsewhere, retrieve it if necessary:
    // const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    // Basic validation
    if (isNaN(lat) || isNaN(lon)) {
        console.error("Invalid Lat/Lon provided for reverse geocoding.");
        return { sublocality: 'N/A', locality: 'N/A', error: 'Invalid coordinates' };
    }

    // *** Check if the GEOCODING key is missing ***
    if (!geocodingApiKey) {
        console.error("Google Geocoding API Key is missing. Make sure VITE_GEOCODING_API_KEY is set in Netlify environment variables.");
        // Return null here as it's a critical configuration error
        return null;
    }

    // Construct the API URL using the GEOCODING key
    // Requesting sublocality and locality.
    // language=so attempts Somali names.
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${geocodingApiKey}&result_type=sublocality|locality&language=so`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            console.error(`Geocoding API request failed with HTTP status: ${response.status} ${response.statusText}`);
            let errorMessage = `HTTP Error: ${response.status}. Could not fetch address.`;
            try {
                const errorData = await response.json();
                console.error('Google API Error details:', errorData);
                // Use Google's error message if available, specifically checking for REQUEST_DENIED
                if (errorData?.status === 'REQUEST_DENIED') {
                    errorMessage = `Geocoding failed: ${errorData.status}. ${errorData.error_message || 'Check API key and ensure Geocoding API is enabled.'}`;
                } else {
                     errorMessage = `HTTP Error: ${response.status}. ${errorData?.error_message || 'Could not fetch address.'}`;
                }
            } catch (_) { /* Ignore parsing error if response wasn't JSON */ }
            return { sublocality: 'N/A', locality: 'N/A', error: errorMessage };
        }

        const data = await response.json();

        if (data.status !== 'OK') {
            console.warn(`Geocoding API returned status: ${data.status}`, data.error_message || '');
            let geocodingError = `Geocoding failed: ${data.status}. ${data.error_message || ''}`;
             if (data.status === 'REQUEST_DENIED') { // Can also be reported here
                 geocodingError = `Geocoding failed: ${data.status}. ${data.error_message || 'Check API key configuration.'}`;
            } else if (data.status === 'ZERO_RESULTS') {
                 geocodingError = 'No address found for this location.';
            }
            return { sublocality: 'N/A', locality: 'N/A', error: geocodingError };
        }

        let sublocality = '';
        let locality = '';

        if (data.results && data.results.length > 0) {
            const components = data.results[0].address_components;
            for (const component of components) {
                if (!sublocality && (component.types.includes('sublocality') || component.types.includes('sublocality_level_1'))) {
                    sublocality = component.long_name;
                }
                if (!locality && component.types.includes('locality')) {
                    locality = component.long_name;
                }
                if (sublocality && locality) break;
            }
        }

        return {
            sublocality: sublocality || 'N/A',
            locality: locality || 'N/A'
        };

    } catch (error) {
        console.error('Error during reverse geocoding fetch/process:', error);
        // Return null for critical network/parsing errors
        // You might want a more specific error message for the user here too
        return null; // Or return { sublocality: 'N/A', locality: 'N/A', error: 'Network error during geocoding.' };
    }
}
