const DEFAULT_MAX_JSON_BYTES = 64 * 1024;

function createJsonErrorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function parseJsonRequestBody(
  request: Request,
  maxBytes = DEFAULT_MAX_JSON_BYTES,
): Promise<any> {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw createJsonErrorResponse('Content-Type must be application/json');
  }

  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const parsedLength = Number.parseInt(contentLength, 10);
    if (!Number.isNaN(parsedLength) && parsedLength > maxBytes) {
      throw createJsonErrorResponse(
        `Request body too large. Maximum size is ${Math.round(maxBytes / 1024)} KB.`,
        413,
      );
    }
  }

  const clonedRequest = request.clone();
  const textBody = await clonedRequest.text();

  if (textBody.length > maxBytes) {
    throw createJsonErrorResponse(
      `Request body too large. Maximum size is ${Math.round(maxBytes / 1024)} KB.`,
      413,
    );
  }

  try {
    return JSON.parse(textBody);
  } catch {
    throw createJsonErrorResponse('Invalid JSON in request body');
  }
}

export const parseRequestBody = parseJsonRequestBody;
