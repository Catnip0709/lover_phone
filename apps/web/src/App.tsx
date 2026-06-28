import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Home from "@/pages/Home";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import CharacterDetail from "@/pages/characters/CharacterDetail";
import CharacterList from "@/pages/characters/CharacterList";
import ImportCharacter from "@/pages/characters/ImportCharacter";
import NewCharacter from "@/pages/characters/NewCharacter";
import LegalPage from "@/pages/legal/LegalPage";
import MeProfileEdit from "@/pages/me/MeProfileEdit";
import MemoriesPage from "@/pages/memories/MemoriesPage";
import MemoryNew from "@/pages/memories/MemoryNew";
import ConversationDetail from "@/pages/messages/ConversationDetail";
import WechatProfileEdit from "@/pages/wechat/WechatProfileEdit";
import WechatShell from "@/pages/wechat/WechatShell";
import WechatMomentNew from "@/pages/wechat/WechatMomentNew";
import ModelSettings from "@/pages/settings/ModelSettings";
import AboutSettings from "@/pages/settings/AboutSettings";
import PrivacySettings from "@/pages/settings/PrivacySettings";
import SettingsHome from "@/pages/settings/SettingsHome";
import { useAuthStore } from "@/stores/auth-store";

export default function App() {
  const { bootstrapped, bootstrap, user } = useAuthStore();

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (!bootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef1f5] text-sm text-slate-500">
        正在唤醒小手机...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={user ? "/phone" : "/login"} replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/legal/:type" element={<LegalPage />} />
        <Route path="/phone" element={user ? <Home /> : <Navigate to="/login" replace />} />
        <Route path="/characters" element={user ? <CharacterList /> : <Navigate to="/login" replace />} />
        <Route
          path="/characters/new"
          element={user ? <NewCharacter /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/characters/:id/edit"
          element={user ? <NewCharacter /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/characters/:id"
          element={user ? <CharacterDetail /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/characters/import"
          element={user ? <ImportCharacter /> : <Navigate to="/login" replace />}
        />
        <Route path="/messages" element={user ? <WechatShell /> : <Navigate to="/login" replace />} />
        <Route
          path="/memories"
          element={user ? <MemoriesPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/memories/new"
          element={user ? <MemoryNew /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/me/profile"
          element={user ? <MeProfileEdit /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/messages/me/edit"
          element={user ? <WechatProfileEdit /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/messages/moments/new"
          element={user ? <WechatMomentNew /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/messages/:id"
          element={user ? <ConversationDetail /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/settings"
          element={user ? <SettingsHome /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/settings/model"
          element={user ? <ModelSettings /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/settings/privacy"
          element={user ? <PrivacySettings /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/settings/about"
          element={user ? <AboutSettings /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to="/phone" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
