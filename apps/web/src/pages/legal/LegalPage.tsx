import { ArrowLeft, FileText, Shield } from "lucide-react";
import { Link, useParams } from "react-router-dom";

type LegalType = "privacy" | "terms";

const content: Record<LegalType, { title: string; subtitle: string; icon: "shield" | "file"; sections: Array<{ title: string; body: string }> }> = {
  privacy: {
    title: "隐私政策",
    subtitle: "MVP 内测版本的隐私说明，用于上线前占位和评审。",
    icon: "shield",
    sections: [
      {
        title: "我们收集的信息",
        body: "账号信息、模型配置状态、角色卡、聊天记录、长期记忆和必要的系统日志。API Key 会在后端加密保存，接口只返回脱敏内容。",
      },
      {
        title: "信息如何使用",
        body: "用于账号登录、男主创建、AI 回复生成、关系进度维护、长期记忆展示和问题排查。本 MVP 不接真实微信、支付、地图或通讯录。",
      },
      {
        title: "数据与安全",
        body: "业务数据按用户隔离。生产环境需要关闭 Mock 模型、配置强密钥，并使用托管 PostgreSQL、Redis 和 HTTPS。",
      },
    ],
  },
  terms: {
    title: "用户协议",
    subtitle: "MVP 内测版本的使用规则说明，用于上线前占位和评审。",
    icon: "file",
    sections: [
      {
        title: "产品边界",
        body: "小手机是 AI 恋陪模拟产品，不是真实微信、真人社交、医疗咨询、心理治疗或紧急求助服务。",
      },
      {
        title: "内容规则",
        body: "禁止创建未成年人成人向、胁迫、非自愿、违法暴力、自伤诱导或提示词攻击内容。系统会拦截极端风险角色卡和聊天输入。",
      },
      {
        title: "成人模式",
        body: "成人模式仅面向确认已满 18 岁的用户，MVP 只支持轻度成人向，并要求尊重边界和自愿原则。",
      },
    ],
  },
};

export default function LegalPage() {
  const { type } = useParams<{ type: LegalType }>();
  const page = content[type === "terms" ? "terms" : "privacy"];
  const Icon = page.icon === "shield" ? Shield : FileText;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff4f8] px-5 py-6 text-slate-950 sm:px-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(255,203,220,0.38),transparent_32%),radial-gradient(circle_at_85%_5%,rgba(201,228,255,0.4),transparent_28%),linear-gradient(135deg,#fff7fb,#ffffff_48%,#edf7ff)]" />
      <div className="relative w-full">
        <Link className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900" to="/login">
          <ArrowLeft className="h-4 w-4" />
          返回登录
        </Link>
        <section className="mt-8 overflow-hidden rounded-[36px] border border-white/75 bg-white/65 shadow-[0_32px_100px_rgba(45,55,72,0.16)] backdrop-blur-xl">
          <div className="bg-[radial-gradient(circle_at_15%_10%,rgba(148,163,184,0.22),transparent_34%),linear-gradient(135deg,#ffffff,#f1f5f9)] px-7 py-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-950 text-white shadow-xl">
              <Icon className="h-7 w-7" />
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-[-0.05em]">{page.title}</h1>
            <p className="mt-3 text-sm leading-7 text-slate-500">{page.subtitle}</p>
          </div>
          <div className="space-y-4 px-7 py-7">
            {page.sections.map((section) => (
              <article className="rounded-3xl bg-white/75 px-5 py-4 shadow-sm" key={section.title}>
                <h2 className="text-base font-semibold text-slate-900">{section.title}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">{section.body}</p>
              </article>
            ))}
            <p className="pt-2 text-xs leading-6 text-slate-400">
              当前内容为内测占位版本，正式上线前需由法务、隐私合规和内容安全团队复核。
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
