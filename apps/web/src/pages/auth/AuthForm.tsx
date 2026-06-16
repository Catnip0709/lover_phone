import { Eye, EyeOff, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";

export type AuthFormValue = {
  username: string;
  password: string;
};

export function AuthForm({
  submitText,
  loading,
  error,
  onSubmit,
}: {
  submitText: string;
  loading: boolean;
  error: string | null;
  onSubmit: (value: AuthFormValue) => Promise<void>;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({ username, password });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block">
        <span className="text-sm font-medium text-slate-600">用户名</span>
        <input
          className="mt-2 h-12 w-full rounded-2xl border border-white/80 bg-white/75 px-4 text-base outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="中文、英文、数字、下划线"
          autoComplete="username"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-600">密码</span>
        <div className="mt-2 flex h-12 items-center rounded-2xl border border-white/80 bg-white/75 px-4 transition focus-within:border-slate-400 focus-within:ring-4 focus-within:ring-slate-200">
          <input
            className="min-w-0 flex-1 bg-transparent text-base outline-none"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type={showPassword ? "text" : "password"}
            placeholder="不少于 6 位"
            autoComplete="current-password"
          />
          <button
            className="ml-3 text-slate-400 transition hover:text-slate-700"
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "隐藏密码" : "显示密码"}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </label>

      {error ? (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-600">{error}</div>
      ) : null}

      <button
        className="flex h-12 w-full items-center justify-center rounded-2xl bg-slate-950 text-sm font-medium text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={loading}
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {submitText}
      </button>
      <p className="text-center text-xs leading-6 text-slate-400">
        继续使用代表你已阅读并同意{" "}
        <Link className="text-slate-600 underline-offset-4 hover:underline" to="/legal/terms">
          用户协议
        </Link>{" "}
        和{" "}
        <Link className="text-slate-600 underline-offset-4 hover:underline" to="/legal/privacy">
          隐私政策
        </Link>
      </p>
    </form>
  );
}
