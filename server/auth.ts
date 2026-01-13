import type { NextFunction, Request, Response } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { firebaseAuth } from "./firebase";

export interface AuthedRequest extends Request {
  user: DecodedIdToken;
}

export async function requireUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    return res.status(401).json({ message: "Missing auth token." });
  }

  try {
    const decoded = await firebaseAuth.verifyIdToken(match[1]);
    (req as AuthedRequest).user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid auth token." });
  }
}
