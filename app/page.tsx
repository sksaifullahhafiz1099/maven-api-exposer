'use client';

import React, { useState, useEffect, useRef } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SageProduct {
  id: string;
  name?: string;
  itemNum?: string;
  cat1Name?: string;
  suppId?: number | string;
  uploadedAt?: string;
  uploadedBy?: string;
  pics?: Array<{ url: string; index: number; caption?: string }>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ADMIN_URL = process.env.NODE_ENV === 'production'
  ? 'https://admin.mavenpromo.com'
  : 'http://localhost:3000';

const SAGE_API_URL = `https://admin.mavenpromo.com/api/external/sage-products`;

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ExternalPortalPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Sage state ────────────────────────────────────────────────────────────

  const [sageFile, setSageFile] = useState<File | null>(null);
  const [sageFileName, setSageFileName] = useState('');
  const sageFileInputRef = useRef<HTMLInputElement>(null);
  const [sageUploading, setSageUploading] = useState(false);
  const [sageLogs, setSageLogs] = useState<Array<{ msg: string; type: 'info' | 'success' | 'error' | 'warn' }>>([]);
  const [sageProducts, setSageProducts] = useState<SageProduct[]>([]);
  const [sageLoadingList, setSageLoadingList] = useState(false);
  const [sageListError, setSageListError] = useState<string | null>(null);

  // ── Load saved session ────────────────────────────────────────────────────
  useEffect(() => {
    const savedUser = localStorage.getItem('maven_user');
    const savedPass = localStorage.getItem('maven_pass');
    if (savedUser && savedPass) {
      setEmail(savedUser);
      setPassword(savedPass);
    }
  }, []);

  // ── Auth helpers ──────────────────────────────────────────────────────────
  const authHeaders = () => ({
    'X-Admin-Username': email,
    'X-Admin-Password': password,
    'Authorization': `Basic ${btoa(`${email}:${password}`)}`,
  });

  // ── Sage API ──────────────────────────────────────────────────────────────
  const sageLog = (msg: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') => {
    setSageLogs((prev) => [...prev, { msg, type }]);
  };

  const fetchSageProducts = async () => {
    setSageLoadingList(true);
    setSageListError(null);
    try {
      const res = await fetch(SAGE_API_URL, { headers: authHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load Sage products');
      setSageProducts(data.products || []);
    } catch (err: unknown) {
      setSageListError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setSageLoadingList(false);
    }
  };

  const handleSageUpload = async () => {
    if (!sageFile || sageUploading) return;
    setSageUploading(true);
    setSageLogs([]);
    try {
      sageLog(`Reading ${sageFile.name}...`);
      const text = await sageFile.text();

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('Invalid JSON — the file could not be parsed.');
      }

      sageLog('Uploading to Maven Admin API (image re-hosting will happen server-side)...');
      const res = await fetch(SAGE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(parsed),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Upload failed');

      sageLog(`✓ Product "${data.productName}" saved — Firestore ID: ${data.id}`, 'success');
      sageLog(`✓ ${data.imagesRehosted} image(s) re-hosted to Firebase Storage`, 'success');
      if (data.imageLog) {
        (data.imageLog as Array<{ index: number; newUrl: string }>).forEach((img) => {
          sageLog(`  [${img.index}] → ${img.newUrl}`, 'info');
        });
      }

      setSageFile(null);
      setSageFileName('');
      if (sageFileInputRef.current) sageFileInputRef.current.value = '';
      await fetchSageProducts();
    } catch (err: unknown) {
      sageLog(`✗ ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setSageUploading(false);
    }
  };

  // ── Login ─────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(SAGE_API_URL, {
        headers: {
          'X-Admin-Username': email,
          'X-Admin-Password': password,
          'Authorization': `Basic ${btoa(`${email}:${password}`)}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Invalid credentials');

      setIsLoggedIn(true);
      localStorage.setItem('maven_user', email);
      localStorage.setItem('maven_pass', password);
      setSageProducts(data.products || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('maven_pass');
  };

  // ── On login, load list ───────────────────────────────────────────────────
  useEffect(() => {
    if (isLoggedIn) {
      fetchSageProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // ── LOGIN VIEW ────────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50/50 p-4">
        <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-6 text-center">
            <h1 className="text-lg font-semibold text-zinc-950">Admin Login</h1>
            <p className="text-xs text-zinc-500 mt-1">Enter your Maven Admin credentials</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@maven.com"
                className="h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-2.5 text-xs text-red-600 border border-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-9 w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 shadow hover:bg-zinc-900/90 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ── MAIN VIEW ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-50/50 pb-12">
      {/* Top Navbar */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-zinc-950">Maven API Portal</h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-md">
              Sage Products
            </span>

            <button
              onClick={handleSignOut}
              className="h-8 rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-100 transition-colors ml-2"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* ─── SAGE PRODUCTS TAB ─────────────────────────────────────────── */}
      <main className="mx-auto max-w-5xl px-6 py-8 space-y-6">

        {/* Upload Card */}
        <div className="rounded-lg border border-zinc-200 bg-white shadow-sm p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-950">Upload Sage Product JSON</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Select a Sage Connect product JSON file. Images in{' '}
              <code className="bg-zinc-100 px-1 rounded text-[11px]">pics[].url</code> will be
              downloaded server-side and re-hosted to Firebase Storage automatically.
            </p>
          </div>

          {/* Hidden file input */}
          <input
            ref={sageFileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setSageFile(file);
                setSageFileName(file.name);
                setSageLogs([]);
              }
            }}
          />

          {/* Drop zone */}
          <div
            onClick={() => sageFileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) {
                setSageFile(file);
                setSageFileName(file.name);
                setSageLogs([]);
              }
            }}
            className={`w-full border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${sageFile
              ? 'border-emerald-400 bg-emerald-50'
              : 'border-zinc-200 hover:border-emerald-300 hover:bg-zinc-50'
              }`}
          >
            {sageFile ? (
              <>
                <div className="text-2xl mb-1">📄</div>
                <p className="text-xs font-semibold text-emerald-700">{sageFileName}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {(sageFile.size / 1024).toFixed(1)} KB — ready to upload
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSageFile(null);
                    setSageFileName('');
                    setSageLogs([]);
                    if (sageFileInputRef.current) sageFileInputRef.current.value = '';
                  }}
                  className="mt-2 text-[11px] text-zinc-400 hover:text-red-500 transition-colors"
                >
                  ✕ Remove
                </button>
              </>
            ) : (
              <>
                <div className="text-2xl mb-1 opacity-40">📂</div>
                <p className="text-xs font-medium text-zinc-600">Click or drag &amp; drop a .json file</p>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSageUpload}
              disabled={!sageFile || sageUploading}
              className="h-8 rounded-md bg-emerald-600 px-4 text-xs font-medium text-white shadow hover:bg-emerald-700 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
            >
              {sageUploading ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload & Process'
              )}
            </button>
          </div>

          {/* Upload log */}
          {sageLogs.length > 0 && (
            <div className="rounded-md border bg-zinc-950 p-3 max-h-52 overflow-y-auto font-mono text-xs space-y-0.5">
              {sageLogs.map((entry, i) => (
                <div
                  key={i}
                  className={
                    entry.type === 'success'
                      ? 'text-emerald-400'
                      : entry.type === 'error'
                        ? 'text-red-400'
                        : entry.type === 'warn'
                          ? 'text-amber-400'
                          : 'text-zinc-300'
                  }
                >
                  {entry.msg}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Saved Products List */}
        <div className="rounded-lg border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-950">Saved Sage Products</span>
              {sageProducts.length > 0 && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  {sageProducts.length}
                </span>
              )}
            </div>
            <button
              onClick={fetchSageProducts}
              disabled={sageLoadingList}
              className="h-7 rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              {sageLoadingList ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {sageListError && (
            <div className="p-4 text-xs text-red-600 bg-red-50">
              Error: {sageListError}
            </div>
          )}

          {sageLoadingList && (
            <div className="py-10 text-center text-xs text-zinc-500">Loading...</div>
          )}

          {!sageLoadingList && !sageListError && sageProducts.length === 0 && (
            <div className="py-10 text-center text-xs text-zinc-500">
              No Sage products saved yet.
            </div>
          )}

          {!sageLoadingList && sageProducts.length > 0 && (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50/50 text-zinc-500 font-medium">
                <tr>
                  <th className="px-4 py-3 w-14">Image</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Item #</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Pics</th>
                  <th className="px-4 py-3">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-800">
                {sageProducts.map((p) => {
                  const firstPic = p.pics?.[0]?.url;
                  return (
                    <tr key={p.id} className="hover:bg-zinc-50/60">
                      <td className="px-4 py-3">
                        {firstPic ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={firstPic}
                            alt={p.name || 'Product'}
                            className="w-10 h-10 rounded object-cover border border-zinc-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400 text-[10px]">
                            N/A
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-900 line-clamp-1">{p.name || '—'}</div>
                        <div className="text-zinc-400 font-mono mt-0.5 text-[10px]">ID: {p.id}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-500">{p.itemNum || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-700">
                          {p.cat1Name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500">{p.pics?.length ?? 0}</td>
                      <td className="px-4 py-3 text-zinc-400">
                        {p.uploadedAt ? new Date(p.uploadedAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
