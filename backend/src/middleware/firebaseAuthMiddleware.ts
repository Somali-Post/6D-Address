// backend/src/middleware/firebaseAuthMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

// Extend the Express Request interface to include the user property
export interface AuthenticatedRequest extends Request {
    user?: admin.auth.DecodedIdToken; // Add user property - it might be undefined if token fails
}

export const verifyFirebaseToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const token = req.headers.authorization?.split('Bearer ')[1]; // Get token from Authorization header

    // Or get token from request body if you send it there
    // const token = req.body.firebaseToken;

    if (!token) {
        console.warn('[AuthMiddleware]: No token provided.');
        res.status(401).json({ message: 'Unauthorized: No token provided.' });
        return;
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        console.log('[AuthMiddleware]: Token verified successfully for UID:', decodedToken.uid);
        req.user = decodedToken; // Attach decoded token (includes uid, phone_number, etc.) to request object
        next(); // Proceed to the next middleware or route handler
    } catch (error: any) {
        console.error('[AuthMiddleware]: Error verifying Firebase token:', error.message);
        // Handle specific errors if needed (e.g., 'auth/id-token-expired')
        res.status(403).json({ message: 'Forbidden: Invalid or expired token.' });
    }
};