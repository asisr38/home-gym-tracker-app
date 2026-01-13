import type { VercelRequest, VercelResponse } from "@vercel/node";
import { firestore, firebaseAuth } from "../server/firebase";
import { userDataSchema } from "../shared/userData";

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
    const payload =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const parseResult = userDataSchema.safeParse(payload);
    if (!parseResult.success) {
      res.status(400).json({ message: "Invalid data payload." });
      return;
    }

    const docRef = firestore.collection("userData").doc(uid);
    await docRef.set(
      {
        ...parseResult.data,
        updatedAt: Date.now(),
      },
      { merge: true },
    );

    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ message: "Method not allowed." });
}
