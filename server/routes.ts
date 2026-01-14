import type { Express } from "express";
import { type Server } from "http";
import { requireUser, type AuthedRequest } from "./auth";
import { firestore } from "./firebase";
import { userDataSchema } from "@shared/userData";

const MAX_HISTORY_DAYS = 30;
const MS_IN_DAY = 24 * 60 * 60 * 1000;

const pruneHistory = (history: Array<{ dateCompleted?: string }>) => {
  const cutoff = Date.now() - MAX_HISTORY_DAYS * MS_IN_DAY;
  return history.filter((day) => {
    if (!day.dateCompleted) return true;
    const timestamp = Date.parse(day.dateCompleted);
    if (Number.isNaN(timestamp)) return true;
    return timestamp >= cutoff;
  });
};

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
    const prunedData = {
      ...parseResult.data,
      history: pruneHistory(parseResult.data.history),
    };
    await docRef.set(
      {
        ...prunedData,
        updatedAt: Date.now(),
      },
      { merge: true },
    );

    return res.json({ ok: true });
  });

  return httpServer;
}
