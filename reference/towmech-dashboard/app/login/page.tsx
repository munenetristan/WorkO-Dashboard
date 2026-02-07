"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  loginWithPhonePassword,
  verifyOtp,
  forgotPassword,
  resetPassword,
} from "@/lib/api/auth";

type PublicCountry = {
  code?: string;
  phoneRules?: any;
  dialCode?: string; // fallback
};

function normalizeIso2(v: any) {
  const code = String(v || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

function normalizePhoneLoose(phone: string) {
  const raw = String(phone || "").trim();
  if (!raw) return "";
  // preserve leading +, strip spaces and punctuation
  let p = raw.replace(/\s+/g, "").replace(/[-()]/g, "");
  // 00 -> +
  if (p.startsWith("00")) p = "+" + p.slice(2);
  return p;
}

function extractDialPrefix(phone: string) {
  const p = normalizePhoneLoose(phone);
  if (!p) return "";

  // If phone is like +2771..., dial prefix candidates are +27, +277, etc.
  if (p.startsWith("+")) {
    // return up to first 5 digits after + (dial codes vary)
    const digits = p.slice(1).replace(/[^\d]/g, "");
    if (!digits) return "";
    return "+" + digits.slice(0, Math.min(5, digits.length));
  }

  // If phone is like 2771... (no +)
  if (/^\d{6,}$/.test(p)) {
    return p.slice(0, Math.min(5, p.length));
  }

  // If local 0xxxxxxxxx cannot infer reliably without workspace
  return "";
}

function getStoredCountryCode(): string {
  if (typeof window === "undefined") return "ZA";
  const v = (localStorage.getItem("countryCode") || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(v) ? v : "ZA";
}

function setWorkspaceCountry(code: string) {
  if (typeof window === "undefined") return;
  const iso2 = normalizeIso2(code);
  if (!iso2) return;

  localStorage.setItem("countryCode", iso2);
  window.dispatchEvent(
    new CustomEvent("towmech:country-changed", { detail: { countryCode: iso2 } })
  );
}

async function fetchPublicCountries(API_BASE: string): Promise<PublicCountry[]> {
  const base = API_BASE.replace(/\/$/, "");
  // ✅ Align with backend public route: GET /api/countries
  const url = `${base}/api/countries`;

  // cache per session so we don't spam
  if (typeof window !== "undefined") {
    const cached = sessionStorage.getItem("towmech_public_countries_cache_v1");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
  }

  const res = await fetch(url, { method: "GET" });
  const data = await res.json().catch(() => ({}));
  const list = Array.isArray(data?.countries) ? data.countries : [];

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(
        "towmech_public_countries_cache_v1",
        JSON.stringify(list)
      );
    } catch {}
  }
  return list;
}

function readDialCodesFromCountry(c: PublicCountry): string[] {
  const rules = c?.phoneRules || {};
  const out = new Set<string>();

  // Support common shapes:
  // phoneRules: { dialCode:"+27" } OR { dialCode:"+27", callingCode:"27" } OR { countryCallingCode:"27" }
  const dialA = rules?.dialCode || rules?.dialingCode || c?.dialCode;
  const dialB = rules?.callingCode || rules?.countryCallingCode;

  if (typeof dialA === "string" && dialA.trim()) out.add(dialA.trim());
  if (typeof dialB === "string" && dialB.trim())
    out.add("+" + dialB.trim().replace(/^\+/, ""));

  // Sometimes stored as array
  const dialArr = rules?.dialCodes || rules?.dialingCodes;
  if (Array.isArray(dialArr)) {
    dialArr.forEach((x) => {
      const s = String(x || "").trim();
      if (s) out.add(s.startsWith("+") ? s : `+${s}`);
    });
  }

  return Array.from(out);
}

async function inferAndSetWorkspaceByDialCode(phone: string, API_BASE: string) {
  const p = normalizePhoneLoose(phone);
  if (!p) return;

  // If already have explicit workspace, keep it unless we can infer confidently
  const current = getStoredCountryCode();

  const dialCandidate = extractDialPrefix(p);
  if (!dialCandidate) return;

  try {
    const countries = await fetchPublicCountries(API_BASE);
    if (!Array.isArray(countries) || countries.length === 0) return;

    // Find the BEST match: longest dialCode prefix match
    let best: { iso2: string; dial: string } | null = null;

    for (const c of countries) {
      const iso2 = normalizeIso2(c?.code);
      if (!iso2) continue;

      const dials = readDialCodesFromCountry(c);
      for (const d of dials) {
        const dial = String(d || "").trim();
        if (!dial) continue;

        // normalize dial and phone for compare
        const dialNorm = dial.startsWith("+") ? dial : `+${dial}`;
        const phoneNorm = p.startsWith("+") ? p : `+${p}`;

        if (phoneNorm.startsWith(dialNorm)) {
          if (!best || dialNorm.length > best.dial.length) {
            best = { iso2, dial: dialNorm };
          }
        }
      }
    }

    if (best && best.iso2 && best.iso2 !== current) {
      setWorkspaceCountry(best.iso2);
    }
  } catch {
    // silent: do not block login
  }
}

export default function LoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<"LOGIN" | "OTP" | "FORGOT" | "RESET">(
    "LOGIN"
  );

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const API_BASE =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:5000";

  const loginUrl = useMemo(() => {
    const base = API_BASE.replace(/\/$/, "");
    return `${base}/api/auth/login`;
  }, [API_BASE]);

  // Optional: when user types +xxx, attempt early inference (non-blocking)
  useEffect(() => {
    if (!phone) return;
    const p = normalizePhoneLoose(phone);
    if (!p.startsWith("+") && !p.startsWith("00")) return;
    inferAndSetWorkspaceByDialCode(phone, API_BASE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  const handleLogin = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // ✅ ensure workspace is aligned with dial-code if provided
      await inferAndSetWorkspaceByDialCode(phone, API_BASE);

      const data = await loginWithPhonePassword({ phone, password });

      // ✅ CASE 1: Admin / SuperAdmin returns token immediately
      if (data?.token) {
        localStorage.setItem("adminToken", data.token);
        localStorage.setItem("token", data.token); // compatibility
        router.push("/dashboard");
        return;
      }

      // ✅ CASE 2: OTP flow for customers/providers
      const requiresOtp =
        data?.requiresOtp === true ||
        String(data?.message || "").toLowerCase().includes("otp");

      if (requiresOtp) {
        setStep("OTP");
        return;
      }

      setError(data?.message || "Unexpected response from server.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // ✅ ensure workspace is aligned with dial-code if provided
      await inferAndSetWorkspaceByDialCode(phone, API_BASE);

      const data = await verifyOtp({ phone, otp });

      const token = data?.token;
      if (!token) {
        setError("OTP verified but token missing from response.");
        return;
      }

      localStorage.setItem("adminToken", token);
      localStorage.setItem("token", token); // compatibility

      // ✅ If backend returned user.countryCode, it’s the final source of truth
      const userCountry = normalizeIso2(data?.user?.countryCode);
      if (userCountry) setWorkspaceCountry(userCountry);

      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Forgot Password → request OTP for reset
  const handleForgotPassword = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await inferAndSetWorkspaceByDialCode(phone, API_BASE);

      const res = await forgotPassword({ phone });

      // Always show success message (backend returns success even if user not found)
      setSuccess(
        res?.message || "If your phone exists, an SMS code has been sent ✅"
      );
      setStep("RESET");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to send reset code ❌"
      );
    } finally {
      setLoading(false);
    }
  };

  // ✅ Reset Password → OTP + new password
  const handleResetPassword = async () => {
    setError("");
    setSuccess("");

    if (!newPassword || newPassword.length < 4) {
      setError("New password is too short.");
      return;
    }

    setLoading(true);

    try {
      await inferAndSetWorkspaceByDialCode(phone, API_BASE);

      const res = await resetPassword({ phone, otp, newPassword });

      setSuccess(res?.message || "Password reset successful ✅");
      // Go back to login
      setPassword("");
      setNewPassword("");
      setOtp("");
      setStep("LOGIN");
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Reset failed ❌");
    } finally {
      setLoading(false);
    }
  };

  const resetAllMessages = () => {
    setError("");
    setSuccess("");
  };

  return (
    <div style={{ maxWidth: 420, margin: "50px auto" }}>
      <h2>TowMech Admin Login</h2>

      <p style={{ fontSize: 12, opacity: 0.7 }}>
        API Base: {API_BASE}
        <br />
        Login URL: {loginUrl}
        <br />
        Workspace Country: <strong>{getStoredCountryCode()}</strong>
      </p>

      {/* ✅ Common Phone Field (used across flows) */}
      {(step === "LOGIN" ||
        step === "OTP" ||
        step === "FORGOT" ||
        step === "RESET") && (
        <>
          <label>Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 10 }}
            placeholder="+27... or 071..."
            autoComplete="username"
          />
        </>
      )}

      {step === "LOGIN" && (
        <>
          <label>Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            style={{ width: "100%", padding: 10, marginBottom: 10 }}
            autoComplete="current-password"
          />

          {error && <p style={{ color: "red" }}>{error}</p>}
          {success && <p style={{ color: "green" }}>{success}</p>}

          <button onClick={handleLogin} disabled={loading} style={{ padding: 10 }}>
            {loading ? "..." : "Sign in"}
          </button>

          <button
            onClick={() => {
              resetAllMessages();
              setStep("FORGOT");
            }}
            disabled={loading}
            style={{ padding: 10, marginLeft: 10 }}
          >
            Forgot password?
          </button>
        </>
      )}

      {step === "OTP" && (
        <>
          <p>
            OTP sent to: <strong>{phone}</strong>
          </p>

          <label>OTP</label>
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 10 }}
            placeholder="Enter OTP"
            inputMode="numeric"
          />

          {error && <p style={{ color: "red" }}>{error}</p>}
          {success && <p style={{ color: "green" }}>{success}</p>}

          <button
            onClick={handleVerifyOtp}
            disabled={loading}
            style={{ padding: 10 }}
          >
            {loading ? "..." : "Verify OTP"}
          </button>

          <button
            onClick={() => {
              setOtp("");
              setStep("LOGIN");
              resetAllMessages();
            }}
            disabled={loading}
            style={{ padding: 10, marginLeft: 10 }}
          >
            Back
          </button>
        </>
      )}

      {step === "FORGOT" && (
        <>
          <p style={{ fontSize: 13, opacity: 0.8 }}>
            Enter your phone number and we will send a reset OTP.
          </p>

          {error && <p style={{ color: "red" }}>{error}</p>}
          {success && <p style={{ color: "green" }}>{success}</p>}

          <button
            onClick={handleForgotPassword}
            disabled={loading}
            style={{ padding: 10 }}
          >
            {loading ? "..." : "Send reset OTP"}
          </button>

          <button
            onClick={() => {
              setStep("LOGIN");
              resetAllMessages();
            }}
            disabled={loading}
            style={{ padding: 10, marginLeft: 10 }}
          >
            Back
          </button>
        </>
      )}

      {step === "RESET" && (
        <>
          <p style={{ fontSize: 13, opacity: 0.8 }}>
            Enter the OTP sent to <strong>{phone}</strong> and choose a new
            password.
          </p>

          <label>OTP</label>
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 10 }}
            placeholder="Enter OTP"
            inputMode="numeric"
          />

          <label>New Password</label>
          <input
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            type="password"
            style={{ width: "100%", padding: 10, marginBottom: 10 }}
            placeholder="Enter new password"
            autoComplete="new-password"
          />

          {error && <p style={{ color: "red" }}>{error}</p>}
          {success && <p style={{ color: "green" }}>{success}</p>}

          <button
            onClick={handleResetPassword}
            disabled={loading}
            style={{ padding: 10 }}
          >
            {loading ? "..." : "Reset password"}
          </button>

          <button
            onClick={() => {
              setStep("LOGIN");
              resetAllMessages();
            }}
            disabled={loading}
            style={{ padding: 10, marginLeft: 10 }}
          >
            Back to login
          </button>
        </>
      )}
    </div>
  );
}