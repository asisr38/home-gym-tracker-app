import {
  readJsonRequestBody,
  requireUserFromAuthorizationHeader,
  saveWorkoutSessionResult,
  toWebResponse,
} from "@server/api-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getUserIdOrResponse(request: Request) {
  const authResult = await requireUserFromAuthorizationHeader(
    request.headers.get("authorization"),
  );

  if (!authResult.ok) {
    return toWebResponse(authResult.result);
  }

  return authResult.userId;
}

export async function POST(request: Request) {
  const userIdOrResponse = await getUserIdOrResponse(request);
  if (userIdOrResponse instanceof Response) {
    return userIdOrResponse;
  }

  const bodyResult = await readJsonRequestBody(request);
  if (!bodyResult.ok) {
    return toWebResponse(bodyResult.result);
  }

  return toWebResponse(await saveWorkoutSessionResult(bodyResult.data, userIdOrResponse));
}
