// ========================================================================
// FILE: backend/src/server.ts
// ========================================================================
console.log('[SERVER_STARTUP]: Top of server.ts - START');

import express, { Express, Request, Response } from 'express';
console.log('[SERVER_STARTUP]: Express imported.');

import cors from 'cors';
console.log('[SERVER_STARTUP]: CORS imported.');

import dotenv from 'dotenv';
console.log('[SERVER_STARTUP]: dotenv imported.');
dotenv.config(); // Ensure this is called as early as possible
console.log('[SERVER_STARTUP]: dotenv configured.');

// Import Prisma Client AFTER dotenv.config() if DATABASE_URL is in .env for local dev
// and AFTER its own logging in db.ts
import prisma from './db'; 
console.log('[SERVER_STARTUP]: Prisma client module imported from db.ts.');

import admin from 'firebase-admin';
console.log('[SERVER_STARTUP]: Firebase Admin SDK imported.');

// Import your existing middleware and interface
import { verifyFirebaseToken, AuthenticatedRequest } from './middleware/firebaseAuthMiddleware';
console.log('[SERVER_STARTUP]: Auth middleware imported.');


// --- Firebase Admin Initialization ---
console.log('[SERVER_STARTUP]: Attempting Firebase Admin SDK Initialization...');
try {
    const serviceAccountJsonString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (serviceAccountJsonString && serviceAccountJsonString.trim() !== "") {
        console.log('[SERVER_STARTUP]: FIREBASE_SERVICE_ACCOUNT_JSON environment variable found.');
        // Attempt to parse the JSON string from the environment variable
        const serviceAccount = JSON.parse(serviceAccountJsonString);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('[SERVER_STARTUP]: Firebase Admin SDK initialized successfully using ENV variable.');
    } else {
        // This block should ideally NOT run on Render if FIREBASE_SERVICE_ACCOUNT_JSON is correctly set.
        // This is a fallback for local development if the ENV var is not set.
        const serviceAccountPath = '../d-address-455414-firebase-adminsdk-fbsvc-bc97f23cf8.json'; // Adjusted path assuming server.ts is in src
        console.warn(`[SERVER_STARTUP]: FIREBASE_SERVICE_ACCOUNT_JSON environment variable NOT found or is empty. Attempting to use local file: ${serviceAccountPath}`);
        // Check if file exists before trying - IMPORTANT for local dev without the file
        // For this, you'd need to import fs: import fs from 'fs';
        // if (!require('fs').existsSync(serviceAccountPath)) {
        //    console.error(`[SERVER_STARTUP]: Local service account file NOT FOUND at ${serviceAccountPath}. Firebase Admin WILL FAIL to initialize if no ENV var either.`);
        //    throw new Error(`Service account file not found at: ${serviceAccountPath}`);
        // }
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccountPath) // This will throw if path is wrong or file is malformed
        });
        console.log('[SERVER_STARTUP]: Firebase Admin SDK initialized successfully using local file path. THIS SHOULD NOT HAPPEN ON RENDER.');
    }
} catch (error: any) {
  console.error('[SERVER_STARTUP]: FATAL Error initializing Firebase Admin SDK. Potential issues:');
  console.error('[SERVER_STARTUP]: 1. FIREBASE_SERVICE_ACCOUNT_JSON env var is missing, empty, or not valid JSON.');
  console.error('[SERVER_STARTUP]: 2. If using local fallback, the path to the .json file is incorrect or file is malformed.');
  console.error('[SERVER_STARTUP]: Detailed error:', error);
  process.exit(1); // Exit if Firebase Admin can't initialize, as auth will fail
}
console.log('[SERVER_STARTUP]: Firebase Admin SDK Initialization block finished successfully.');
// --- End Firebase Admin Initialization ---


const app: Express = express();
console.log('[SERVER_STARTUP]: Express app instance created.');

const PORT_STRING: string = process.env.PORT || "3001"; // Default to "3001" if process.env.PORT is not set
let PORT: number;

try {
    PORT = parseInt(PORT_STRING, 10);
    if (isNaN(PORT) || PORT <= 0) {
        console.error(`[SERVER_STARTUP]: Invalid PORT value "${PORT_STRING}". Using default 3001.`);
        PORT = 3001; // Fallback to a default if parsing fails or value is invalid
    }
    console.log(`[SERVER_STARTUP]: PORT configured to: ${PORT} (Raw env: ${process.env.PORT}, Default: 3001)`);
} catch (e) {
    console.error(`[SERVER_STARTUP]: Error parsing PORT environment variable "${PORT_STRING}". Using default 3001. Error:`, e);
    PORT = 3001;
}


// --- Middlewares ---
console.log('[SERVER_STARTUP]: Applying CORS middleware...');
app.use(cors({ 
    // For production, restrict origins. Example:
    // origin: ['https://your-frontend.netlify.app', 'http://localhost:3000'] 
    origin: '*' // Allow all for development and initial testing
}));
console.log('[SERVER_STARTUP]: CORS middleware applied.');

console.log('[SERVER_STARTUP]: Applying express.json middleware...');
app.use(express.json()); 
console.log('[SERVER_STARTUP]: express.json middleware applied.');


// --- Basic Health Check Route ---
app.get('/', (req: Request, res: Response) => {
  console.log('[HEALTH_CHECK]: GET / received');
  res.status(200).send('Somali 6D Address Backend is ALIVE and RESPONDING!');
});
console.log('[SERVER_STARTUP]: Root GET / health check route defined.');


// --- API Routes ---
console.log('[SERVER_STARTUP]: Defining /api/register POST route...');
app.post('/api/register', verifyFirebaseToken, async (req: AuthenticatedRequest, res: Response) => {
    console.log('[RegisterRoute]: POST /api/register - Request received.');
    
    const { name, mobile, code6D, latitude, longitude, context } = req.body;
    
    const firebaseUid = req.user?.uid;
    const verifiedPhoneNumberFromToken = req.user?.phone_number; 

    if (!firebaseUid) {
        console.error('[RegisterRoute]: Firebase UID not found in req.user after token verification. This indicates an issue with the auth middleware or token.');
        return res.status(500).json({ message: 'Authentication error: User UID missing after token verification.' });
    }

    console.log(`[RegisterRoute]: Processing registration for UID: ${firebaseUid}, Verified Phone from Token: ${verifiedPhoneNumberFromToken}, Mobile from Body: ${mobile}`);

    // Basic Backend Validation
    if (!name || !mobile || !code6D || latitude == null || longitude == null ) {
        console.warn(`[RegisterRoute]: Missing required fields. UID: ${firebaseUid}. Provided:`, { name, mobile, code6D, latitude, longitude });
        return res.status(400).json({ message: 'Missing required fields (name, mobile, code6D, latitude, longitude).' });
    }
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        console.warn(`[RegisterRoute]: Invalid coordinate types. UID: ${firebaseUid}. Provided:`, { latitude, longitude });
         return res.status(400).json({ message: 'Latitude and Longitude must be numbers.' });
    }
    
    const phoneToRegister = verifiedPhoneNumberFromToken || mobile; // Prefer number from verified token

    try {
        console.log(`[RegisterRoute]: Checking for existing mobile: ${phoneToRegister} and code: ${code6D}. UID: ${firebaseUid}`);
        const existingMobile = await prisma.address.findUnique({ where: { mobile: phoneToRegister } });
        if (existingMobile) {
            console.log(`[RegisterRoute]: Mobile number ${phoneToRegister} already registered for UID: ${firebaseUid}.`);
            return res.status(409).json({ message: 'This mobile number is already registered.' });
        }

        const existingCode = await prisma.address.findUnique({ where: { code6D } });
        if (existingCode) {
            console.log(`[RegisterRoute]: 6D Code ${code6D} already exists for UID: ${firebaseUid}.`);
            return res.status(409).json({ message: 'This 6D Code already exists. Please select a slightly different location.' });
        }

        console.log(`[RegisterRoute]: Attempting to create address record in DB. UID: ${firebaseUid}`);
        const newAddress = await prisma.address.create({
            data: {
                name,
                mobile: phoneToRegister, 
                code6D,
                latitude,
                longitude,
                sublocality: context?.sublocality || null,
                locality: context?.locality || null,
                firebaseUid: firebaseUid, 
            },
        });

        console.log(`[RegisterRoute]: Registration successful for UID ${firebaseUid}. New Address ID: ${newAddress.id}`);
        res.status(201).json({ message: 'Registration successful!', addressId: newAddress.id, code6D: newAddress.code6D });

    } catch (error: any) {
        console.error(`[RegisterRoute]: Error during registration database operations for UID: ${firebaseUid}. Error:`, error);
        if (error.code === 'P2002' && error.meta?.target?.includes('mobile')) { 
             return res.status(409).json({ message: 'This mobile number is already registered (database conflict).' });
        }
        if (error.code === 'P2002' && error.meta?.target?.includes('code6D')) { 
            return res.status(409).json({ message: 'This 6D Code already exists (database conflict).' });
        }
        res.status(500).json({ message: 'Registration failed due to a server error during database operation.' });
    }
});
console.log('[SERVER_STARTUP]: /api/register POST route defined.');


// --- Start Server ---
console.log('[SERVER_STARTUP]: Preparing to call app.listen().');
try {
    app.listen(PORT, '0.0.0.0', () => { // Listen on all available network interfaces
      console.log(`⚡️[SERVER_LISTENING]: Backend server is running and listening on port ${PORT}. Ready for requests!`);
    });
    console.log(`[SERVER_STARTUP]: app.listen() called successfully. Server should be starting on port ${PORT}...`);
} catch (listenError) {
    console.error(`[SERVER_STARTUP]: FATAL ERROR - Failed to execute app.listen() on port ${PORT}:`, listenError);
    process.exit(1); // Exit if server cannot start listening
}

console.log('[SERVER_STARTUP]: End of server.ts synchronous execution (after app.listen call has been initiated).');


// Graceful shutdown handlers
process.on('SIGTERM', () => {
    console.info('[SERVER_SHUTDOWN]: SIGTERM signal received: closing HTTP server.');
    // Add cleanup tasks here if needed, e.g., prisma.$disconnect()
    process.exit(0);
});

process.on('SIGINT', () => {
    console.info('[SERVER_SHUTDOWN]: SIGINT signal received (e.g., Ctrl+C): closing HTTP server.');
    // Add cleanup tasks here if needed
    process.exit(0);
});

console.log('[SERVER_STARTUP]: Event listeners for SIGTERM and SIGINT registered.');
// ========================================================================
// END OF FILE: backend/src/server.ts
// ========================================================================