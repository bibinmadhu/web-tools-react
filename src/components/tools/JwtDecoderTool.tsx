import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, Clock } from 'lucide-react';
import { decodeJwt } from '../../utils/toolFunctions';

export const JwtDecoderTool: React.FC = () => {
  const sampleJwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkRldkh1YiBEZXZlbG9wZXIiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MjUyNDYwODAwMH0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`;

  const [token, setToken] = useState(sampleJwt);
  const { header, payload, signature, error } = decodeJwt(token);

  let isExpired = false;
  let expDate: string | null = null;
  if (payload?.exp) {
    const expMs = payload.exp * 1000;
    isExpired = Date.now() > expMs;
    expDate = new Date(expMs).toLocaleString();
  }

  return (
    <div className="space-y-4">
      {/* Token Input */}
      <div>
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase font-mono mb-1.5">
          JWT ENCODED TOKEN
        </label>
        <textarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste JWT string here (e.g. eyJhbGci...)"
          className="w-full h-28 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-amber-400 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none break-all"
        />
      </div>

      {error ? (
        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Header & Signature */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-red-500 uppercase font-mono mb-1.5">
                HEADER: ALGORITHM & TOKEN TYPE
              </label>
              <pre className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-red-400 font-mono text-xs overflow-x-auto">
                {JSON.stringify(header, null, 2)}
              </pre>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase font-mono mb-1.5">
                SIGNATURE
              </label>
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-cyan-400 font-mono text-xs break-all">
                {signature || 'No signature'}
              </div>
            </div>
          </div>

          {/* Payload & Expiry */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-purple-500 uppercase font-mono">
                PAYLOAD: DATA & CLAIMS
              </label>
              {expDate && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded font-mono font-semibold flex items-center gap-1 ${
                    isExpired
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  {isExpired ? 'EXPIRED' : 'VALID'} ({expDate})
                </span>
              )}
            </div>

            <pre className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-purple-300 font-mono text-xs overflow-x-auto h-[220px]">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
