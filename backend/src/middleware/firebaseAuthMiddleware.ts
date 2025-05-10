// backend/src/middleware/firebaseAuthMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin'; 
// It's good practice to import specific types you use
import { DecodedIdToken } from 'firebase-admin/auth';

// Define an interface that extends the default Express Request type
// to include an optional 'user' property. This 'user' property will
// hold the decoded Firebase token if authentication is successful.
export interface AuthenticatedRequest extends Request {
    user?: DecodedIdToken; // 'user' might be undefined if authentication fails or token is missing
}

// Middleware function to verify Firebase ID tokens
export const verifyFirebaseToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Get the Authorization header from the incoming request
    const authorizationHeader = req.headers.authorization;

    // Check if the Authorization header exists and starts with "Bearer "
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
        console.warn('[AuthMiddleware]: No Firebase ID token was passed as a Bearer token in the Authorization header.');
        // If no token or incorrect format, send 401 Unauthorized
        res.status(401).json({ message: 'Unauthorized: No token provided or incorrect format.' });
        return; // Stop further processing
    }

    // Extract the token string by removing "Bearer " prefix
    const idToken = authorizationHeader.split('Bearer ')[1];

    // Double-check if the token string is actually present after splitting
    if (!idToken) { 
        console.warn('[AuthMiddleware]: Token string is empty after splitting Bearer from Authorization header.');
        res.status(401).json({ message: 'Unauthorized: Token malformed or empty.' });
        return;
    }

    try {
        // Verify the ID token using the Firebase Admin SDK.
        // This checks the token's signature, expiration, and if it belongs to your Firebase project.
        const decodedToken: DecodedIdToken = await admin.auth().verifyIdToken(idToken);

        // If verification is successful, log it and attach the decoded token to the request object.
        // This makes the user's information (like UID, email, phone_number if present in token)
        // available to subsequent route handlers.
        console.log(`[AuthMiddleware]: Token verified successfully for UID: ${decodedToken.uid}`);
        req.user = decodedToken; 

        // Pass control to the next middleware in the stack or to the route handler
        next(); 

    } catch (error: any) {
        // If token verification fails (e.g., token is invalid, expired, or signature doesn't match)
        console.error('[AuthMiddleware]: Error verifying Firebase ID token:', error.code, '-', error.message);
        
        let friendlyMessage = 'Forbidden: Invalid or expired token.';
        // Provide more specific user-facing messages for common errors
        if (error.code === 'auth/id-token-expired') {
            friendlyMessage = 'Forbidden: Your session has expired. Please sign in again.';
        } else if (error.code === 'auth/argument-error' || error.code === 'auth/invalid-id-token') {
            friendlyMessage = 'Forbidden: Authentication token is malformed or invalid.';
        }
        
        // Send 403 Forbidden status
        res.status(403).json({ message: friendlyMessage, errorCode: error.code });
        // Do not call next() as the request is unauthorized
    }
};