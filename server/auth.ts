import type { NextFunction, Request, Response } from "express";
import { supabaseDisabledMessage, getSupabaseAdmin } from "./supabase";

export interface AuthedRequest extends Request {
  userId: string;
}

export async function requireUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(503).json({ message: supabaseDisabledMessage });
  }

  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    return res.status(401).json({ message: "Missing auth token." });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(match[1]);
    if (error || !user) {
      return res.status(401).json({ message: "Invalid auth token." });
    }
    (req as AuthedRequest).userId = user.id;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid auth token." });
  }
}
