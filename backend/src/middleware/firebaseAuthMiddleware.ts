// backend/src/middleware/firebaseAuthMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { DecodedIdToken } from 'firebase-admin/auth'; // Good practice to import specific types

export interface AuthenticatedRequest extends Request {
    user?: DecodedIdToken; 
}

export const verifyFirebaseToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const authorizationHeader = req.headers.authorization; // Get the Authorization header

    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
        console.warn('[AuthMiddleware]: No Firebase ID token was passed as a Bearer token in the Authorization header.');
        res.status(401).json({ message: 'Unauthorized: No token provided or incorrect format.' });
        return; 
    }

    const idToken = authorizationHeader.split('Bearer ')[1]; // Extract the token part

    if (!idToken) { // Extra check in case split somehow fails or token is empty
        console.warn('[AuthMiddleware]: Token string is empty after splitting Bearer.');
        res.status(401).json({ message: 'Unauthorized: Token malformed.' });
        return;
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken); // Use the extracted idToken

        console.log([AuthMiddleware]: Token verified successfully for UID: ${decodedToken.uid});
        req.user = decodedToken; 

        next(); 

    } catch (error: any) {
        console.error('[AuthMiddleware]: Error verifying Firebase ID token:', error.code, error.message);
        let friendlyMessage = 'Forbidden: Invalid or expired token.';
        if (error.code === 'auth/id-token-expired') {
            friendlyMessage = 'Forbidden: Token has expired. Please re-authenticate.';
        } else if (error.code === 'auth/argument-error') {
            friendlyMessage = 'Forbidden: Token is malformed or invalid.';
        }
        // Add more specific error checks if needed based on Firebase Admin SDK error codes
        res.status(403).json({ message: friendlyMessage, code: error.code });
    }
};