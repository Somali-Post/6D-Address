// backend/src/middleware/firebaseAuthMiddleware.ts
import { Request, Response, NextFunction } from 'express'; // Import Express types
import admin from 'firebase-admin'; // Import Firebase Admin SDK

// --- Define the AuthenticatedRequest Interface ---
// Extend the standard Express Request to include an optional 'user' property
// which will hold the decoded Firebase token data.
export interface AuthenticatedRequest extends Request {
    user?: admin.auth.DecodedIdToken; // 'user' might be undefined if authentication fails
}
// --- End Interface Definition ---

// --- Middleware Function ---
export const verifyFirebaseToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {

    // Extract token from the request body (as sent by the frontend)
    const token = req.body.firebaseToken;

    // Check if token exists
    if (!token) {
        console.warn('[AuthMiddleware]: No token provided in request body (firebaseToken).');
        // Send 401 Unauthorized if no token is found
        res.status(401).json({ message: 'Unauthorized: No token provided.' });
        return; // Stop processing the request
    }

    // Verify the token using Firebase Admin SDK
    try {
        // verifyIdToken checks signature, expiry, and project ID
        const decodedToken = await admin.auth().verifyIdToken(token);

        // Log success and attach the decoded token (user info) to the request object
        console.log('[AuthMiddleware]: Token verified successfully for UID:', decodedToken.uid);
        req.user = decodedToken; // Make user info available to subsequent route handlers

        next(); // Pass control to the next middleware or the actual route handler

    } catch (error: any) {
        // Handle errors during token verification (invalid token, expired token, etc.)
        console.error('[AuthMiddleware]: Error verifying Firebase token:', error.message);
        // Send 403 Forbidden for invalid/expired tokens
        res.status(403).json({ message: 'Forbidden: Invalid or expired token.' });
        // Do not call next() on error
    }
};
// --- End Middleware Function ---