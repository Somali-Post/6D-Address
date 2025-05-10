// backend/src/middleware/firebaseAuthMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin'; // Assuming admin is initialized in server.ts and accessible
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthenticatedRequest extends Request {
  user?: DecodedIdToken;
}

export const verifyFirebaseToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    console.warn('[AuthMiddleware] No Firebase ID token was passed.');
    return res.status(401).json({ message: 'Unauthorized: No token provided.' });
  }

  const idToken = authorizationHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    console.log([AuthMiddleware] Token verified for UID: ${decodedToken.uid});
    next();
  } catch (error) {
    console.error('[AuthMiddleware] Error verifying Firebase ID token:', error);
    return res.status(403).json({ message: 'Forbidden: Invalid or expired token.' });
  }
};

// You might have other things in this file, but these are the key exports needed by server.ts