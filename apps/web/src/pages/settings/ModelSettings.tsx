import { ArrowLeft, CheckCircle2, KeyRound, Loader2, PlugZap, Save } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import type { ModelConfigView, ModelProvider } from "@myphone/shared";
import {
  createModelConfig,
  listModelConfigs,
  testModelConfig,
  updateModelConfig,
} from "@/api/model-configs";
import { useAuthStore } from "@/stores/auth-store";

const providerOptions: Array<{
  value: ModelProvider;
  label: string;
  models: string[];
}> = [
  { value: "deepseek", label: "DeepSeek", models: ["deepseek-v4-flash", "deepseek-v4-pro"] },
  {
    value: "glm",
    label: "GLM",
    models: ["glm-4-flash-250414", "glm-4-flashx-250414", "glm-4-plus"],
  },
  {
    value: "kimi",
    label: "Kimi",
    models: ["kimi-k2.6", "kimi-k2.5", "moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
  },
];

export default function ModelSettings() {
  const { accessToken } = useAuthStore();
  const [configs, setConfigs] = useState<ModelConfigView[]>([]);
  const [provider, setProvider] = useState<ModelProvider>("deepseek");
  const [modelName, setModelName] = useState("deepseek-v4-flash");
  const [apiKey, setApiKey] = useState("");
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedProvider = useMemo(
    () => providerOptions.find((option) => option.value === provider) ?? providerOptions[0],
    [provider],
  );

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    listModelConfigs(accessToken)
      .then((items) => {
        setConfigs(items);
        const defaultConfig = items.find((item) => item.isDefault) ?? items[0];

        if (defaultConfig) {
          setSelectedConfigId(defaultConfig.id);
          setProvider(defaultConfig.provider);
          setModelName(defaultConfig.modelName);
        }
      })
      .catch((requestError) =>
        setError(requestError instanceof Error ? requestError.message : "加载模型配置失败"),
      )
      .finally(() => setLoading(false));
  }, [accessToken]);

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  function handleProviderChange(value: ModelProvider) {
    const option = providerOptions.find((item) => item.value === value) ?? providerOptions[0];
    setProvider(value);
    setModelName(option.models[0]);
  }

  async function handleTest() {
    setTesting(true);
    setNotice(null);
    setError(null);

    try {
      const result = await testModelConfig(accessToken, { provider, modelName, apiKey });
      if (result.success) {
        setNotice(result.message);
      } else {
        setError(result.message);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "连接测试失败");
    } finally {
      setTesting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);
    setError(null);

    try {
      const input = { provider, modelName, apiKey, isDefault: true };
      const saved = selectedConfigId
        ? await updateModelConfig(accessToken, selectedConfigId, input)
        : await createModelConfig(accessToken, input);
      const nextConfigs = await listModelConfigs(accessToken);
      setConfigs(nextConfigs);
      setSelectedConfigId(saved.id);
      setNotice("模型配置已保存");
      setApiKey("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "保存模型配置失败");
    } finally {
      setSubmitting(false);
    }
  }

  function selectConfig(config: ModelConfigView) {
    setSelectedConfigId(config.id);
    setProvider(config.provider);
    setModelName(config.modelName);
    setApiKey("");
    setNotice(`已选择 ${config.apiKeyMasked}，如需更新请重新输入 API Key`);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff4f8] px-5 py-6 text-slate-950 sm:px-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(255,203,220,0.38),transparent_32%),radial-gradient(circle_at_85%_5%,rgba(201,228,255,0.4),transparent_28%),linear-gradient(135deg,#fff7fb,#ffffff_48%,#edf7ff)]" />
      <div className="relative w-full">
        <Link className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900" to="/settings">
          <ArrowLeft className="h-4 w-4" />
          返回设置
        </Link>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[32px] border border-white/75 bg-white/60 p-6 shadow-sm backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <PlugZap className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-[-0.03em]">模型设置</h1>
                <p className="mt-1 text-sm text-slate-500">配置你自己的国内模型 API Key。</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {loading ? (
                <div className="rounded-2xl bg-white/65 p-4 text-sm text-slate-500">正在加载配置...</div>
              ) : configs.length === 0 ? (
                <div className="rounded-2xl bg-white/65 p-4 text-sm leading-6 text-slate-500">
                  暂无模型配置。保存成功后，聊天和男主先发都会使用默认模型。
                </div>
              ) : (
                configs.map((config) => (
                  <button
                    className={`w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
                      selectedConfigId === config.id
                        ? "border-slate-300 bg-white shadow-sm"
                        : "border-white/70 bg-white/55"
                    }`}
                    key={config.id}
                    onClick={() => selectConfig(config)}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{providerLabel(config.provider)}</p>
                      {config.isDefault ? (
                        <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs text-white">默认</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{config.modelName}</p>
                    <p className="mt-2 text-xs text-slate-400">Key：{config.apiKeyMasked}</p>
                    <p className="mt-1 text-xs text-slate-400">状态：{statusLabel(config.lastTestStatus)}</p>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[32px] border border-white/75 bg-white/60 p-6 shadow-sm backdrop-blur-xl">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="text-sm font-medium text-slate-600">供应商</span>
                <select
                  className="mt-2 h-12 w-full rounded-2xl border border-white/80 bg-white/75 px-4 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                  value={provider}
                  onChange={(event) => handleProviderChange(event.target.value as ModelProvider)}
                >
                  {providerOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-600">模型名称</span>
                <select
                  className="mt-2 h-12 w-full rounded-2xl border border-white/80 bg-white/75 px-4 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                  value={modelName}
                  onChange={(event) => setModelName(event.target.value)}
                >
                  {selectedProvider.models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-600">API Key</span>
                <div className="mt-2 flex h-12 items-center rounded-2xl border border-white/80 bg-white/75 px-4 focus-within:border-slate-400 focus-within:ring-4 focus-within:ring-slate-200">
                  <KeyRound className="mr-3 h-5 w-5 text-slate-400" />
                  <input
                    className="min-w-0 flex-1 bg-transparent outline-none"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder="仅加密存储，不会明文展示"
                    type="password"
                  />
                </div>
              </label>

              {notice ? (
                <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  {notice}
                </div>
              ) : null}

              {error ? (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-600">{error}</div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  className="flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white/70 text-sm font-medium text-slate-700 transition hover:bg-white disabled:opacity-60"
                  disabled={testing || !apiKey}
                  onClick={handleTest}
                  type="button"
                >
                  {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlugZap className="mr-2 h-4 w-4" />}
                  连接测试
                </button>
                <button
                  className="flex h-12 items-center justify-center rounded-2xl bg-slate-950 text-sm font-medium text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-60"
                  disabled={submitting || !apiKey}
                  type="submit"
                >
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  保存为默认模型
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

function providerLabel(provider: ModelProvider): string {
  return providerOptions.find((option) => option.value === provider)?.label ?? provider;
}

function statusLabel(status: ModelConfigView["lastTestStatus"]): string {
  const map = {
    success: "连接成功",
    failed: "连接失败",
    untested: "未测试",
  };

  return map[status];
}
