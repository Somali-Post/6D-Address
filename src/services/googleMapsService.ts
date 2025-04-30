// Define a simple structure for the address components we need
export interface AddressContext {
    sublocality: string;
    locality: string;
    error?: string; // Optional field to pass specific geocoding errors
  }
  
  /**
   * Performs reverse geocoding using Google Maps API to get address context.
   *
   * @param lat Latitude number
   * @param lon Longitude number
   * @returns A Promise resolving to an object with sublocality and locality, or null if a critical error occurs.
   *          The returned object might contain an error message if geocoding fails gracefully (e.g., ZERO_RESULTS).
   */
  export async function reverseGeocode(lat: number, lon: number): Promise<AddressContext | null> {
    // Retrieve the API key from environment variables
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
    // Basic validation
    if (isNaN(lat) || isNaN(lon)) {
        console.error("Invalid Lat/Lon provided for reverse geocoding.");
        return { sublocality: 'N/A', locality: 'N/A', error: 'Invalid coordinates' };
    }
  
    if (!apiKey) {
      console.error("Google Maps API Key is missing. Make sure VITE_GOOGLE_MAPS_API_KEY is set in your .env.local file.");
      // Return null here as it's a critical configuration error
      return null;
    }
  
    // Construct the API URL
    // Requesting sublocality and locality. Consider adding administrative_area_level_1/2 if needed for regions.
    // language=so attempts to get Somali names if available in Google's data. Defaults to English otherwise.
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${apiKey}&result_type=sublocality|locality&language=so`;
  
    try {
      const response = await fetch(url);
  
      // Check for HTTP errors (e.g., 404, 500)
      if (!response.ok) {
        console.error(`Geocoding API request failed with HTTP status: ${response.status} ${response.statusText}`);
        try {
          // Try to parse error response from Google if available
          const errorData = await response.json();
          console.error('Google API Error details:', errorData);
           return { sublocality: 'N/A', locality: 'N/A', error: `HTTP Error: ${response.status}. ${errorData?.error_message || 'Could not fetch address.'}` };
        } catch (_) {
          // If parsing error response fails
           return { sublocality: 'N/A', locality: 'N/A', error: `HTTP Error: ${response.status}. Could not fetch address.` };
        }
      }
  
      // Parse the successful JSON response
      const data = await response.json();
  
      // Check the status provided by the Google Geocoding API
      if (data.status !== 'OK') {
        console.warn(`Geocoding API returned status: ${data.status}`, data.error_message || '');
        // Handle specific statuses gracefully
        if (data.status === 'ZERO_RESULTS') {
           return { sublocality: 'N/A', locality: 'N/A', error: 'No address found for this location.' };
        } else {
           return { sublocality: 'N/A', locality: 'N/A', error: `Geocoding failed: ${data.status}. ${data.error_message || ''}` };
        }
      }
  
      // Process the results to find the desired components
      let sublocality = '';
      let locality = '';
  
      // Google often returns multiple results; the first one is usually the most specific.
      if (data.results && data.results.length > 0) {
        // Look through address components of the first result
        const components = data.results[0].address_components;
        for (const component of components) {
          // Check for sublocality (can be level 1, 2 etc. depending on country)
          if (!sublocality && (component.types.includes('sublocality') || component.types.includes('sublocality_level_1'))) {
            sublocality = component.long_name;
          }
          // Check for locality (typically city/town)
          if (!locality && component.types.includes('locality')) {
            locality = component.long_name;
          }
          // Stop if we found both
          if (sublocality && locality) break;
        }
      }
  
      // Return the found context, providing 'N/A' if a component wasn't found
      return {
          sublocality: sublocality || 'N/A',
          locality: locality || 'N/A'
          // Optionally add a warning if only partial data was found
          // error: (!sublocality || !locality) ? 'Partial address information found.' : undefined
      };
  
    } catch (error) {
      // Handle network errors (e.g., DNS lookup failure, no internet) or JSON parsing errors
      console.error('Error during reverse geocoding fetch/process:', error);
      // Return null for critical network/parsing errors
      return null;
    }
  }