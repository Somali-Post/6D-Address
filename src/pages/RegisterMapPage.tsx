// src/pages/RegisterMapPage.tsx

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Rectangle,
  Libraries 
} from '@react-google-maps/api';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth } from '../lib/firebase'; // Assuming this path is correct for Vite
import { generate6DCode, get11mSquareBounds } from '../lib/addressUtils'; // Assuming correct path
import { reverseGeocode, AddressContext } from '../services/googleMapsService'; // Assuming correct path
import Input from '../components/ui/Input'; // Assuming correct path
import Button from '../components/ui/Button'; // Assuming correct path
import LoadingSpinner from '../components/ui/LoadingSpinner'; // Assuming correct path
import ErrorMessage from '../components/ui/ErrorMessage'; // Assuming correct path
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
const MAP_OPTIONS: google.maps.MapOptions = { disableDefaultUI: true, zoomControl: true, zoomControlOptions: { position: "RIGHT_BOTTOM" as unknown as google.maps.ControlPosition }, mapTypeControl: false, streetViewControl: false, fullscreenControl: false, minZoom: 5, gestureHandling: 'greedy', clickableIcons: false, draggableCursor: 'crosshair', draggingCursor: 'grabbing', };

// Ensure VITE_BACKEND_URL is defined in your .env file for this Vite project
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://somali-6d-backend.onrender.com'; // Default to your Render URL

// --- Component ---
const RegisterMapPage: React.FC = () => {
    // --- Google Maps Loader ---
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script-vite', // Unique ID if you have multiple map loaders
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
        libraries: MAP_LIBRARIES
    });

    // --- State ---
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
    const [confirmationResultState, setConfirmationResultState] = useState<ConfirmationResult | null>(null); 

    // --- Refs ---
    const nameInputRef = useRef<HTMLInputElement>(null);
    const mobileInputRef = useRef<HTMLInputElement>(null);
    const otpInputRef = useRef<HTMLInputElement>(null);
    const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null); 

    useEffect(() => {
      console.log('Vite Project - BACKEND_URL:', BACKEND_URL);
      console.log('Vite Project - VITE_GOOGLE_MAPS_API_KEY:', import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
    }, []); 


    const setupRecaptcha = useCallback(() => {
        if (recaptchaVerifierRef.current) {
            recaptchaVerifierRef.current.clear(); 
        }
        // Ensure the 'recaptcha-container' div exists in your JSX
        const recaptchaContainer = document.getElementById('recaptcha-container');
        if (!recaptchaContainer) {
            console.error("reCAPTCHA container div not found in the DOM.");
            setError("Could not initialize reCAPTCHA. Please refresh.");
            return Promise.reject(new Error("reCAPTCHA container not found."));
        }

        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainer, { // Pass the DOM element directly
            'size': 'invisible', 
            'callback': (_response: any) => {
                console.log("reCAPTCHA verified (invisible)");
            },
            'expired-callback': () => {
                console.warn("reCAPTCHA expired");
                setError("reCAPTCHA verification expired, please try sending the code again.");
                if (recaptchaVerifierRef.current) {
                    recaptchaVerifierRef.current.clear();
                }
                recaptchaVerifierRef.current = null; 
            }
        });

        return recaptchaVerifierRef.current.render().catch(err => {
            console.error("reCAPTCHA render error:", err);
            setError("Could not initialize reCAPTCHA. Check console.");
            throw err; 
        });
    }, [auth]); // Added auth to dependency array

    const onMapLoad = useCallback((map: google.maps.Map) => {
        map.setOptions({ draggableCursor: 'crosshair', draggingCursor: 'grabbing', clickableIcons: false });
        setMapInstance(map);
        map.setCenter(MOGADISHU_CENTER);
        map.setZoom(14);
    }, []);

    const onUnmount = useCallback(() => {
        setMapInstance(null);
        if (recaptchaVerifierRef.current) {
            recaptchaVerifierRef.current.clear();
            recaptchaVerifierRef.current = null;
        }
    }, []);

    const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
        if (!event.latLng) return;
        const clickedPos: Position = { lat: event.latLng.lat(), lng: event.latLng.lng() };
        setSelectedPosition(clickedPos);
        setGeneratedCode(null);
        setAddressContext(null);
        setSquareBounds(null);
        setError(null);
        setCurrentPhase('enterDetails');
        setIsMobileVerified(false); 
        setOtp('');
        setConfirmationResultState(null); 
        setIsLoadingGeocode(true);
        setCopied(false);
        setTimeout(() => nameInputRef.current?.focus(), 300); 
    }, []); 

    const handleLocateMe = useCallback(() => {
        if (!mapInstance || !navigator.geolocation) {
            setError("Geolocation not supported or map not ready.");
            return;
        }
        setIsLocating(true);
        setError(null);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userPos = { lat: position.coords.latitude, lng: position.coords.longitude };
                mapInstance.panTo(userPos);
                mapInstance.setZoom(17);
                handleMapClick({ latLng: new google.maps.LatLng(userPos.lat, userPos.lng) } as google.maps.MapMouseEvent);
                setIsLocating(false);
            },
            (geoError) => {
                let errorMsg = "Could not get location.";
                console.error("Geolocation Error:", geoError);
                setError(errorMsg);
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
    }, [mapInstance, handleMapClick]);

    useEffect(() => {
        if (!selectedPosition) {
            setIsLoadingGeocode(false);
            return;
        }
        let isActive = true;
        let accumulatedError: string | null = null;

        const processSelectedLocation = async () => {
            setIsLoadingGeocode(true);
            const code = generate6DCode(selectedPosition.lat, selectedPosition.lng);
            if (isActive) setGeneratedCode(code);
            if (!code) {
                accumulatedError = "Could not generate 6D code.";
                console.warn("Code generation failed", selectedPosition);
            }
            const bounds = get11mSquareBounds(selectedPosition.lat, selectedPosition.lng);
            if (isActive) setSquareBounds(bounds);

            try {
                const geocodeResult = await reverseGeocode(selectedPosition.lat, selectedPosition.lng);
                if (isActive) {
                    if (geocodeResult === null) {
                        const geoErrorMsg = "Failed to fetch address details.";
                        accumulatedError = accumulatedError ? `${accumulatedError} | ${geoErrorMsg}` : geoErrorMsg;
                        setAddressContext(null);
                    } else {
                        setAddressContext(geocodeResult);
                        if (geocodeResult.error) {
                            accumulatedError = accumulatedError ? `${accumulatedError} | ${geocodeResult.error}` : geocodeResult.error;
                        }
                    }
                }
            } catch (err) {
                console.error("Geocoding process failed unexpectedly:", err);
                if (isActive) {
                    const unexpectedErrorMsg = "Unexpected error fetching address.";
                    accumulatedError = accumulatedError ? `${accumulatedError} | ${unexpectedErrorMsg}` : unexpectedErrorMsg;
                    setAddressContext(null);
                }
            } finally {
                if (isActive) {
                    setError(accumulatedError);
                    setIsLoadingGeocode(false);
                }
            }
        };
        processSelectedLocation();
        return () => { isActive = false; };
    }, [selectedPosition]);

    const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value);
    const handleMobileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setMobileNumber(event.target.value);
        if (isMobileVerified) {
            setIsMobileVerified(false);
            setOtp('');
            setConfirmationResultState(null);
            if (currentPhase === 'submitted') setCurrentPhase('enterDetails');
        }
    };
    const handleOtpChange = (event: React.ChangeEvent<HTMLInputElement>) => setOtp(event.target.value);

    const handleSendOtp = async () => {
        setError(null);
        if (!mobileNumber || (mobileInputRef.current && !mobileInputRef.current.checkValidity())) {
            setError("Please enter a valid Somali mobile number (e.g., +25261...).");
            mobileInputRef.current?.focus();
            return;
        }
        const formattedPhoneNumber = mobileNumber.startsWith('+') ? mobileNumber : `+252${mobileNumber.replace(/^0+/, '')}`; // Ensure +252 and remove leading zeros
        setIsSendingOtp(true);
        try {
            if (!recaptchaVerifierRef.current) {
                 await setupRecaptcha(); 
                 if (!recaptchaVerifierRef.current) { 
                     throw new Error("reCAPTCHA setup failed.");
                 }
            }
            console.log(`Sending OTP to ${formattedPhoneNumber} via Firebase...`);
            const confirmationResult = await signInWithPhoneNumber(auth, formattedPhoneNumber, recaptchaVerifierRef.current);
            console.log("OTP sent, confirmation result received.");
            setConfirmationResultState(confirmationResult);
            setCurrentPhase('verifyOtp');
            setTimeout(() => otpInputRef.current?.focus(), 100);
        } catch (err: any) {
            console.error("Firebase Error sending OTP:", err);
            let userMessage = "Could not send verification code. Please try again.";
             if (err.message && err.message.includes('reCAPTCHA')) { // Check for reCAPTCHA specific errors in message
                 userMessage = "reCAPTCHA verification failed. Please refresh and try again.";
                 if(recaptchaVerifierRef.current) recaptchaVerifierRef.current.clear(); // Clear instance
                 recaptchaVerifierRef.current = null; // Nullify ref
            } else if (err.code === 'auth/invalid-phone-number') {
                userMessage = "Invalid phone number format. Please use format like +252612345678.";
            } else if (err.code === 'auth/too-many-requests') {
                userMessage = "Too many requests. Please try again later.";
            }
            setError(userMessage);
            setConfirmationResultState(null);
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleVerifyOtp = async () => {
        setError(null);
        if (!otp || otp.length < 6) {
            setError("Please enter the 6-digit code.");
            otpInputRef.current?.focus();
            return;
        }
        if (!confirmationResultState) {
            setError("Verification session expired. Please request a new code.");
            setCurrentPhase('enterDetails'); 
            return;
        }
        setIsVerifyingOtp(true);
        try {
            console.log(`Verifying OTP: ${otp}`);
            const result = await confirmationResultState.confirm(otp);
            console.log("Firebase Phone Auth Successful, User:", result.user);
            setIsMobileVerified(true);
            setCurrentPhase('enterDetails'); // Go back to details, but now verified
            setError(null); // Clear any previous errors
            setConfirmationResultState(null); 
        } catch (err: any) {
            console.error("Firebase Error verifying OTP:", err);
            let userMessage = "Could not verify code. Please check the code and try again.";
            if (err.code === 'auth/invalid-verification-code'){
                userMessage = "Invalid verification code.";
            } else if (err.code === 'auth/code-expired') {
                userMessage = "Verification code has expired. Please request a new one.";
            }
            setError(userMessage);
            setIsMobileVerified(false);
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    const handleCopyCode = () => { /* ... unchanged ... */ };

    const handleSubmitRegistration = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);

        if (!generatedCode || !selectedPosition || !name || !mobileNumber || !isMobileVerified) {
            setError("Please complete all steps: select location, enter details, and verify mobile number.");
            return;
        }
        setIsSubmitting(true);
        let firebaseIdToken: string | null = null;
        try {
            if (auth.currentUser) {
                firebaseIdToken = await auth.currentUser.getIdToken(true); // Force refresh
            } else {
                // This case should ideally not be reached if isMobileVerified is true,
                // as OTP verification results in an authenticated user.
                setError("User authentication session not found. Please try verifying your number again.");
                setCurrentPhase('enterDetails'); // Go back to details to allow re-verification
                setIsMobileVerified(false); // Reset verification status
                setIsSubmitting(false);
                return;
            }

            const registrationData = {
                name,
                mobile: mobileNumber.startsWith('+') ? mobileNumber : `+252${mobileNumber.replace(/^0+/, '')}`, // Ensure consistent format
                code6D: generatedCode,
                latitude: selectedPosition.lat,   // <--- CHANGED TO latitude
                longitude: selectedPosition.lng,  // <--- CHANGED TO longitude
                context: addressContext,          // Can be null if geocoding failed
                firebaseToken: firebaseIdToken    // For backend to verify using Admin SDK
            };

            console.log('--- Sending Registration Data to Backend ---', registrationData);

            const response = await fetch(`${BACKEND_URL}/api/register`, { // <--- CHANGED TO /api/register
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${firebaseIdToken}` // Standard way to send token
                },
                body: JSON.stringify(registrationData),
            });

            // We need to check if response is JSON before parsing
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await response.json();
                if (!response.ok) {
                    let errorMsg = data.message || `Registration failed: ${response.statusText || response.status}`;
                    if (response.status === 401 || response.status === 403) { 
                        errorMsg = "Authentication with backend failed. Your session might be invalid.";
                    } else if (response.status === 409) { // Conflict
                        errorMsg = data.message || "There was a conflict with existing data (e.g., number already registered).";
                    }
                    throw new Error(errorMsg);
                }
                console.log('Backend registration successful:', data.message);
                setCurrentPhase('submitted');
            } else {
                // Handle non-JSON responses (like HTML 404 pages)
                const textResponse = await response.text();
                console.error("Received non-JSON response from backend:", response.status, textResponse);
                throw new Error(`Server returned an unexpected response (Status: ${response.status}). Check backend logs.`);
            }

        } catch (err: any) {
            console.error("Registration submission error:", err);
            setError(err.message || "Registration failed. Please check your connection and try again.");
            // Don't reset phase here if it's a network error, allow retry of submission.
            // If it's an auth error from backend, then maybe reset phase.
            // For now, just show error.
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRegisterAnother = () => { /* ... unchanged ... */ };

    if (loadError) { return <ErrorMessage className="m-4" message={`Error loading Google Maps: ${loadError.message}. Check API key/internet.`} />; }

    let customMarkerOptions: google.maps.Symbol | google.maps.Icon | undefined = undefined;
    if (isLoaded && typeof google !== 'undefined' && google.maps?.SymbolPath && google.maps?.Point) {
        customMarkerOptions = { path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z', fillColor: '#2563EB', fillOpacity: 1.0, strokeColor: '#ffffff', strokeWeight: 1.5, scale: 1.0, anchor: new google.maps.Point(0, -35) };
    }

    const isSubmitButtonDisabled = !generatedCode || !name || !mobileNumber || !isMobileVerified || isSubmitting;
    const rectangleKey = squareBounds ? JSON.stringify(squareBounds) : 'no-bounds'; 

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-6 p-4 md:p-6">
            {/* Map Column */}
            <div className="lg:col-span-2 relative">
                {/* ... Map JSX unchanged ... */}
                 <h2 className="text-2xl font-semibold mb-2 text-gray-800 flex items-center">
                    <FiMapPin className="mr-2 text-blue-600" />
                    {currentPhase === 'selectLocation' ? '1. Select Location' : 'Location Selected'}
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                    {currentPhase === 'selectLocation' ? 'Click map to pinpoint location.' : 'Click map to change location.'}
                </p>
                {!isLoaded ? (
                    <div style={MAP_CONTAINER_STYLE} className="flex items-center justify-center bg-gray-100 border rounded-lg">
                        <LoadingSpinner message="Loading Map..." size="lg" />
                    </div>
                ) : (
                    <div style={MAP_CONTAINER_STYLE}>
                        <button onClick={handleLocateMe} disabled={isLocating} title="Show My Location" className="absolute top-3 right-3 z-10 bg-white p-2.5 rounded-full shadow-md text-gray-600 hover:text-blue-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-wait transition" style={{ transform: 'translateZ(0)' }} >
                            {isLocating ? ( <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> ) : ( <FiCrosshair className="h-5 w-5" /> )}
                        </button>
                        <GoogleMap mapContainerStyle={{ width:'100%', height:'100%', borderRadius:'inherit'}} center={MOGADISHU_CENTER} zoom={14} options={MAP_OPTIONS} onLoad={onMapLoad} onUnmount={onUnmount} onClick={handleMapClick} >
                            {selectedPosition && ( <Marker position={selectedPosition} icon={customMarkerOptions} /> )}
                            {squareBounds && selectedPosition && ( <Rectangle key={rectangleKey} bounds={squareBounds} options={{ strokeColor: '#4285F4', strokeOpacity: 0.7, strokeWeight: 1.5, fillColor: '#4285F4', fillOpacity: 0.1, clickable: false, draggable: false, editable: false, zIndex: 1 }} /> )}
                        </GoogleMap>
                    </div>
                )}
            </div>

            {/* Details Column */}
            <div className="lg:col-span-1 flex flex-col space-y-5">
                 <div id="recaptcha-container" style={{ marginTop: '10px' }}></div> {/* Moved slightly for visibility if needed */}

                {currentPhase === 'selectLocation' && (
                    <>
                        <h2 className="text-2xl font-semibold text-gray-800">Details</h2>
                        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm flex items-center space-x-3">
                            <FiInfo className="h-5 w-5 flex-shrink-0"/>
                            <span>Click map to start. Your 6D code and details will appear here.</span>
                        </div>
                    </>
                )}

                {(currentPhase === 'enterDetails' || currentPhase === 'verifyOtp' || currentPhase === 'submitted') && (
                    <>
                        <h2 className="text-2xl font-semibold text-gray-800">
                            {currentPhase === 'submitted' ? 'Registration Summary' : '2. Enter Your Details'}
                        </h2>
                        {isLoadingGeocode && currentPhase !== 'submitted' && <LoadingSpinner message="Getting location details..." />}
                        
                        {!isLoadingGeocode && generatedCode && (
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Your 6D Code</label>
                                <div className="flex items-center justify-between">
                                    <strong className="text-2xl font-mono text-blue-700 tracking-wider">{generatedCode}</strong>
                                    <button onClick={handleCopyCode} title="Copy 6D Code" className="p-2 text-gray-400 hover:text-blue-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-300">
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

                        {currentPhase !== 'submitted' && (
                            <form onSubmit={handleSubmitRegistration} className="space-y-4">
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
                                    icon={<FiUser />}
                                />
                                <div className="space-y-1">
                                    <Input
                                        ref={mobileInputRef}
                                        label="Mobile Number"
                                        id="mobileNumber"
                                        type="tel"
                                        placeholder="+25261xxxxxxx" 
                                        value={mobileNumber}
                                        onChange={handleMobileChange}
                                        required
                                        pattern="^\+252(61|62|63|65|68|90)\d{7}$" 
                                        title="Format: +25261xxxxxxx"
                                        disabled={isSubmitting || currentPhase === 'verifyOtp' || isMobileVerified}
                                        aria-describedby="mobile-helper-text"
                                        icon={<FiPhone />}
                                    />
                                    <div className='flex justify-between items-center mt-1'>
                                        <p id="mobile-helper-text" className="text-xs text-gray-500">Verification required.</p>
                                        {!isMobileVerified && currentPhase === 'enterDetails' && ( // Only show Send Code if in enterDetails and not verified
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={handleSendOtp} 
                                                disabled={!mobileNumber || (mobileInputRef.current && !mobileInputRef.current.checkValidity()) || isSubmitting || isSendingOtp}
                                                isLoading={isSendingOtp}
                                                className="text-xs px-3 py-1"
                                            > Send Code </Button>
                                        )}
                                        {isMobileVerified && (
                                            <span className="text-xs text-green-600 font-medium flex items-center"><FiCheckCircle className="mr-1"/>Verified</span>
                                        )}
                                    </div>
                                </div>
                                
                                {currentPhase === 'verifyOtp' && (
                                    <div className="p-4 border border-blue-200 rounded-lg bg-blue-50 space-y-3">
                                        <p className='text-sm font-medium text-blue-800'>Enter 6-digit code sent to {mobileNumber}</p>
                                        <Input
                                            ref={otpInputRef}
                                            label="Verification Code"
                                            id="otp"
                                            type="text"
                                            inputMode='numeric'
                                            maxLength={6} 
                                            placeholder="123456"
                                            value={otp}
                                            onChange={handleOtpChange}
                                            required
                                            disabled={isVerifyingOtp || isMobileVerified} // isMobileVerified might prevent re-entry if needed
                                            className="tracking-[0.3em] text-center font-medium text-lg"
                                            icon={<FiLock />}
                                        />
                                        <Button
                                            type="button"
                                            variant="primary"
                                            onClick={handleVerifyOtp} 
                                            isLoading={isVerifyingOtp}
                                            disabled={isVerifyingOtp || !otp || otp.length < 6}
                                            className="w-full"
                                        > Verify Code </Button>
                                        <Button type="button" variant="link" onClick={() => { setCurrentPhase('enterDetails'); setError(null); setConfirmationResultState(null); setOtp(''); }} disabled={isVerifyingOtp} className="w-full text-xs" > Back / Change Number </Button>
                                    </div>
                                )}
                                
                                {currentPhase === 'enterDetails' && isMobileVerified && (
                                    <Button type="submit" variant="primary" disabled={isSubmitButtonDisabled} isLoading={isSubmitting} className="w-full !mt-6" > 
                                        Submit Registration
                                    </Button>
                                )}
                            </form>
                        )}
                    </>
                )}

                {currentPhase === 'submitted' && (
                    <div className="bg-green-50 border border-green-300 text-green-800 px-5 py-4 rounded-lg text-center space-y-2" role="alert">
                        <FiCheckCircle className="h-8 w-8 mx-auto text-green-600"/>
                        <h3 className="font-semibold text-lg">Registration Complete!</h3>
                        <p className="text-sm">Code <span className="font-mono font-bold">{generatedCode}</span> linked to <span className="font-medium">{mobileNumber}</span>.</p>
                        <Button variant='secondary' className='mt-4 text-xs' onClick={handleRegisterAnother}>Register another location?</Button>
                    </div>
                )}
                <ErrorMessage message={error} className="mt-auto" />
            </div>
        </div>
    );
};

export default RegisterMapPage;