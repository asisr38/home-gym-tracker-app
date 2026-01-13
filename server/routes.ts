import type { Express } from "express";
import { type Server } from "http";
import { requireUser, type AuthedRequest } from "./auth";
import { firestore } from "./firebase";
import { userDataSchema } from "@shared/userData";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  app.get("/api/user-data", requireUser, async (req, res) => {
    const { user } = req as AuthedRequest;
    const docRef = firestore.collection("userData").doc(user.uid);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(204).send();
    }

    return res.json(doc.data());
  });

  app.post("/api/user-data", requireUser, async (req, res) => {
    const { user } = req as AuthedRequest;
    const parseResult = userDataSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid data payload." });
    }

    const docRef = firestore.collection("userData").doc(user.uid);
    await docRef.set(
      {
        ...parseResult.data,
        updatedAt: Date.now(),
      },
      { merge: true },
    );

    return res.json({ ok: true });
  });

  return httpServer;
}
