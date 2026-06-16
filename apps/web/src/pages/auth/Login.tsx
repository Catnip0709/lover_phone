import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { login } from "@/api/auth";
import { useAuthStore } from "@/stores/auth-store";
import { AuthForm, type AuthFormValue } from "./AuthForm";
import { AuthLayout } from "./AuthLayout";

export default function Login() {
  const navigate = useNavigate();
  const { user, setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to="/phone" replace />;
  }

  async function handleSubmit(value: AuthFormValue) {
    setLoading(true);
    setError(null);

    try {
      const response = await login(value);
      setAuth(response);
      navigate("/phone", { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="登录" subtitle="输入密码，回到你的手机。">
      <AuthForm submitText="登录" loading={loading} error={error} onSubmit={handleSubmit} />
      <p className="mt-5 text-center text-sm text-slate-500">
        还没有账号？
        <Link className="ml-1 font-medium text-slate-950 hover:underline" to="/register">
          去注册
        </Link>
      </p>
    </AuthLayout>
  );
}
