'use client';

import React, { useState, useEffect } from 'react';

interface DocumentItem {
  id: string;
  title: string;
  category: string;
  description: string;
  status: string;
  author: string;
  createdAt?: string;
}

const API_URL = 'https://admin.mavenpromo.com/api/external/documents';

export default function ExternalPortalPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('API Spec');
  const [formDescription, setFormDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load saved session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('maven_user');
    const savedPass = localStorage.getItem('maven_pass');
    if (savedUser && savedPass) {
      setEmail(savedUser);
      setPassword(savedPass);
    }
  }, []);

  // API 1: Get Documents List
  const fetchDocuments = async (userEmail = email, userPass = password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_URL, {
        headers: {
          'X-Admin-Username': userEmail,
          'X-Admin-Password': userPass,
          'Authorization': `Basic ${btoa(`${userEmail}:${userPass}`)}`
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to authenticate');
      setDocuments(data.documents || []);
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error connecting to API');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // API 2: Insert Document
  const insertDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Username': email,
          'X-Admin-Password': password,
          'Authorization': `Basic ${btoa(`${email}:${password}`)}`
        },
        body: JSON.stringify({
          title: formTitle,
          category: formCategory,
          description: formDescription,
          status: 'Published',
          author: email.split('@')[0],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to add document');

      setFormTitle('');
      setFormDescription('');
      setIsDialogOpen(false);
      await fetchDocuments();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error creating document');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    const success = await fetchDocuments(email, password);
    if (success) {
      setIsLoggedIn(true);
      localStorage.setItem('maven_user', email);
      localStorage.setItem('maven_pass', password);
    }
  };

  const handleSignOut = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('maven_pass');
  };

  // ==================== LOGIN VIEW (SHADCN UI) ====================
  if (!isLoggedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50/50 p-4">
        <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-6 text-center">
            <h1 className="text-lg font-semibold text-zinc-950">Admin Login</h1>
            <p className="text-xs text-zinc-500 mt-1">Enter your credentials to manage external documents</p>
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

  // ==================== MAIN VIEW (SHADCN UI) ====================
  return (
    <div className="min-h-screen bg-zinc-50/50 pb-12">
      {/* Top Navbar */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-zinc-950">External Documents</h1>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
              {documents.length} items
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDialogOpen(true)}
              className="h-8 rounded-md bg-zinc-900 px-3.5 text-xs font-medium text-white shadow hover:bg-zinc-800 transition-colors inline-flex items-center gap-1.5"
            >
              <span>+ Add Document</span>
            </button>

            <button
              onClick={handleSignOut}
              className="h-8 rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-100 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Table / List */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="rounded-lg border border-zinc-200 bg-white shadow-sm overflow-hidden">
          {documents.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              No documents found. Click &quot;Add Document&quot; to insert one.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50/50 text-xs font-medium text-zinc-500">
                <tr>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Author</th>
                  <th className="px-6 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-zinc-900">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-6 py-3.5 font-medium">
                      <div>{doc.title}</div>
                      {doc.description && (
                        <div className="text-xs text-zinc-500 font-normal mt-0.5 line-clamp-1">{doc.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-800">
                        {doc.category}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-zinc-600">{doc.status || 'Published'}</td>
                    <td className="px-6 py-3.5 text-xs text-zinc-600">{doc.author || 'Admin'}</td>
                    <td className="px-6 py-3.5 text-xs text-zinc-500">
                      {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'Recently'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* ==================== DIALOG MODAL (SHADCN UI) ==================== */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-lg">
            <h2 className="text-base font-semibold text-zinc-950">Add Document</h2>
            <p className="text-xs text-zinc-500 mt-0.5 mb-4">
              Insert a new document directly into the external collection.
            </p>

            <form onSubmit={insertDocument} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700">Title</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. API Architecture v2"
                  className="h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950"
                >
                  <option value="API Spec">API Spec</option>
                  <option value="Protocol">Protocol</option>
                  <option value="Release Note">Release Note</option>
                  <option value="Guide">Guide</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700">Description</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief summary of document..."
                  className="w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDialogOpen(false)}
                  className="h-8 rounded-md border border-zinc-200 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-8 rounded-md bg-zinc-900 px-3 text-xs font-medium text-white shadow hover:bg-zinc-800 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
