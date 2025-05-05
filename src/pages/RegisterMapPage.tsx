// src/pages/RegisterMapPage.tsx

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Rectangle,
  Libraries // Ensure Libraries is imported if used in useJsApiLoader
} from '@react-google-maps/api';

// --- Firebase Imports ---
// Make sure 'firebase' package is installed (npm install firebase)
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
// *** FIXED: Corrected path to firebase.ts ***
import { auth } from '../lib/firebase';

// --- Local Imports ---
// Adjust paths as needed for your project structure
import { generate6DCode, get11mSquareBounds } from '../lib/addressUtils';
import { reverseGeocode, AddressContext } from '../services/googleMapsService';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import { FiMapPin, FiCheck, FiCopy, FiInfo, FiCheckCircle, FiUser, FiPhone, FiCrosshair, FiLock } from 'react-icons/fi';

// --- Types ---
type Position = google.maps.LatLngLiteral;
type SquareBounds = google.maps.LatLngBoundsLiteral;
type RegistrationPhase = 'selectLocation' | 'enterDetails' | 'verifyOtp' | 'submitted';

// --- Constants ---
const MAP_LIBRARIES: Libraries = ['geometry']; // Define libraries if needed
// *** FIXED: Added React.CSSProperties type ***
const MAP_CONTAINER_STYLE: React.CSSProperties = { width: '100%', height: '450px', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid #e5e7eb', position: 'relative' };
const MOGADISHU_CENTER = { lat: 2.0469, lng: 45.3182 };
const MAP_OPTIONS: google.maps.MapOptions = { disableDefaultUI: true, zoomControl: true, zoomControlOptions: { position: "RIGHT_BOTTOM" as unknown as google.maps.ControlPosition }, mapTypeControl: false, streetViewControl: false, fullscreenControl: false, minZoom: 5, gestureHandling: 'greedy', clickableIcons: false, draggableCursor: 'crosshair', draggingCursor: 'grabbing', };
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'; // Use env variable or default

// --- Component ---
const RegisterMapPage: React.FC = () => {
    // --- Google Maps Loader ---
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
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
    const [otp, setOtp] = useState<string>(''); // OTP input value
    const [squareBounds, setSquareBounds] = useState<SquareBounds | null>(null);
    const [currentPhase, setCurrentPhase] = useState<RegistrationPhase>('selectLocation');
    const [isMobileVerified, setIsMobileVerified] = useState<boolean>(false); // Tracks if OTP verification was successful
    const [isLoadingGeocode, setIsLoadingGeocode] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // For final registration submission
    const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false); // For sending OTP action
    const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false); // For verifying OTP action
    const [error, setError] = useState<string | null>(null);
    const [isLocating, setIsLocating] = useState<boolean>(false);
    const [copied, setCopied] = useState<boolean>(false);
    const [confirmationResultState, setConfirmationResultState] = useState<ConfirmationResult | null>(null); // Firebase confirmation result

    // --- Refs ---
    const nameInputRef = useRef<HTMLInputElement>(null);
    const mobileInputRef = useRef<HTMLInputElement>(null);
    const otpInputRef = useRef<HTMLInputElement>(null);
    const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null); // Ref for reCAPTCHA instance

    // --- Setup reCAPTCHA Verifier ---
    const setupRecaptcha = useCallback(() => {
        // Ensure cleanup on unmount or re-render if necessary
        if (recaptchaVerifierRef.current) {
            recaptchaVerifierRef.current.clear(); // Clear previous instance if exists
        }

        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'invisible', // Use 'invisible' for less user friction
            // *** FIXED: Changed response to _response to indicate unused parameter ***
            'callback': (_response: any) => {
                console.log("reCAPTCHA verified (invisible)");
                // Usually triggers OTP sending automatically after this with invisible
            },
            'expired-callback': () => {
                console.warn("reCAPTCHA expired");
                setError("reCAPTCHA verification expired, please try sending the code again.");
                if (recaptchaVerifierRef.current) {
                    recaptchaVerifierRef.current.clear();
                }
                recaptchaVerifierRef.current = null; // Allow re-initialization
            }
        });

        // Optional: Render if needed, though often automatic with invisible
        return recaptchaVerifierRef.current.render().catch(err => {
            console.error("reCAPTCHA render error:", err);
            setError("Could not initialize reCAPTCHA. Check console and ensure container div exists.");
            throw err; // Re-throw error to stop OTP sending
        });

    }, []); // Dependency on `auth` ensures it re-runs if auth instance changes (unlikely)

    // --- Map Callbacks ---
    const onMapLoad = useCallback((map: google.maps.Map) => {
        map.setOptions({ draggableCursor: 'crosshair', draggingCursor: 'grabbing', clickableIcons: false });
        setMapInstance(map);
        map.setCenter(MOGADISHU_CENTER);
        map.setZoom(14);
    }, []);

    const onUnmount = useCallback(() => {
        setMapInstance(null);
        // Clean up reCAPTCHA on unmount
        if (recaptchaVerifierRef.current) {
            recaptchaVerifierRef.current.clear();
            recaptchaVerifierRef.current = null;
        }
    }, []);

    // --- Map Interaction ---
    const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
        if (!event.latLng) return;
        const clickedPos: Position = { lat: event.latLng.lat(), lng: event.latLng.lng() };
        // Reset relevant state on new location selection
        setSelectedPosition(clickedPos);
        setGeneratedCode(null);
        setAddressContext(null);
        setSquareBounds(null);
        setError(null);
        setCurrentPhase('enterDetails');
        setIsMobileVerified(false); // Reset verification status
        setOtp('');
        setConfirmationResultState(null); // Reset Firebase confirmation
        setIsLoadingGeocode(true);
        setCopied(false);
        setTimeout(() => nameInputRef.current?.focus(), 300); // Focus name field
    }, []); // No dependencies needed here

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
                // Simulate map click at user's location
                handleMapClick({ latLng: new google.maps.LatLng(userPos.lat, userPos.lng) } as google.maps.MapMouseEvent);
                setIsLocating(false);
            },
            (geoError) => {
                let errorMsg = "Could not get location.";
                // ... (error handling based on geoError.code) ...
                console.error("Geolocation Error:", geoError);
                setError(errorMsg);
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
    }, [mapInstance, handleMapClick]);

    // --- Effect for Processing Selected Location ---
    useEffect(() => {
        if (!selectedPosition) {
            setIsLoadingGeocode(false);
            return;
        }
        let isActive = true;
        let accumulatedError: string | null = null;

        const processSelectedLocation = async () => {
            setIsLoadingGeocode(true);
            // Generate 6D Code
            const code = generate6DCode(selectedPosition.lat, selectedPosition.lng);
            if (isActive) setGeneratedCode(code);
            if (!code) {
                accumulatedError = "Could not generate 6D code.";
                console.warn("Code generation failed", selectedPosition);
            }
            // Calculate Bounds
            const bounds = get11mSquareBounds(selectedPosition.lat, selectedPosition.lng);
            if (isActive) setSquareBounds(bounds);

            // Fetch Address Context
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

        return () => { isActive = false; }; // Cleanup function
    }, [selectedPosition]);

    // --- Form Input Handlers ---
    const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value);
    const handleMobileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setMobileNumber(event.target.value);
        // Reset verification if number changes
        if (isMobileVerified) {
            setIsMobileVerified(false);
            setOtp('');
            setConfirmationResultState(null);
            if (currentPhase === 'submitted') setCurrentPhase('enterDetails');
        }
    };
    const handleOtpChange = (event: React.ChangeEvent<HTMLInputElement>) => setOtp(event.target.value);

    // --- Firebase OTP Handlers ---
    const handleSendOtp = async () => {
        setError(null);
        if (!mobileNumber || (mobileInputRef.current && !mobileInputRef.current.checkValidity())) {
            setError("Please enter a valid Somali mobile number (e.g., +25261...).");
            mobileInputRef.current?.focus();
            return;
        }

        const formattedPhoneNumber = mobileNumber.startsWith('+') ? mobileNumber : `+252${mobileNumber}`;
        setIsSendingOtp(true);

        try {
            // Ensure reCAPTCHA is ready
            if (!recaptchaVerifierRef.current) {
                 await setupRecaptcha(); // Setup returns a promise now
                 if (!recaptchaVerifierRef.current) { // Double check after setup attempt
                     throw new Error("reCAPTCHA setup failed or was cancelled.");
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
            // ... (Add specific error code handling: auth/invalid-phone-number, auth/too-many-requests, reCAPTCHA errors) ...
             if (err.message.includes('reCAPTCHA')) {
                 userMessage = "reCAPTCHA verification failed. Please refresh and try again.";
                 recaptchaVerifierRef.current?.clear();
                 recaptchaVerifierRef.current = null;
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
            setError("Verification session expired or invalid. Please request a new code.");
            setCurrentPhase('enterDetails'); // Go back to allow resend
            return;
        }
        setIsVerifyingOtp(true);

        try {
            console.log(`Verifying OTP: ${otp}`);
            const result = await confirmationResultState.confirm(otp);
            console.log("Firebase Phone Auth Successful, User:", result.user);

            setIsMobileVerified(true);
            setCurrentPhase('enterDetails');
            setError(null);
            setConfirmationResultState(null); // Clear confirmation after success

        } catch (err: any) {
            console.error("Firebase Error verifying OTP:", err);
            let userMessage = "Could not verify code. Please check the code and try again.";
            // ... (Add specific error code handling: auth/invalid-verification-code, auth/code-expired) ...
            setError(userMessage);
            setIsMobileVerified(false);
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    // --- Copy Code Handler ---
    const handleCopyCode = () => {
        if (generatedCode) {
            navigator.clipboard.writeText(generatedCode).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }).catch(err => {
                console.error("Copy failed: ", err);
                setError("Could not copy code.");
            });
        }
    };

    // --- Final Registration Submission ---
    const handleSubmitRegistration = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);

        if (!generatedCode || !selectedPosition || !name || !mobileNumber || !isMobileVerified) {
            setError("Please complete all steps: select location, enter details, and verify mobile number.");
            // ... (focus logic) ...
            return;
        }

        setIsSubmitting(true);
        let firebaseIdToken: string | null = null;

        try {
            // Get Firebase ID token for backend verification
            if (auth.currentUser) {
                firebaseIdToken = await auth.currentUser.getIdToken(true);
            } else {
                throw new Error("User not authenticated with Firebase. Please re-verify number.");
            }

            const registrationData = {
                name,
                mobile: mobileNumber,
                code6D: generatedCode,
                latitude: selectedPosition.lat,
                longitude: selectedPosition.lng,
                context: addressContext,
                firebaseToken: firebaseIdToken // Send token to backend
            };

            console.log('--- Sending Registration Data to Backend ---', registrationData);

            const response = await fetch(`${BACKEND_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registrationData),
            });

            const data = await response.json();

            if (!response.ok) {
                 let errorMsg = data.message || `Registration failed: ${response.statusText}`;
                 if (response.status === 401 || response.status === 403) { // Backend token verification failed
                    errorMsg = "Authentication with backend failed. Please try verifying number again.";
                 }
                throw new Error(errorMsg);
            }

            console.log('Backend registration successful:', data.message);
            setCurrentPhase('submitted');

        } catch (err: any) {
            console.error("Registration submission error:", err);
            setError(err.message || "Registration failed. Please try again.");
            setCurrentPhase('enterDetails');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Register Another Location ---
    const handleRegisterAnother = () => {
        setCurrentPhase('selectLocation');
        setSelectedPosition(null);
        setGeneratedCode(null);
        setAddressContext(null);
        setName('');
        setMobileNumber('');
        setOtp('');
        setIsMobileVerified(false);
        setError(null);
        setCopied(false);
        setSquareBounds(null);
        setConfirmationResultState(null);
        // Consider resetting reCAPTCHA here if needed
        if (recaptchaVerifierRef.current) {
             recaptchaVerifierRef.current.clear();
             recaptchaVerifierRef.current = null;
        }
    };

    // --- Render Logic ---
    if (loadError) { return <ErrorMessage className="m-4" message={`Error loading Google Maps: ${loadError.message}. Check API key/internet.`} />; }

    // Define marker options (consider moving outside component if static)
    let customMarkerOptions: google.maps.Symbol | google.maps.Icon | undefined = undefined;
    if (isLoaded && google?.maps?.SymbolPath && google?.maps?.Point) {
        customMarkerOptions = { path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z', fillColor: '#2563EB', fillOpacity: 1.0, strokeColor: '#ffffff', strokeWeight: 1.5, scale: 1.0, anchor: new google.maps.Point(0, -35) };
    }

    const isSubmitButtonDisabled = !generatedCode || !name || !mobileNumber || !isMobileVerified || isSubmitting;
    const rectangleKey = squareBounds ? JSON.stringify(squareBounds) : 'no-bounds'; // Key for React reconciliation

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-6">
            {/* Map Column */}
            <div className="lg:col-span-2 relative">
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
                        {/* Locate Me Button */}
                         {/* *** FIXED: Added type assertion for inline style *** */}
                        <button onClick={handleLocateMe} disabled={isLocating} title="Show My Location" className="absolute top-3 right-3 z-10 bg-white p-2.5 rounded-full shadow-md text-gray-600 hover:text-blue-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-wait transition" style={{ transform: 'translateZ(0)' } as React.CSSProperties} >
                            {isLocating ? ( <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> ) : ( <FiCrosshair className="h-5 w-5" /> )}
                        </button>
                        {/* Google Map Component */}
                        <GoogleMap mapContainerStyle={{ width:'100%', height:'100%', borderRadius:'inherit'}} center={MOGADISHU_CENTER} zoom={14} options={MAP_OPTIONS} onLoad={onMapLoad} onUnmount={onUnmount} onClick={handleMapClick} >
                            {selectedPosition && ( <Marker position={selectedPosition} icon={customMarkerOptions} /> )}
                            {squareBounds && selectedPosition && ( <Rectangle key={rectangleKey} bounds={squareBounds} options={{ strokeColor: '#4285F4', strokeOpacity: 0.7, strokeWeight: 1.5, fillColor: '#4285F4', fillOpacity: 0.1, clickable: false, draggable: false, editable: false, zIndex: 1 }} /> )}
                        </GoogleMap>
                    </div>
                )}
            </div>

            {/* Details Column */}
            <div className="lg:col-span-1 flex flex-col space-y-5">
                 {/* --- reCAPTCHA Container (Must exist in the DOM for RecaptchaVerifier) --- */}
                 {/* It's okay for this to be empty if using 'invisible' reCAPTCHA size */}
                 <div id="recaptcha-container"></div>

                {/* Initial State Message */}
                {currentPhase === 'selectLocation' && (
                    <>
                        <h2 className="text-2xl font-semibold text-gray-800">Details</h2>
                        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm flex items-center space-x-3">
                            <FiInfo className="h-5 w-5 flex-shrink-0"/>
                            <span>Click map to start.</span>
                        </div>
                    </>
                )}

                {/* Details/Verification/Submitted States */}
                {(currentPhase === 'enterDetails' || currentPhase === 'verifyOtp' || currentPhase === 'submitted') && (
                    <>
                        <h2 className="text-2xl font-semibold text-gray-800">
                            {currentPhase === 'submitted' ? 'Registration Summary' : '2. Enter Your Details'}
                        </h2>
                        {/* Loading/Generated Code/Address Display */}
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
                                    // className="pl-10" // Applied via paddingStyle logic in Input component
                                />
                                {/* Mobile Input Section */}
                                <div className="space-y-1">
                                    <Input
                                        ref={mobileInputRef}
                                        label="Mobile Number"
                                        id="mobileNumber"
                                        type="tel"
                                        placeholder="+25261xxxxxxx" // Guide E.164 format
                                        value={mobileNumber}
                                        onChange={handleMobileChange}
                                        required
                                        pattern="^\+252(61|62|63|65|68|90)\d{7}$" // E.164 pattern
                                        title="Format: +25261xxxxxxx"
                                        disabled={isSubmitting || currentPhase === 'verifyOtp' || isMobileVerified}
                                        aria-describedby="mobile-helper-text"
                                        icon={<FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"/>}
                                        // className="pl-10" // Applied via paddingStyle logic in Input component
                                    />
                                    <div className='flex justify-between items-center mt-1'>
                                        <p id="mobile-helper-text" className="text-xs text-gray-500">Verification required.</p>
                                        {!isMobileVerified && currentPhase !== 'verifyOtp' && (
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={handleSendOtp} // Calls Firebase logic
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
                                {/* OTP Section */}
                                {currentPhase === 'verifyOtp' && (
                                    <div className="p-4 border border-blue-200 rounded-lg bg-blue-50 space-y-3">
                                        <p className='text-sm font-medium text-blue-800'>Enter 6-digit code sent to {mobileNumber}</p>
                                        <Input
                                            ref={otpInputRef}
                                            label="Verification Code"
                                            id="otp"
                                            type="text"
                                            inputMode='numeric'
                                            maxLength={6} // Firebase uses 6 digits
                                            placeholder="123456"
                                            value={otp}
                                            onChange={handleOtpChange}
                                            required
                                            disabled={isVerifyingOtp || isMobileVerified}
                                            className="tracking-[0.3em] text-center font-medium text-lg"
                                            icon={<FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"/>}
                                        />
                                        <Button
                                            type="button"
                                            variant="primary"
                                            onClick={handleVerifyOtp} // Calls Firebase logic
                                            isLoading={isVerifyingOtp}
                                            disabled={isVerifyingOtp || !otp || otp.length < 6}
                                            className="w-full"
                                        > Verify Code </Button>
                                        <Button type="button" variant="secondary" onClick={() => { setCurrentPhase('enterDetails'); setError(null); setConfirmationResultState(null); }} disabled={isVerifyingOtp} className="w-full text-xs" > Cancel </Button>
                                    </div>
                                )}
                                {/* Final Submit Button */}
                                {currentPhase === 'enterDetails' && isMobileVerified && (
                                    <Button type="submit" variant="primary" disabled={isSubmitButtonDisabled} isLoading={isSubmitting} className="w-full" >
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
                        <Button variant='secondary' className='mt-4 text-xs' onClick={handleRegisterAnother}>Register another location?</Button>
                    </div>
                )}

                {/* Global Error display */}
                <ErrorMessage message={error} className="mt-auto" /> {/* Position error message */}
            </div>
        </div>
    );
};

export default RegisterMapPage;