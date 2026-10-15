
import { useState, useRef, useEffect } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useMatch,
} from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Building2,
  FilePlus2,
  History,
  UploadCloud,
  BrainCircuit,
  Users,
  ScrollText,
  Settings,
  Bell,
  Bot,
  LogOut,
  Menu,
  PanelLeftClose,
  X,
  Send,
  Trash2,
  User as UserIcon,
  Sparkles,
} from "lucide-react";

import { useAuth } from "../context/Auth";
import { notifications, assistant } from "../services";
import { Button, fmtDate } from "./ui";
import Background from "./Background";

const NAV = [
  ["/", "Dashboard", LayoutDashboard],
  ["/companies", "Companies", Building2],
  ["/assess", "New Assessment", FilePlus2],
  ["/history", "Assessment History", History],
  ["/batch", "Batch Prediction", UploadCloud],
  ["/model", "Model Intelligence", BrainCircuit],
];

const ADMIN = [
  ["/admin/users", "User Management", Users],
  ["/admin/audit", "Audit Logs", ScrollText],
  ["/admin/model", "Model Management", BrainCircuit],
  ["/admin/settings", "Risk Settings", Settings],
];

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/companies": "Companies",
  "/assess": "New Assessment",
  "/history": "Assessment History",
  "/batch": "Batch Prediction",
  "/model": "Model Intelligence",
  "/profile": "Profile",
  "/admin/users": "User Management",
  "/admin/audit": "Audit Logs",
  "/admin/model": "Model Management",
  "/admin/settings": "Risk Settings",
};

export default function Layout() {
  const { user, logout } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [bell, setBell] = useState(false);
  const [chat, setChat] = useState(false);

  const loc = useLocation();
  const qc = useQueryClient();
  const nav = useNavigate();

  const note = useQuery({
    queryKey: ["notifications"],
    queryFn: notifications.list,
    refetchInterval: 30000,
  });

  const unread = (note.data || []).filter(
    (n: any) => !n.is_read
  ).length;

  const read = useMutation({
    mutationFn: notifications.readAll,
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["notifications"],
      }),
  });

  useEffect(() => {
    setDrawer(false);
  }, [loc.pathname]);

  const match = useMatch("/assessments/:id");
  const assessmentId = match
    ? Number(match.params.id)
    : undefined;

  const Item = ([to, label, Icon]: any) => (
    <NavLink
      key={to}
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
          isActive
            ? "bg-primary text-white shadow"
            : "text-slate-600 hover:bg-primary-light/60"
        }`
      }
    >
      <Icon size={18} aria-hidden="true" />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );

  const side = (
    <div className="flex h-full flex-col gap-1 p-3">
      <div className="mb-4 flex items-center gap-2 px-2">
        <div className="rounded-lg bg-primary p-1.5 text-white">
          <Sparkles size={18} />
        </div>
        {!collapsed && <b className="text-lg">RiskIntel</b>}
      </div>

      {NAV.map(Item)}

      {user?.role === "admin" && (
        <>
          <div
            className={`mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted ${
              collapsed ? "hidden" : ""
            }`}
          >
            Admin
          </div>
          {ADMIN.map(Item)}
        </>
      )}

      <div className="mt-auto rounded-xl bg-soft p-3 text-xs">
        {!collapsed ? (
          <>
            <div className="font-semibold">
              {user?.full_name || "User"}
            </div>
            <div className="capitalize text-muted">
              {user?.role || "analyst"}
            </div>
          </>
        ) : (
          <UserIcon size={16} />
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <Background />

      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden border-r border-line bg-white/80 backdrop-blur transition-all lg:block ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        {side}
      </aside>

      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
            />

            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-64 bg-white lg:hidden"
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
            >
              {side}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div
        className={`transition-all ${
          collapsed ? "lg:pl-[72px]" : "lg:pl-64"
        }`}
      >
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-white/80 px-4 py-3 backdrop-blur">
          <button
            aria-label="Open menu"
            className="lg:hidden"
            onClick={() => setDrawer(true)}
          >
            <Menu />
          </button>

          <button
            aria-label="Collapse sidebar"
            className="hidden lg:block"
            onClick={() => setCollapsed((value) => !value)}
          >
            <PanelLeftClose
              size={20}
              className={collapsed ? "rotate-180" : ""}
            />
          </button>

          <h1 className="text-lg font-semibold">
            {TITLES[loc.pathname] ||
              (loc.pathname.startsWith("/assessments")
                ? "Assessment Result"
                : loc.pathname.startsWith("/companies")
                  ? "Company Profile"
                  : "")}
          </h1>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <button
                aria-label="Notifications"
                onClick={() => setBell((value) => !value)}
                className="relative rounded-full p-2 hover:bg-soft"
              >
                <Bell size={20} />

                {unread > 0 && (
                  <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-danger" />
                )}
              </button>

              <AnimatePresence>
                {bell && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute right-0 mt-2 w-80 rounded-2xl border border-line bg-white p-3 shadow-xl"
                  >
                    <div className="mb-2 flex justify-between text-sm font-semibold">
                      Notifications

                      {unread > 0 && (
                        <button
                          className="text-xs font-normal text-primary"
                          onClick={() => read.mutate()}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    {(note.data || []).length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted">
                        You're all caught up.
                      </p>
                    ) : (
                      <ul className="max-h-80 space-y-2 overflow-auto">
                        {(note.data || []).map((n: any) => (
                          <li
                            key={n.id}
                            className={`rounded-lg p-2 text-sm ${
                              n.is_read ? "" : "bg-soft"
                            }`}
                          >
                            <div className="font-medium">
                              {n.title}
                            </div>
                            <div className="text-xs text-muted">
                              {n.body}
                            </div>
                            <div className="text-[11px] text-muted">
                              {fmtDate(n.created_at)}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button
              variant="ghost"
              onClick={() => setChat(true)}
            >
              <Bot size={16} />
              AI Assistant
            </Button>

            <button
              onClick={() => nav("/profile")}
              className="rounded-full bg-primary-light p-2 text-primary"
              aria-label="Profile"
            >
              <UserIcon size={18} />
            </button>

            <button
              onClick={logout}
              aria-label="Log out"
              className="rounded-full p-2 hover:bg-soft"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      <button
        onClick={() => setChat(true)}
        aria-label="Open AI assistant"
        className="glow fixed bottom-5 right-5 z-30 rounded-full bg-gradient-to-br from-sky-400 to-primary p-4 text-white shadow-lg"
      >
        <Bot size={24} />
      </button>

      <Chat
        open={chat}
        onClose={() => setChat(false)}
        assessmentId={assessmentId}
      />
    </div>
  );
}

const SUGGEST = [
  "Explain my latest risk assessment",
  "What are the top risk factors?",
  "Explain SHAP",
  "What is SMOTE?",
];

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  mode?: string;
  notice?: string;
};

function Chat({
  open,
  onClose,
  assessmentId,
}: {
  open: boolean;
  onClose: () => void;
  assessmentId?: number;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    endRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, busy, open]);

  const send = async (value: string) => {
    const question = value.trim();

    if (!question || busyRef.current) return;

    if (question.length > 2000) {
      setMessages((previous) => [
        ...previous,
        {
          id: `${Date.now()}-validation`,
          role: "assistant",
          text: "Please keep your question under 2,000 characters.",
          mode: "error",
        },
      ]);
      return;
    }

    busyRef.current = true;
    setBusy(true);
    setText("");

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      text: question,
    };

    setMessages((previous) => [...previous, userMessage]);

    try {
      console.log("Sending assistant message:", question);

      const response: any = await assistant.chat(
        question,
        assessmentId
      );

      console.log("Assistant API response:", response);

      const reply =
        typeof response?.reply === "string" &&
        response.reply.trim()
          ? response.reply
          : "The assistant returned an empty answer. Please try again.";

      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        text: reply,
        mode: response?.mode || "fallback",
        notice: response?.notice || "",
      };

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);
    } catch (error: unknown) {
      console.error("Assistant request failed:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";

      setMessages((previous) => [
        ...previous,
        {
          id: `${Date.now()}-error`,
          role: "assistant",
          text: `Sorry, I couldn't answer that. ${errorMessage}`,
          mode: "error",
        },
      ]);
    } finally {
      busyRef.current = false;
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const clearConversation = () => {
    setMessages([]);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white shadow-2xl sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[600px] sm:w-[400px] sm:rounded-2xl sm:border sm:border-line"
          role="dialog"
          aria-modal="true"
          aria-label="Risk Intelligence Assistant"
        >
          <div className="flex shrink-0 items-center gap-3 rounded-t-2xl bg-gradient-to-r from-primary to-sky-500 p-4 text-white">
            <Bot size={22} />

            <div>
              <div className="font-semibold">
                Risk Intelligence Assistant
              </div>
              <div className="text-xs opacity-90">
                {busy ? "Preparing your answer..." : "Ready to help"}
              </div>
            </div>

            <button
              type="button"
              className="ml-auto rounded p-1 hover:bg-white/10"
              aria-label="Clear conversation"
              onClick={clearConversation}
              disabled={busy}
            >
              <Trash2 size={16} />
            </button>

            <button
              type="button"
              className="rounded p-1 hover:bg-white/10"
              aria-label="Close assistant"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>

          <div className="shrink-0 border-b border-line bg-soft px-4 py-1.5 text-xs text-muted">
            {assessmentId
              ? `Context: assessment #${assessmentId}`
              : "Uses your latest saved assessment when available"}
          </div>

          <div
            className="flex-1 space-y-3 overflow-y-auto p-4"
            aria-live="polite"
          >
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted">
                  Ask about risk scores, SHAP, financial ratios, or your assessment.
                </p>

                {SUGGEST.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={busy}
                    onClick={() => void send(suggestion)}
                    className="block w-full rounded-xl border border-line p-2 text-left text-sm hover:bg-soft disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "ml-auto bg-primary text-white"
                    : "bg-slate-100 text-slate-900"
                }`}
              >
                <div className="whitespace-pre-wrap break-words">
                  {message.text}
                </div>

                {message.role === "assistant" && message.mode && (
                  <div className="mt-2 border-t border-slate-200 pt-1.5 text-[10px] text-slate-500">
                    {message.mode === "ai"
                      ? "AI answer"
                      : message.mode === "error"
                        ? "Request error"
                        : "Built-in answer"}
                  </div>
                )}

                {message.notice && (
                  <div className="mt-2 text-[11px] leading-4 text-slate-500">
                    {message.notice}
                  </div>
                )}
              </motion.div>
            ))}

            {busy && (
              <div
                className="w-fit rounded-2xl bg-slate-100 px-3 py-3 text-sm text-slate-600"
                role="status"
              >
                Assistant is thinking...
              </div>
            )}

            <div ref={endRef} />
          </div>

          <p className="shrink-0 px-4 text-[11px] text-muted">
            AI-generated explanations are for decision support only.
            Verify important financial decisions with authorized professionals.
          </p>

          <form
            className="flex shrink-0 gap-2 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send(text);
            }}
          >
            <input
              ref={inputRef}
              className="input min-w-0 flex-1"
              aria-label="Message"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Ask a question..."
              maxLength={2000}
              disabled={busy}
            />

            <Button
              type="submit"
              disabled={busy || !text.trim()}
              aria-label="Send message"
            >
              <Send size={16} />
            </Button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
