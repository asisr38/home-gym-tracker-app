import {
  getUserDataResult,
  readJsonRequestBody,
  requireUserFromAuthorizationHeader,
  saveUserDataResult,
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

export async function GET(request: Request) {
  const userIdOrResponse = await getUserIdOrResponse(request);
  if (userIdOrResponse instanceof Response) {
    return userIdOrResponse;
  }

  return toWebResponse(await getUserDataResult(userIdOrResponse));
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

  return toWebResponse(await saveUserDataResult(bodyResult.data, userIdOrResponse));
}
