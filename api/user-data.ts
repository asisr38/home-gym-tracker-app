import type { VercelRequest, VercelResponse } from "@vercel/node";
import { firestore, firebaseAuth } from "../server/firebase";
import { userDataSchema } from "../shared/userData";

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

async function getUserId(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    res.status(401).json({ message: "Missing auth token." });
    return null;
  }

  try {
    const decoded = await firebaseAuth.verifyIdToken(match[1]);
    return decoded.uid;
  } catch (error) {
    res.status(401).json({ message: "Invalid auth token." });
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const uid = await getUserId(req, res);
  if (!uid) return;

  if (req.method === "GET") {
    const docRef = firestore.collection("userData").doc(uid);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(204).send("");
      return;
    }

    res.status(200).json(doc.data());
    return;
  }

  if (req.method === "POST") {
    let payload: unknown = req.body;
    if (typeof req.body === "string") {
      try {
        payload = JSON.parse(req.body);
      } catch {
        res.status(400).json({ message: "Invalid JSON payload." });
        return;
      }
    }
    const parseResult = userDataSchema.safeParse(payload);
    if (!parseResult.success) {
      res.status(400).json({ message: "Invalid data payload." });
      return;
    }

    const docRef = firestore.collection("userData").doc(uid);
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

    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ message: "Method not allowed." });
}
