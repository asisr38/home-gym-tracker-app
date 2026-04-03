import {
  getBodyMetricsResult,
  readJsonRequestBody,
  requireUserFromAuthorizationHeader,
  saveBodyMetricResult,
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

  const { searchParams } = new URL(request.url);
  return toWebResponse(
    await getBodyMetricsResult(userIdOrResponse, {
      days: searchParams.get("days"),
    }),
  );
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

  return toWebResponse(await saveBodyMetricResult(bodyResult.data, userIdOrResponse));
}
