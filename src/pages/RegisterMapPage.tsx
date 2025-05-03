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
    const onMapLoad = useCallback((map: google.maps.Map) => { console.log("Map instance loaded"); setMapInstance(map); map.setCenter(MOGADISHU_CENTER); map.setZoom(14); }, []);
    const onUnmount = useCallback(() => { console.log("Map instance unmounted"); setMapInstance(null); }, []);
    const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => { if (!event.latLng) return; const clickedPos: Position = { lat: event.latLng.lat(), lng: event.latLng.lng() }; console.log("Map Clicked:", clickedPos); setSelectedPosition(clickedPos); setGeneratedCode(null); setAddressContext(null); setSquareBounds(null); setError(null); setCurrentPhase('enterDetails'); setIsMobileVerified(false); setOtp(''); setIsLoadingGeocode(true); setCopied(false); setTimeout(() => nameInputRef.current?.focus(), 300); }, []);
    const handleLocateMe = useCallback(() => { if (!mapInstance || !navigator.geolocation) { setError("Geolocation not supported or map not ready."); return; } setIsLocating(true); setError(null); navigator.geolocation.getCurrentPosition( (position) => { const userPos = { lat: position.coords.latitude, lng: position.coords.longitude }; mapInstance.panTo(userPos); mapInstance.setZoom(17); handleMapClick({ latLng: new google.maps.LatLng(userPos.lat, userPos.lng) } as google.maps.MapMouseEvent); setIsLocating(false); }, (geoError) => { let errorMsg = "Could not get location."; switch (geoError.code) { case geoError.PERMISSION_DENIED: errorMsg = "Location permission denied."; break; case geoError.POSITION_UNAVAILABLE: errorMsg = "Location unavailable."; break; case geoError.TIMEOUT: errorMsg = "Location request timed out."; break; } console.error("Geolocation Error:", geoError); setError(errorMsg); setIsLocating(false); }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 } ); }, [mapInstance, handleMapClick]); // Added mapInstance dependency back

    // --- Effect for Processing Location ---
    useEffect(() => { if (!selectedPosition) { setIsLoadingGeocode(false); return; } let isActive = true; let accumulatedError: string | null = null; const processSelectedLocation = async () => { setIsLoadingGeocode(true); const code = generate6DCode(selectedPosition.lat, selectedPosition.lng); if (isActive) setGeneratedCode(code); if (!code) { accumulatedError = "Could not generate code."; console.warn("Code generation failed", selectedPosition); } const bounds = get11mSquareBounds(selectedPosition.lat, selectedPosition.lng); if (isActive) setSquareBounds(bounds); try { const geocodeResult = await reverseGeocode(selectedPosition.lat, selectedPosition.lng); if (isActive) { if (geocodeResult === null) { const geoErrorMsg = "Failed to fetch address details."; accumulatedError = accumulatedError ? `${accumulatedError} | ${geoErrorMsg}` : geoErrorMsg; setAddressContext(null); } else { setAddressContext(geocodeResult); if (geocodeResult.error) { accumulatedError = accumulatedError ? `${accumulatedError} | ${geocodeResult.error}` : geocodeResult.error; } } } } catch (err) { console.error("Geocoding process failed unexpectedly:", err); if (isActive) { const unexpectedErrorMsg = "Unexpected error fetching address."; accumulatedError = accumulatedError ? `${accumulatedError} | ${unexpectedErrorMsg}` : unexpectedErrorMsg; setAddressContext(null); } } finally { if (isActive) { setError(accumulatedError); setIsLoadingGeocode(false); } } }; processSelectedLocation(); return () => { isActive = false; }; }, [selectedPosition]);

    // --- Event Handlers ---
    const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value);
    const handleMobileChange = (event: React.ChangeEvent<HTMLInputElement>) => { setMobileNumber(event.target.value); setIsMobileVerified(false); setOtp(''); if(currentPhase === 'submitted') setCurrentPhase('enterDetails'); };
    const handleOtpChange = (event: React.ChangeEvent<HTMLInputElement>) => setOtp(event.target.value);

    // --- Backend Interaction Callbacks (Send OTP, Verify OTP, Submit) ---
    const handleSendOtp = async () => { /* ... (same as before) ... */ };
    const handleVerifyOtp = async () => { /* ... (same as before) ... */ };
    const handleCopyCode = () => { /* ... (same as before) ... */ };
    // --- Start Copying handle... functions from your full version ---
    const handleSubmitRegistration = async (event: React.FormEvent) => { // Make async
        event.preventDefault();
        setError(null);

        // Final validation check
        if (!generatedCode || !selectedPosition || !name || !mobileNumber || !isMobileVerified) {
            setError("Please complete all steps: select location, enter details, and verify mobile number.");
            // Focus logic remains the same
            if (!name) nameInputRef.current?.focus();
            else if (!mobileNumber) mobileInputRef.current?.focus();
            else if (!isMobileVerified) { /* Consider adding a prompt or button focus here */ }
            return;
        }

        setIsSubmitting(true);

        const registrationData = {
            name,
            mobile: mobileNumber,
            code6D: generatedCode,
            latitude: selectedPosition.lat,
            longitude: selectedPosition.lng,
            context: addressContext // Send the whole context object (backend handles nulls)
        };

        console.log('--- Sending Registration Data to Backend ---', registrationData);

        try {
            const response = await fetch(`${BACKEND_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registrationData),
            });

            const data = await response.json(); // Try to parse JSON response

            if (!response.ok) {
                // Handle backend errors (e.g., 409 Conflict, 500 Server Error)
                throw new Error(data.message || `Registration failed: ${response.statusText}`);
            }

            // Success
            console.log('Backend registration successful:', data.message);
            setCurrentPhase('submitted'); // Move to final submitted phase

        } catch (err: any) {
            console.error("Registration submission error:", err);
            setError(err.message || "Registration failed. Please try again.");
            // Stay in 'enterDetails' phase on error so user can retry
            setCurrentPhase('enterDetails');
        } finally {
            setIsSubmitting(false); // Stop loading indicator
        }
    };

    const handleRegisterAnother = () => { setCurrentPhase('selectLocation'); setSelectedPosition(null); setGeneratedCode(null); setAddressContext(null); setName(''); setMobileNumber(''); setOtp(''); setIsMobileVerified(false); setError(null); setCopied(false); setSquareBounds(null); };
    // --- End Copying handle... functions ---


    // --- Render Logic ---

    // Use useMemo to prevent recalculating MAP_OPTIONS on every render unless isLoaded changes
    const MAP_OPTIONS = useMemo((): google.maps.MapOptions => ({
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: isLoaded ? { position: google.maps.ControlPosition.RIGHT_BOTTOM } : undefined,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        minZoom: 5,
        gestureHandling: 'greedy',
        clickableIcons: false,
        draggableCursor: 'crosshair',
        draggingCursor: 'grabbing',
    }), [isLoaded]);

    if (loadError) { return <ErrorMessage className="m-4" message={`Error loading Google Maps: ${loadError.message}. Check API key/internet/console.`} />; }

    let customMarkerOptions: google.maps.Symbol | google.maps.Icon | undefined = undefined;
    if (isLoaded) {
      customMarkerOptions = { path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z', fillColor: '#2563EB', fillOpacity: 1.0, strokeColor: '#ffffff', strokeWeight: 1.5, scale: 1.0, anchor: new google.maps.Point(0, -35) };
    }

    const isSubmitButtonDisabled = !generatedCode || !name || !mobileNumber || !isMobileVerified || isSubmitting; // Used below
    const rectangleKey = squareBounds ? JSON.stringify(squareBounds) : 'no-bounds';

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-6">
        {/* Map Column (same as before) */}
        <div className="lg:col-span-2 relative">
           <h2 className="text-2xl font-semibold mb-2 text-gray-800 flex items-center"> <FiMapPin className="mr-2 text-blue-600" /> {currentPhase === 'selectLocation' ? '1. Select Location' : 'Location Selected'} </h2>
           <p className="text-sm text-gray-600 mb-4"> {currentPhase === 'selectLocation' ? 'Click map to pinpoint location.' : 'Click map to change location.'} </p>
           {!isLoaded ? (
              <div style={MAP_CONTAINER_STYLE} className="flex items-center justify-center bg-gray-100 border rounded-lg">
                 <LoadingSpinner message="Loading Map..." size="lg" />
              </div>
             ) : (
               <div style={MAP_CONTAINER_STYLE}>
                   <button onClick={handleLocateMe} disabled={isLocating} title="Show My Location" className="absolute top-3 right-3 z-10 bg-white p-2.5 rounded-full shadow-md text-gray-600 hover:text-blue-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-wait transition" style={{ transform: 'translateZ(0)' }} > {isLocating ? ( <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> ) : ( <FiCrosshair className="h-5 w-5" /> )} </button>
                   <GoogleMap
                      mapContainerStyle={{ width:'100%', height:'100%', borderRadius:'inherit'}}
                      center={MOGADISHU_CENTER}
                      zoom={14}
                      options={MAP_OPTIONS}
                      onLoad={onMapLoad}
                      onUnmount={onUnmount}
                      onClick={handleMapClick}
                   >
                      {selectedPosition && ( <Marker position={selectedPosition} icon={customMarkerOptions} /> )}
                      {squareBounds && selectedPosition && ( <Rectangle key={rectangleKey} bounds={squareBounds} options={{ strokeColor: '#4285F4', strokeOpacity: 0.7, strokeWeight: 1.5, fillColor: '#4285F4', fillOpacity: 0.1, clickable: false, draggable: false, editable: false, zIndex: 1 }} /> )}
                   </GoogleMap>
               </div>
            )}
         </div>

        {/* ========== Details Column - RESTORED JSX ========== */}
         <div className="lg:col-span-1 flex flex-col space-y-5">
             {/* Section: Initial Prompt */}
             {currentPhase === 'selectLocation' && (
                <>
                  <h2 className="text-2xl font-semibold text-gray-800">Details</h2>
                  <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm flex items-center space-x-3">
                    <FiInfo className="h-5 w-5 flex-shrink-0"/>
                    <span>Click map to start.</span>
                  </div>
                </>
             )}

            {/* Section: Enter Details / Verify / Summary Title */}
            {(currentPhase === 'enterDetails' || currentPhase === 'verifyOtp' || currentPhase === 'submitted') && (
                <>
                  <h2 className="text-2xl font-semibold text-gray-800">
                    {currentPhase === 'submitted' ? 'Registration Summary' : '2. Enter Your Details'}
                  </h2>

                  {/* Display Loading/Code/Address */}
                  {isLoadingGeocode && <LoadingSpinner message="Getting details..." />}
                  {!isLoadingGeocode && generatedCode && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Your 6D Code</label>
                      <div className="flex items-center justify-between">
                        <strong className="text-2xl font-mono text-blue-700 tracking-wider">{generatedCode}</strong>
                        <button onClick={handleCopyCode} title="Copy" className="p-2 text-gray-400 hover:text-blue-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-300">
                          {copied ? <FiCheck className="text-green-600 h-5 w-5" /> : <FiCopy className="h-5 w-5"/>}
                        </button>
                      </div>
                    </div>
                  )}
                  {!isLoadingGeocode && addressContext && (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm">
                      <p><span className="font-medium text-gray-600">Approx. Location:</span> {addressContext.sublocality || 'N/A'}, {addressContext.locality || 'N/A'}</p>
                      {addressContext?.error && <p className='text-red-600 text-xs mt-1'>({addressContext.error})</p>}
                    </div>
                  )}

                  {/* Form Section (Only if not submitted) */}
                  {currentPhase !== 'submitted' && (
                    <form onSubmit={handleSubmitRegistration} className="space-y-4">
                      {/* Name Input */}
                      <Input
                        ref={nameInputRef}
                        label="Full Name"
                        id="name"
                        type="text"
                        placeholder="Your Full Name"
                        value={name}
                        onChange={handleNameChange}
                        required
                        autoComplete="name"
                        disabled={isSubmitting || currentPhase === 'verifyOtp'}
                        icon={<FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"/>}
                        className="pl-10"
                      />
                      {/* Mobile Input Section */}
                      <div className="space-y-1">
                        <Input
                          ref={mobileInputRef}
                          label="Mobile Number"
                          id="mobileNumber"
                          type="tel"
                          placeholder="61xxxxxxx"
                          value={mobileNumber}
                          onChange={handleMobileChange}
                          required
                          pattern="^(?:\+?252)?(61|62|63|65|68|90)\d{7}$"
                          title="Valid Somali mobile (e.g. 61xxxxxxx)"
                          disabled={isSubmitting || currentPhase === 'verifyOtp' || isMobileVerified }
                          aria-describedby="mobile-helper-text"
                          icon={<FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"/>}
                          className="pl-10"
                        />
                        <div className='flex justify-between items-center mt-1'>
                          <p id="mobile-helper-text" className="text-xs text-gray-500">Verification required.</p>
                          {!isMobileVerified && currentPhase !== 'verifyOtp' && (
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={handleSendOtp}
                              disabled={!mobileNumber || (mobileInputRef.current && !mobileInputRef.current.checkValidity()) || isSubmitting || isSendingOtp}
                              isLoading={isSendingOtp}
                              className="text-xs px-3 py-1"
                            >
                              Send Code
                            </Button>
                          )}
                          {isMobileVerified && (
                            <span className="text-xs text-green-600 font-medium flex items-center"><FiCheckCircle className="mr-1"/>Verified</span>
                          )}
                        </div>
                      </div>
                      {/* OTP Section */}
                      {currentPhase === 'verifyOtp' && (
                        <div className="p-4 border border-blue-200 rounded-lg bg-blue-50 space-y-3">
                          <p className='text-sm font-medium text-blue-800'>Enter code sent to {mobileNumber}</p>
                          <Input
                             ref={otpInputRef}
                             label="Verification Code"
                             id="otp"
                             type="text"
                             inputMode='numeric'
                             maxLength={4}
                             placeholder="1234"
                             value={otp}
                             onChange={handleOtpChange}
                             required
                             disabled={isVerifyingOtp || isMobileVerified}
                             className="tracking-[0.5em] text-center font-medium text-lg"
                             icon={<FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"/>}
                          />
                          <Button
                            type="button"
                            variant="primary"
                            onClick={handleVerifyOtp}
                            isLoading={isVerifyingOtp}
                            disabled={isVerifyingOtp || !otp || otp.length < 4}
                            className="w-full"
                          >
                            Verify Code
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => { setCurrentPhase('enterDetails'); setError(null); }}
                            disabled={isVerifyingOtp}
                            className="w-full text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                      {/* Final Submit Button */}
                      {currentPhase === 'enterDetails' && isMobileVerified && (
                        <Button
                          type="submit"
                          variant="primary"
                          disabled={isSubmitButtonDisabled}
                          isLoading={isSubmitting}
                          className="w-full"
                         >
                           Submit Registration
                        </Button>
                      )}
                    </form>
                  )}
                </>
             )}
             {/* Success Message */}
            {currentPhase === 'submitted' && (
              <div className="bg-green-50 border border-green-300 text-green-800 px-5 py-4 rounded-lg text-center space-y-2" role="alert">
                <FiCheckCircle className="h-8 w-8 mx-auto text-green-600"/>
                <h3 className="font-semibold text-lg">Registration Complete!</h3>
                <p className="text-sm">Code <span className="font-mono font-bold">{generatedCode}</span> linked to <span className="font-medium">{mobileNumber}</span>.</p>
                <Button
                   variant='secondary'
                   className='mt-4 text-xs'
                   onClick={handleRegisterAnother} // Used here
                >
                    Register another location?
                </Button>
              </div>
             )}
             {/* Global Error display */}
            <ErrorMessage message={error} className="mt-auto" />
         </div>
       {/* ========== End Details Column ========== */}
      </div>
    );
};

export default RegisterMapPage;
