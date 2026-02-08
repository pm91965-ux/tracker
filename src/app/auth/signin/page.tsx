
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignIn() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = await signIn("credentials", {
      redirect: false,
      username,
      password,
    });

    if (result?.error) {
      setError(result.error);
    } else if (result?.ok) {
      window.location.href = "/"; // Redirect to home page on success
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7e7ce]">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-3xl font-bold text-[#800020]">Sign In</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="username" className="mb-2 block text-sm font-bold text-gray-700">
              Username:
            </label>
            <input
              type="text"
              id="username"
              className="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="mb-2 block text-sm font-bold text-gray-700">
              Password:
            </label>
            <input
              type="password"
              id="password"
              className="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="mb-4 text-center text-red-500">{error}</p>}
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="focus:shadow-outline rounded bg-[#800020] px-4 py-2 font-bold text-white hover:bg-red-700 focus:outline-none"
            >
              Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
