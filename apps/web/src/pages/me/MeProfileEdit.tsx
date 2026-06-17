import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import type { Gender, MeProfileView, PatchMeProfileRequest } from "@myphone/shared";
import { getMeProfile, patchMeProfile } from "@/api/users";
import { AvatarUploader } from "@/components/AvatarUploader";
import { useAuthStore } from "@/stores/auth-store";

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "男" },
  { value: "female", label: "女" },
  { value: "other", label: "其他" },
];

export default function MeProfileEdit() {
  const { accessToken } = useAuthStore();
  const [profile, setProfile] = useState<MeProfileView | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [bio, setBio] = useState("");
  const [region, setRegion] = useState("");

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    getMeProfile(accessToken)
      .then((p) => {
        setProfile(p);
        setNickname(p.nickname ?? "");
        setAvatar(p.avatar);
        setBirthday(p.birthday ?? "");
        setGender(p.gender ?? "");
        setBio(p.bio ?? "");
        setRegion(p.region ?? "");
      })
      .catch(() => setError("加载资料失败"))
      .finally(() => setLoading(false));
  }, [accessToken]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      return;
    }

    setSaving(true);
    setError(null);

    const body: PatchMeProfileRequest = {
      nickname: nickname.trim() || null,
      avatar,
      birthday: birthday.trim() || null,
      gender: gender || null,
      bio: bio.trim() || null,
      region: region.trim() || null,
    };

    try {
      const updated = await patchMeProfile(accessToken, body);
      setProfile(updated);
      window.history.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  const fallbackText = nickname || profile?.username || "我";

  return (
    <main className="relative flex h-screen min-h-0 flex-col overflow-hidden bg-[#fff4f8] text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(255,255,255,0.95),transparent_34%),radial-gradient(circle_at_86%_12%,rgba(255,205,222,0.48),transparent_30%),radial-gradient(circle_at_20%_90%,rgba(201,228,255,0.58),transparent_34%),linear-gradient(165deg,#fff7fb_0%,#ffffff_50%,#edf7ff_100%)]" />

      <div className="relative z-10 flex min-h-screen min-h-0 flex-col">
        <header className="shrink-0 border-b border-white/70 bg-white/54 px-4 py-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <Link
              className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
              to="/characters"
            >
              <ArrowLeft className="h-4 w-4" />
              返回
            </Link>
            <p className="text-base font-medium text-slate-900">我的资料</p>
            <button
              className="flex items-center gap-1 text-sm font-medium text-emerald-600 disabled:opacity-50"
              disabled={saving}
              form="me-edit-form"
              type="submit"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              保存
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <form
            className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-6"
            id="me-edit-form"
            onSubmit={handleSubmit}
          >
            {error && (
              <div className="rounded-2xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <AvatarUploader
              accessToken={accessToken}
              fallbackText={fallbackText}
              value={avatar}
              onChange={setAvatar}
              onError={setError}
            />

            <p className="text-center text-xs text-slate-400">
              这里是各 APP 默认会读取的「我」。APP 内可以单独覆盖。
            </p>

            <div className="flex flex-col gap-3 rounded-2xl border border-white/70 bg-white/54 p-4 shadow backdrop-blur-xl">
              <FieldInput
                label="昵称"
                value={nickname}
                onChange={setNickname}
                placeholder={profile?.username ?? "输入昵称"}
                maxLength={40}
              />
              <FieldInput
                label="生日"
                value={birthday}
                onChange={setBirthday}
                placeholder="例如 1995-04-12"
                maxLength={40}
              />
              <FieldSelect
                label="性别"
                value={gender}
                onChange={(v) => setGender(v as Gender | "")}
                options={[
                  { value: "", label: "未设置" },
                  ...GENDER_OPTIONS,
                ]}
              />
              <FieldTextarea
                label="签名"
                value={bio}
                onChange={setBio}
                placeholder="介绍一下自己"
                maxLength={200}
              />
              <FieldInput
                label="地区"
                value={region}
                onChange={setRegion}
                placeholder="填写地区"
                maxLength={80}
              />
            </div>

            <p className="px-1 text-[11px] text-slate-400">
              账号：{profile?.username}
            </p>
          </form>
        )}
      </div>
    </main>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="w-20 shrink-0 text-sm font-medium text-slate-500">{label}</label>
      <input
        className="min-w-0 flex-1 rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-200"
        maxLength={maxLength}
        placeholder={placeholder}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function FieldTextarea({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength: number;
}) {
  return (
    <div className="flex items-start gap-3">
      <label className="w-20 shrink-0 pt-2 text-sm font-medium text-slate-500">{label}</label>
      <textarea
        className="min-h-20 w-full flex-1 resize-none rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-200"
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="w-20 shrink-0 text-sm font-medium text-slate-500">{label}</label>
      <select
        className="min-w-0 flex-1 rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-200"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
