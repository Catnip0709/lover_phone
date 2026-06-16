import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { register } from "@/api/auth";
import { useAuthStore } from "@/stores/auth-store";
import { AuthForm, type AuthFormValue } from "./AuthForm";
import { AuthLayout } from "./AuthLayout";

export default function Register() {
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
      const response = await register(value);
      setAuth(response);
      navigate("/phone", { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "注册失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="注册" subtitle="创建一台只属于你的手机。">
      <AuthForm submitText="注册并进入" loading={loading} error={error} onSubmit={handleSubmit} />
      <p className="mt-5 text-center text-sm text-slate-500">
        已经有账号？
        <Link className="ml-1 font-medium text-slate-950 hover:underline" to="/login">
          去登录
        </Link>
      </p>
    </AuthLayout>
  );
}
