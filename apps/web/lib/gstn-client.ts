const GSP_BASE_URL = process.env.GSP_BASE_URL ?? "";

interface GstnAuthResult {
  authToken: string;
  tokenExpiry: Date;
  sek: string;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  baseDelayMs = 1000
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, options);
    if (response.ok || attempt === retries) return response;

    if (response.status === 429 || response.status >= 500) {
      const delay = baseDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * baseDelayMs;
      await new Promise((r) => setTimeout(r, delay + jitter));
      continue;
    }

    return response;
  }
  throw new Error("Max retries exceeded");
}

export async function requestOtp(
  gstin: string,
  username: string
): Promise<{ status: boolean; message: string }> {
  if (!GSP_BASE_URL) throw new Error("GSP_BASE_URL not configured");

  const response = await fetchWithRetry(`${GSP_BASE_URL}/taxpayer/otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "gsp-username": process.env.GSP_USERNAME ?? "",
      "gsp-password": process.env.GSP_PASSWORD ?? "",
    },
    body: JSON.stringify({ gstin, username }),
  });

  const data = await response.json();
  return {
    status: response.ok,
    message: data.message ?? (response.ok ? "OTP sent" : "OTP request failed"),
  };
}

export async function verifyOtp(
  gstin: string,
  otp: string
): Promise<GstnAuthResult> {
  if (!GSP_BASE_URL) throw new Error("GSP_BASE_URL not configured");

  const response = await fetchWithRetry(`${GSP_BASE_URL}/taxpayer/otp/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "gsp-username": process.env.GSP_USERNAME ?? "",
      "gsp-password": process.env.GSP_PASSWORD ?? "",
    },
    body: JSON.stringify({ gstin, otp }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OTP verification failed: ${err}`);
  }

  const data = await response.json();
  return {
    authToken: data.auth_token,
    tokenExpiry: new Date(Date.now() + 6 * 60 * 60 * 1000),
    sek: data.sek ?? "",
  };
}

export async function saveGstr1(
  gstin: string,
  authToken: string,
  period: string,
  payload: Record<string, unknown>
): Promise<{ referenceId: string }> {
  const response = await fetchWithRetry(`${GSP_BASE_URL}/returns/gstr1`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
      gstin,
      ret_period: period,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unknown" }));
    throw new GstnApiError("SAVE_FAILED", JSON.stringify(err));
  }

  const data = await response.json();
  return { referenceId: data.reference_id ?? data.ref_id };
}

export async function submitGstr1(
  gstin: string,
  authToken: string,
  period: string,
  referenceId: string
): Promise<{ arn: string }> {
  const response = await fetchWithRetry(
    `${GSP_BASE_URL}/returns/gstr1/file`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
        gstin,
        ret_period: period,
      },
      body: JSON.stringify({
        gstin,
        ret_period: period,
        ref_id: referenceId,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unknown" }));
    throw new GstnApiError("FILE_FAILED", JSON.stringify(err));
  }

  const data = await response.json();
  return { arn: data.arn ?? data.reference_id };
}

export async function fetchGstr2a(
  gstin: string,
  authToken: string,
  period: string
): Promise<Record<string, unknown>> {
  const response = await fetchWithRetry(
    `${GSP_BASE_URL}/returns/gstr2a?gstin=${gstin}&ret_period=${period}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
        gstin,
        ret_period: period,
      },
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new GstnApiError("FETCH_FAILED", err);
  }

  return response.json();
}

export async function getFilingStatus(
  gstin: string,
  authToken: string,
  returnType: string,
  period: string
): Promise<{ status: string; arn?: string; filedDate?: string }> {
  const response = await fetchWithRetry(
    `${GSP_BASE_URL}/returns/status?gstin=${gstin}&ret_type=${returnType}&ret_period=${period}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    }
  );

  if (!response.ok) {
    return { status: "UNKNOWN" };
  }

  const data = await response.json();
  return {
    status: data.status ?? "UNKNOWN",
    arn: data.arn,
    filedDate: data.filed_date,
  };
}

export class GstnApiError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "GstnApiError";
    this.code = code;
  }
}
