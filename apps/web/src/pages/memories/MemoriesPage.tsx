import type { AgentMemoryView, CharacterView } from "@myphone/shared";
import { ArrowLeft, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listCharacters } from "@/api/characters";
import { deleteMemory, listMemories, updateMemory } from "@/api/memories";
import { MemoryList } from "@/components/memories/MemoryList";
import { useAuthStore } from "@/stores/auth-store";

export default function MemoriesPage() {
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const [characters, setCharacters] = useState<CharacterView[]>([]);
  const [memories, setMemories] = useState<AgentMemoryView[]>([]);
  const [activeCharacter, setActiveCharacter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    void (async () => {
      try {
        const data = await listCharacters(accessToken);
        setCharacters(data);
        setActiveCharacter((current) => {
          if (current && data.some((character) => character.id === current)) {
            return current;
          }
          return data[0]?.id ?? null;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载角色失败");
        setIsLoading(false);
      }
    })();
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || !activeCharacter) {
      setMemories([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    const filter = {
      pageSize: 100,
      characterId: activeCharacter,
    };
    listMemories(accessToken, filter)
      .then((res) => setMemories(res.data))
      .catch((err) => {
        setMemories([]);
        setError(err instanceof Error ? err.message : "加载记忆失败");
      })
      .finally(() => setIsLoading(false));
  }, [accessToken, activeCharacter]);

  async function handleDelete(memory: AgentMemoryView) {
    if (!accessToken) return;
    if (!window.confirm(`确定删除这条记忆吗？\n\n${memory.content}`)) return;
    try {
      await deleteMemory(accessToken, memory.id);
      setMemories((prev) => prev.filter((item) => item.id !== memory.id));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "删除失败");
    }
  }

  async function handleEdit(memory: AgentMemoryView) {
    if (!accessToken) return;
    const next = window.prompt("编辑记忆内容", memory.content);
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === memory.content) return;
    try {
      const updated = await updateMemory(accessToken, memory.id, { content: trimmed });
      setMemories((prev) => prev.map((item) => (item.id === memory.id ? updated : item)));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "保存失败");
    }
  }

  const selectedCharacter = characters.find((character) => character.id === activeCharacter);
  const selectedCharacterName = selectedCharacter
    ? selectedCharacter.nickname || selectedCharacter.name
    : "";

  return (
    <main className="relative min-h-screen bg-[#FAF7F2] pb-24 text-[#2C2C2C]">
      <header className="sticky top-0 z-10 border-b border-[#E8E4DD]/60 bg-[#FAF7F2]/85 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-5 py-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E8E4DD] bg-white text-[#6F6A60] hover:text-[#2C2C2C]"
            aria-label="返回"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold tracking-[0.06em] text-[#2C2C2C]">记忆日记本</h1>
            <p className="mt-0.5 text-[11px] text-[#8A8A8A]">按角色查看 TA 对你的记忆</p>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-xl px-5 pt-5">
        <div className="rounded-[28px] border border-[#E8E4DD] bg-white/80 p-4 shadow-[0_10px_30px_rgba(44,44,44,0.04)]">
          <label htmlFor="memory-character-select" className="text-xs font-medium text-[#8A8A8A]">
            选择角色
          </label>
          <div className="relative mt-2">
            <select
              id="memory-character-select"
              value={activeCharacter ?? ""}
              disabled={characters.length === 0}
              onChange={(event) => setActiveCharacter(event.target.value || null)}
              className="h-12 w-full appearance-none rounded-2xl border border-[#E8E4DD] bg-[#FFFEF9] px-4 pr-10 text-[15px] font-medium text-[#2C2C2C] outline-none transition focus:border-[#2C2C2C] disabled:text-[#B0AAA0]"
            >
              {characters.length === 0 ? <option value="">暂无角色</option> : null}
              {characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.nickname || character.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#8A8A8A]">
              ▼
            </span>
          </div>
          <p className="mt-3 text-xs leading-5 text-[#8A8A8A]">
            {selectedCharacter
              ? `正在查看「${selectedCharacterName}」关于你的长期记忆`
              : "创建角色后，这里会展示对应角色的记忆。"}
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#2C2C2C]">记忆列表</h2>
            <p className="mt-1 text-xs text-[#8A8A8A]">
              {selectedCharacter ? `${selectedCharacterName} 记住的关于你的事` : "选择角色后查看"}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs text-[#8A8A8A]">
            {isLoading ? "加载中" : `${memories.length} 条`}
          </span>
        </div>

        <div className="mt-4">
          {activeCharacter ? (
            <MemoryList
              memories={memories}
              isLoading={isLoading}
              emptyTitle="暂无记忆"
              emptyDescription="这个角色还没有记录关于你的长期记忆。"
              onMemoryEdit={handleEdit}
              onMemoryDelete={handleDelete}
            />
          ) : (
            <MemoryList
              memories={[]}
              isLoading={false}
              emptyTitle="暂无角色"
              emptyDescription="创建角色后，可以在这里查看该角色对你的记忆。"
            />
          )}
        </div>
      </section>

      <button
        type="button"
        onClick={() => navigate("/memories/new")}
        className="fixed bottom-8 right-6 z-20 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#2C2C2C] text-white shadow-[0_4px_16px_rgba(0,0,0,0.18)] transition hover:scale-105"
        aria-label="新增记忆"
      >
        <Plus className="h-6 w-6" />
      </button>
    </main>
  );
}
