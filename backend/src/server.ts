import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './db'; // Import the Prisma client instance

// backend/src/server.ts
import admin from 'firebase-admin';
// ... other imports ...

dotenv.config(); // Make sure dotenv runs before accessing process.env

// --- Firebase Admin Initialization ---
try {
    // Check for the environment variable containing the JSON key content
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (serviceAccountJson) {
        // --- Production / Deployed Environment ---
        // Parse the JSON string from the environment variable
        const serviceAccount = JSON.parse(serviceAccountJson);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('[server]: Firebase Admin SDK initialized successfully using ENV variable.');

    } else {
        // --- Local Development Environment ---
        // Fallback to using the local file path
        // Make sure this path is correct relative to where the server runs LOCALLY
        // and the file exists there.
        const serviceAccountPath = './d-address-455414-firebase-adminsdk-fbsvc-bc97f23cf8.json';
        // Check if file exists locally before trying to use it (optional but good practice)
        // import fs from 'fs'; // Add this import at the top if using fs.existsSync
        // if (!fs.existsSync(serviceAccountPath)) {
        //    throw new Error(`Service account file not found at: ${serviceAccountPath}. Check path.`);
        // }
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccountPath)
        });
        console.log('[server]: Firebase Admin SDK initialized successfully using file path.');
    }

} catch (error) {
  console.error('[server]: Error initializing Firebase Admin SDK:', error);
  // Consider exiting if initialization is critical
  // process.exit(1);
}
// --- End Firebase Admin Initialization ---


const app: Express = express();
const PORT = process.env.PORT || 3001;

// --- Middlewares ---
// For production, restrict origin to your Netlify frontend URL(s)
app.use(cors({
    origin: '*' // Allow all origins for initial testing - CHANGE FOR PRODUCTION!
}));
app.use(express.json()); // Enable parsing JSON request bodies

// --- Basic Route ---
app.get('/', (req: Request, res: Response) => {
  res.send('Somali 6D Address Backend is running!');
});

// --- API Routes ---

// Endpoint to handle registration submission
// *** ADDED verifyFirebaseToken middleware ***
app.post('/register', verifyFirebaseToken, async (req: AuthenticatedRequest, res: Response) => {
    // If code reaches here, the token was verified by the middleware
    // The middleware also attached `req.user` containing the decoded token

    const { name, mobile, code6D, latitude, longitude, context, firebaseToken /* token is used by middleware, not needed here */ } = req.body;
    const firebaseUid = req.user?.uid; // Get UID from verified token
    const verifiedPhoneNumber = req.user?.phone_number; // Get phone from verified token

    console.log(`[Register]: Processing VERIFIED registration for UID: ${firebaseUid}, Phone: ${verifiedPhoneNumber}`);


    // --- Basic Backend Validation ---
    if (!name || !mobile || !code6D || latitude == null || longitude == null) {
        console.warn('Registration attempt missing required data:', { name, mobile, code6D, latitude, longitude });
        return res.status(400).json({ message: 'Missing required registration data (name, mobile, code6D, latitude, longitude).' });
    }
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
         console.warn('Registration attempt with invalid coordinate types:', { latitude, longitude });
         return res.status(400).json({ message: 'Latitude and Longitude must be numbers.' });
    }
    // --- Optional: Compare mobile from body with verifiedPhoneNumber from token ---
    // if (mobile !== verifiedPhoneNumber) {
    //      console.warn(`Mobile number mismatch: body (${mobile}) vs token (${verifiedPhoneNumber})`);
    //      return res.status(400).json({ message: 'Request mobile number does not match verified number.' });
    // }

    try {
        // Check if mobile number already exists (using verified number might be better)
        const existingMobile = await prisma.address.findUnique({ where: { mobile: verifiedPhoneNumber || mobile } }); // Prefer verified number
        if (existingMobile) {
            console.log(`Conflict: Mobile ${verifiedPhoneNumber || mobile} exists.`);
            // Consider returning a different status code or message if needed
            return res.status(409).json({ message: 'Mobile number already registered.' });
        }

        // Check if code already exists
        const existingCode = await prisma.address.findUnique({ where: { code6D } });
        if (existingCode) {
            console.log(`Conflict: Code ${code6D} exists.`);
            return res.status(409).json({ message: 'Generated 6D Code already exists. Please select a slightly different location.' });
        }

        // Create new address record
        const newAddress = await prisma.address.create({
            data: {
                name,
                mobile: verifiedPhoneNumber || mobile, // Store the verified number if available
                code6D,
                latitude,
                longitude,
                sublocality: context?.sublocality || null,
                locality: context?.locality || null,
                firebaseUid: firebaseUid, // *** Store the Firebase UID *** (Ensure schema has this field)
            },
        });

        console.log('Registration successful:', newAddress.id);
        res.status(201).json({ message: 'Registration successful!', address: newAddress });

    } catch (error: any) {
        console.error('Registration Error:', error);
        // Check for specific Prisma errors if needed (e.g., unique constraint violation)
        res.status(500).json({ message: 'Registration failed due to a server error.' });
    }
});


// --- Removed /send-otp and /verify-otp routes ---


// --- Start Server ---
app.listen(PORT, () => {
  console.log(`⚡️[server]: Backend server is running at http://localhost:${PORT}`);
});


// Optional: Graceful shutdown handlers
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server')
    process.exit(0)
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server')
    process.exit(0)
});