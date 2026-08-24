export function json(res, status, payload) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS,POST",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

export function sendText(res, status, contentType, body) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": contentType,
  });
  res.end(body);
}

export async function readRequestJson(req, limit = 1_500_000) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > limit) {
      const error = new Error("Requête trop volumineuse.");
      error.status = 413;
      throw error;
    }
  }
  if (!body.trim()) return {};
  try {
    return JSON.parse(body);
  } catch {
    const error = new Error("JSON invalide.");
    error.status = 400;
    throw error;
  }
}
