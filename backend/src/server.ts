import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './db'; // Import the Prisma client instance

// Load environment variables from .env file
dotenv.config();

const app: Express = express();
// Use port from .env (defined in backend/.env) or default to 3001
const port = process.env.BACKEND_PORT || 3001;

// --- Middlewares ---
app.use(cors({
    origin: '*' // Allow all origins for development
}));
app.use(express.json()); // Enable parsing JSON request bodies

// --- Basic Route ---
app.get('/', (req: Request, res: Response) => {
  res.send('Somali 6D Address Backend is running!');
});

// --- API Routes ---

// Endpoint to handle registration submission
app.post('/register', async (req: Request, res: Response) => {
    // Destructure with careful handling for potentially missing context
    const { name, mobile, code6D, latitude, longitude, context } = req.body;

    // --- Basic Backend Validation ---
    if (!name || !mobile || !code6D || latitude == null || longitude == null) {
        console.warn('Registration attempt missing required data:', { name, mobile, code6D, latitude, longitude });
        return res.status(400).json({ message: 'Missing required registration data (name, mobile, code6D, latitude, longitude).' });
    }

    // Validate coordinate types (simple check)
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
         console.warn('Registration attempt with invalid coordinate types:', { latitude, longitude });
         return res.status(400).json({ message: 'Latitude and Longitude must be numbers.' });
    }

    // --- Add more validation as needed ---

    try {
        // Check if mobile number already exists
        const existingMobile = await prisma.address.findUnique({ where: { mobile } });
        if (existingMobile) {
            console.log(`Conflict: Mobile ${mobile} exists.`);
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
                mobile,
                code6D,
                latitude,  // Prisma expects Float, ensure type matches
                longitude, // Prisma expects Float, ensure type matches
                // Safely access context properties, defaulting to null if context or properties are missing
                sublocality: context?.sublocality || null,
                locality: context?.locality || null,
            },
        });

        console.log('Registration successful:', newAddress.id);
        res.status(201).json({ message: 'Registration successful!', address: newAddress });

    } catch (error: any) { // Catch block with type annotation
        console.error('Registration Error:', error);
        // Provide a more generic error message for security
        res.status(500).json({ message: 'Registration failed due to a server error.' });
    }
});

// Endpoint to SIMULATE sending an OTP
app.post('/send-otp', (req: Request, res: Response) => {
    const { mobile } = req.body;
    if (!mobile) {
        console.warn('Send OTP: Missing mobile number.');
        return res.status(400).json({ message: 'Mobile number is required.' });
    }

    // --- TODO: Add real SMS sending logic here ---
    console.log(`SIMULATING OTP send to ${mobile}. Use code 1234.`);
    // ---

    // Respond success (even for simulation)
    res.status(200).json({ message: 'Simulated OTP sent successfully.' }); // Line 99 area
});

// Endpoint to SIMULATE verifying an OTP
app.post('/verify-otp', (req: Request, res: Response) => {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) {
        console.warn('Verify OTP: Missing mobile or OTP.');
        return res.status(400).json({ message: 'Mobile number and OTP are required.' });
    }

    console.log(`SIMULATING OTP verification for ${mobile} with code ${otp}`);

    // --- TODO: Add real OTP verification logic here ---

    // --- Simulation Logic ---
    if (otp === '1234') {
        console.log('Simulated OTP verified.');
        res.status(200).json({ message: 'OTP verified successfully.' });
    } else {
        console.log('Simulated incorrect OTP.');
        res.status(400).json({ message: 'Incorrect verification code.' }); // Line 117 area
    }
});


// --- Start Server ---
app.listen(port, () => {
  console.log(`⚡️[server]: Backend server is running at http://localhost:${port}`);
});