import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'; // Added useMemo
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Rectangle,
  Libraries // Ensure Libraries type is imported
} from '@react-google-maps/api';

// --- Imports ---
import { generate6DCode, get11mSquareBounds } from '../lib/addressUtils.ts';
import { reverseGeocode, AddressContext } from '../services/googleMapsService.ts';
import Input from '../components/ui/Input.tsx';
import Button from '../components/ui/Button.tsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.tsx';
import ErrorMessage from '../components/ui/ErrorMessage.tsx';
import { FiMapPin, FiCheck, FiCopy, FiInfo, FiCheckCircle, FiUser, FiPhone, FiCrosshair, FiLock } from 'react-icons/fi';

// --- Types ---
type Position = google.maps.LatLngLiteral;
type SquareBounds = google.maps.LatLngBoundsLiteral;
type RegistrationPhase = 'selectLocation' | 'enterDetails' | 'verifyOtp' | 'submitted';

// --- Constants ---
const MAP_LIBRARIES: Libraries = ['geometry'];

const MAP_CONTAINER_STYLE: React.CSSProperties = {
    width: '100%',
    height: '450px',
    borderRadius: '0.5rem',
    marginBottom: '1.5rem',
    border: '1px solid #e5e7eb',
    position: 'relative'
};

const MOGADISHU_CENTER = { lat: 2.0469, lng: 45.3182 };
// REMOVED MAP_OPTIONS from here
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// --- Component ---
const RegisterMapPage: React.FC = () => {
    const { isLoaded, loadError } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "", libraries: MAP_LIBRARIES });

    // Diagnostic log:
    useEffect(() => { console.log("MAP_LOAD_STATUS:", { apiKeyProvided: import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.length > 0, isLoaded, loadError }); }, [isLoaded, loadError]);

    // --- State & Refs ---
    const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
    const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const [addressContext, setAddressContext] = useState<AddressContext | null>(null);
    const [name, setName] = useState<string>('');
    const [mobileNumber, setMobileNumber] = useState<string>('');
    const [otp, setOtp] = useState<string>('');
    const [squareBounds, setSquareBounds] = useState<SquareBounds | null>(null);
    const [currentPhase, setCurrentPhase] = useState<RegistrationPhase>('selectLocation');
    const [isMobileVerified, setIsMobileVerified] = useState<boolean>(false);
    const [isLoadingGeocode, setIsLoadingGeocode] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isLocating, setIsLocating] = useState<boolean>(false);
    const [copied, setCopied] = useState<boolean>(false);
    const nameInputRef = useRef<HTMLInputElement>(null);
    const mobileInputRef = useRef<HTMLInputElement>(null);
    const otpInputRef = useRef<HTMLInputElement>(null);

    // --- Callbacks ---
    const onMapLoad = useCallback((map: google.maps.Map) => { console.log("Map instance loaded"); setMapInstance(map); map.setCenter(MOGADISHU_CENTER); map.setZoom(14); }, []); // Added log
    const onUnmount = useCallback(() => { console.log("Map instance unmounted"); setMapInstance(null); }, []); // Added log
    const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => { if (!event.latLng) return; const clickedPos: Position = { lat: event.latLng.lat(), lng: event.latLng.lng() }; console.log("Map Clicked:", clickedPos); setSelectedPosition(clickedPos); setGeneratedCode(null); setAddressContext(null); setSquareBounds(null); setError(null); setCurrentPhase('enterDetails'); setIsMobileVerified(false); setOtp(''); setIsLoadingGeocode(true); setCopied(false); setTimeout(() => nameInputRef.current?.focus(), 300); }, []);
    const handleLocateMe = useCallback(() => { /* ... (same as before) ... */ }, [mapInstance, handleMapClick]); // Added mapInstance dependency back for safety

    // --- Effect for Processing Location ---
    useEffect(() => { /* ... (same as before) ... */ }, [selectedPosition]);

    // --- Event Handlers ---
    const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value);
    const handleMobileChange = (event: React.ChangeEvent<HTMLInputElement>) => { setMobileNumber(event.target.value); setIsMobileVerified(false); setOtp(''); if(currentPhase === 'submitted') setCurrentPhase('enterDetails'); };
    const handleOtpChange = (event: React.ChangeEvent<HTMLInputElement>) => setOtp(event.target.value);

    // --- Backend Interaction Callbacks (Send OTP, Verify OTP, Submit) ---
    const handleSendOtp = async () => { /* ... (same as before) ... */ };
    const handleVerifyOtp = async () => { /* ... (same as before) ... */ };
    const handleCopyCode = () => { /* ... (same as before) ... */ };
    const handleSubmitRegistration = async (event: React.FormEvent) => { /* ... (same as before) ... */ };
    const handleRegisterAnother = () => { /* ... (same as before) ... */ };

    // --- Render Logic ---

    // *** MOVED & UPDATED MAP_OPTIONS DEFINITION INSIDE COMPONENT ***
    // Use useMemo to prevent recalculating on every render unless isLoaded changes
    const MAP_OPTIONS = useMemo((): google.maps.MapOptions => ({
        disableDefaultUI: true,
        zoomControl: true,
        // Only define zoomControlOptions position if Google Maps API is loaded
        zoomControlOptions: isLoaded ? { position: google.maps.ControlPosition.RIGHT_BOTTOM } : undefined,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        minZoom: 5,
        gestureHandling: 'greedy',
        clickableIcons: false,
        draggableCursor: 'crosshair',
        draggingCursor: 'grabbing',
    }), [isLoaded]); // Re-calculate only when isLoaded changes


    if (loadError) { return <ErrorMessage className="m-4" message={`Error loading Google Maps: ${loadError.message}. Check API key/internet/console.`} />; }

    // --- Marker calculation: moved inside component ---
    let customMarkerOptions: google.maps.Symbol | google.maps.Icon | undefined = undefined;
    // Calculate marker options only if API is loaded
    if (isLoaded) {
      customMarkerOptions = { path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z', fillColor: '#2563EB', fillOpacity: 1.0, strokeColor: '#ffffff', strokeWeight: 1.5, scale: 1.0, anchor: new google.maps.Point(0, -35) };
    }

    const isSubmitButtonDisabled = !generatedCode || !name || !mobileNumber || !isMobileVerified || isSubmitting;
    const rectangleKey = squareBounds ? JSON.stringify(squareBounds) : 'no-bounds';

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-6">
        {/* Map Column */}
        <div className="lg:col-span-2 relative">
           <h2 className="text-2xl font-semibold mb-2 text-gray-800 flex items-center"> <FiMapPin className="mr-2 text-blue-600" /> {currentPhase === 'selectLocation' ? '1. Select Location' : 'Location Selected'} </h2>
           <p className="text-sm text-gray-600 mb-4"> {currentPhase === 'selectLocation' ? 'Click map to pinpoint location.' : 'Click map to change location.'} </p>
           {!isLoaded ? (
              // Show Loading spinner while maps API loads
              <div style={MAP_CONTAINER_STYLE} className="flex items-center justify-center bg-gray-100 border rounded-lg">
                 <LoadingSpinner message="Loading Map..." size="lg" />
              </div>
             ) : (
              // Show Map only when API is loaded
               <div style={MAP_CONTAINER_STYLE}>
                   <button onClick={handleLocateMe} disabled={isLocating} title="Show My Location" className="absolute top-3 right-3 z-10 bg-white p-2.5 rounded-full shadow-md text-gray-600 hover:text-blue-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-wait transition" style={{ transform: 'translateZ(0)' }} > {isLocating ? ( <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> ) : ( <FiCrosshair className="h-5 w-5" /> )} </button>
                   <GoogleMap
                      mapContainerStyle={{ width:'100%', height:'100%', borderRadius:'inherit'}}
                      center={MOGADISHU_CENTER}
                      zoom={14}
                      options={MAP_OPTIONS} // Use options defined inside the component
                      onLoad={onMapLoad}
                      onUnmount={onUnmount}
                      onClick={handleMapClick}
                   >
                      {/* Only render Marker/Rectangle if selectedPosition exists (and implicitly if isLoaded is true) */}
                      {selectedPosition && ( <Marker position={selectedPosition} icon={customMarkerOptions} /> )}
                      {squareBounds && selectedPosition && ( <Rectangle key={rectangleKey} bounds={squareBounds} options={{ strokeColor: '#4285F4', strokeOpacity: 0.7, strokeWeight: 1.5, fillColor: '#4285F4', fillOpacity: 0.1, clickable: false, draggable: false, editable: false, zIndex: 1 }} /> )}
                   </GoogleMap>
               </div>
            )}
         </div>
         {/* Details Column (same as before) */}
         <div className="lg:col-span-1 flex flex-col space-y-5">
             {/* ... existing details column JSX ... */}
            {/* ... (Form, inputs, buttons etc remain unchanged) ... */}
            <ErrorMessage message={error} className="mt-auto" />
         </div>
      </div>
    );
};

export default RegisterMapPage;
