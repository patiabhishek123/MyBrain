import { FormEvent, useMemo, useState } from "react"

type AuthMode = "login" | "register"

type SourceType = "text" | "youtube"

interface Source {
  id: string
  type: SourceType
  title: string
  content: string
  createdAt: string
}

interface ChatMessage {
  id: string
  from: "user" | "assistant"
  text: string
  createdAt: string
}

interface Project {
  id: string
  name: string
  sources: Source[]
  messages: ChatMessage[]
}

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`
}

export default function Home() {
  const [authMode, setAuthMode] = useState<AuthMode>("login")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authName, setAuthName] = useState("")
  const [authEmail, setAuthEmail] = useState("")
  const [authPassword, setAuthPassword] = useState("")

  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [newProjectName, setNewProjectName] = useState("")

  const [newTextTitle, setNewTextTitle] = useState("")
  const [newTextContent, setNewTextContent] = useState("")
  const [ytTitle, setYtTitle] = useState("")
  const [ytUrl, setYtUrl] = useState("")

  const [question, setQuestion] = useState("")

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId],
  )

  function handleAuthSubmit(e: FormEvent) {
    e.preventDefault()
    // For now, fake auth only on the client.
    if (!authEmail || !authPassword || (authMode === "register" && !authName)) {
      return
    }
    setIsAuthenticated(true)
  }

  function handleCreateProject(e: FormEvent) {
    e.preventDefault()
    const trimmed = newProjectName.trim()
    if (!trimmed) return

    const project: Project = {
      id: createId("proj"),
      name: trimmed,
      sources: [],
      messages: [],
    }

    setProjects((prev) => [...prev, project])
    setActiveProjectId(project.id)
    setNewProjectName("")
  }

  function updateProject(id: string, updater: (project: Project) => Project) {
    setProjects((prev) => prev.map((p) => (p.id === id ? updater(p) : p)))
  }

  function handleAddTextSource(e: FormEvent) {
    e.preventDefault()
    if (!activeProject || !newTextContent.trim()) return

    const source: Source = {
      id: createId("src"),
      type: "text",
      title: newTextTitle.trim() || "Untitled note",
      content: newTextContent.trim(),
      createdAt: new Date().toISOString(),
    }

    updateProject(activeProject.id, (p) => ({
      ...p,
      sources: [source, ...p.sources],
    }))

    setNewTextTitle("")
    setNewTextContent("")
  }

  function handleAddYoutubeSource(e: FormEvent) {
    e.preventDefault()
    if (!activeProject || !ytUrl.trim()) return

    const source: Source = {
      id: createId("src"),
      type: "youtube",
      title: ytTitle.trim() || "YouTube video",
      content: ytUrl.trim(),
      createdAt: new Date().toISOString(),
    }

    updateProject(activeProject.id, (p) => ({
      ...p,
      sources: [source, ...p.sources],
    }))

    setYtTitle("")
    setYtUrl("")
  }

  function generateAssistantReply(project: Project, userQuestion: string): string {
    if (!project.sources.length) {
      return "You haven't added any knowledge sources yet for this project. Add notes or YouTube links on the left, then ask again."
    }

    const lowerQ = userQuestion.toLowerCase()
    const words = lowerQ.split(/\s+/).filter((w) => w.length > 3)

    const textSources = project.sources.filter((s) => s.type === "text")
    for (const source of textSources) {
      const lc = source.content.toLowerCase()
      const match = words.find((w) => lc.includes(w))
      if (match) {
        const idx = lc.indexOf(match)
        const start = Math.max(0, idx - 80)
        const end = Math.min(source.content.length, idx + 240)
        const excerpt = source.content.slice(start, end)
        return `Based on your note "${source.title}", this seems relevant:\n\n${excerpt}...\n\n(This is a simple preview. The real backend can plug an LLM here.)`
      }
    }

    return `I looked through ${project.sources.length} saved sources but couldn't find an obvious match. Once the backend is wired up to an AI model, this answer will use your saved knowledge more deeply.`
  }

  function handleAskQuestion(e: FormEvent) {
    e.preventDefault()
    if (!activeProject || !question.trim()) return

    const trimmed = question.trim()
    const userMessage: ChatMessage = {
      id: createId("msg"),
      from: "user",
      text: trimmed,
      createdAt: new Date().toISOString(),
    }

    const replyText = generateAssistantReply(activeProject, trimmed)

    const assistantMessage: ChatMessage = {
      id: createId("msg"),
      from: "assistant",
      text: replyText,
      createdAt: new Date().toISOString(),
    }

    updateProject(activeProject.id, (p) => ({
      ...p,
      messages: [...p.messages, userMessage, assistantMessage],
    }))

    setQuestion("")
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-md rounded-3xl bg-white/90 shadow-xl border border-slate-200 px-8 py-6">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              MyBrain
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Your personal second brain for any topic.
            </p>
          </div>

          <div className="mb-4 flex rounded-full bg-slate-100 p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setAuthMode("login")}
              className={`flex-1 rounded-full px-3 py-1 transition ${
                authMode === "login"
                  ? "bg-slate-900 text-slate-50 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("register")}
              className={`flex-1 rounded-full px-3 py-1 transition ${
                authMode === "register"
                  ? "bg-slate-900 text-slate-50 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Sign up
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleAuthSubmit}>
            {authMode === "register" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Name
                </label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-0 focus:border-slate-400 focus:bg-white"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="Ada Lovelace"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Email
              </label>
              <input
                type="email"
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-0 focus:border-slate-400 focus:bg-white"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Password
              </label>
              <input
                type="password"
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-0 focus:border-slate-400 focus:bg-white"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-50 shadow-sm transition hover:bg-slate-800"
            >
              {authMode === "login" ? "Enter MyBrain" : "Create MyBrain account"}
            </button>
          </form>

          <p className="mt-4 text-[11px] text-slate-400">
            This is a frontend-only prototype. In a later step we can connect it
            to your real authentication and AI backend.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100 px-4 py-4">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row">
        <aside className="w-full rounded-3xl bg-white/90 p-4 shadow-md ring-1 ring-slate-200/80 lg:w-64">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Projects
            </h2>
            <p className="text-xs text-slate-500">
              Create a folder like &quot;TRUMP&quot; for each topic.
            </p>
          </div>

          <form onSubmit={handleCreateProject} className="flex gap-2">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="New project name"
              className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-slate-400 focus:bg-white"
            />
            <button
              type="submit"
              className="rounded-2xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-50 hover:bg-slate-800"
            >
              Add
            </button>
          </form>

          <div className="mt-4 space-y-1.5">
            {projects.length === 0 ? (
              <p className="text-xs text-slate-400">
                No projects yet. Create your first topic folder.
              </p>
            ) : (
              projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => setActiveProjectId(project.id)}
                  className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-xs transition ${
                    project.id === activeProjectId
                      ? "bg-slate-900 text-slate-50 shadow-sm"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="truncate">{project.name}</span>
                  {project.sources.length > 0 && (
                    <span
                      className={`ml-2 inline-flex h-5 items-center justify-center rounded-full px-2 text-[10px] ${
                        project.id === activeProjectId
                          ? "bg-slate-800 text-slate-50"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {project.sources.length}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="flex-1 space-y-4">
          {!activeProject ? (
            <div className="flex h-full min-h-[320px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center">
              <div>
                <p className="text-base font-semibold text-slate-800">
                  Create and select a project to start.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Think of each project as a dedicated &quot;brain&quot; for one
                  topic, like a person or company.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-3xl bg-white/90 p-4 shadow-md ring-1 ring-slate-200/80">
                <div className="mb-3 flex items-baseline justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {activeProject.name}
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Add news articles, YouTube links, and notes. This becomes
                      the reference knowledge for this brain.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <section className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Text knowledge
                    </h3>
                    <form onSubmit={handleAddTextSource} className="space-y-2">
                      <input
                        type="text"
                        value={newTextTitle}
                        onChange={(e) => setNewTextTitle(e.target.value)}
                        placeholder="Short title (optional)"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-slate-400 focus:bg-white"
                      />
                      <textarea
                        value={newTextContent}
                        onChange={(e) => setNewTextContent(e.target.value)}
                        placeholder="Paste an article, key bullet points, or your own notes about this topic..."
                        className="min-h-[96px] w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-slate-400 focus:bg-white"
                      />
                      <button
                        type="submit"
                        className="rounded-2xl bg-slate-900 px-4 py-1.5 text-xs font-semibold text-slate-50 hover:bg-slate-800"
                      >
                        Add note to knowledge
                      </button>
                    </form>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      YouTube reference
                    </h3>
                    <form onSubmit={handleAddYoutubeSource} className="space-y-2">
                      <input
                        type="text"
                        value={ytTitle}
                        onChange={(e) => setYtTitle(e.target.value)}
                        placeholder="Video title (optional)"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-slate-400 focus:bg-white"
                      />
                      <input
                        type="url"
                        value={ytUrl}
                        onChange={(e) => setYtUrl(e.target.value)}
                        placeholder="Paste a YouTube link"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-slate-400 focus:bg-white"
                      />
                      <button
                        type="submit"
                        className="rounded-2xl bg-slate-900 px-4 py-1.5 text-xs font-semibold text-slate-50 hover:bg-slate-800"
                      >
                        Save YouTube link
                      </button>
                    </form>
                  </section>
                </div>

                <div className="mt-4">
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Saved knowledge
                  </h3>
                  {activeProject.sources.length === 0 ? (
                    <p className="text-[11px] text-slate-400">
                      Nothing saved yet. Add at least one note or YouTube link.
                    </p>
                  ) : (
                    <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1 text-[11px]">
                      {activeProject.sources.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-1.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-800">
                              {s.title}
                            </p>
                            <p className="truncate text-[10px] text-slate-500">
                              {s.type === "text" ? "Text note" : "YouTube link"}
                            </p>
                          </div>
                          {s.type === "youtube" && (
                            <a
                              href={s.content}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-2 text-[10px] font-semibold text-slate-700 underline underline-offset-2"
                            >
                              Open
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <section className="flex min-h-[320px] flex-col rounded-3xl bg-white/95 shadow-md ring-1 ring-slate-200/80">
                <div className="border-b border-slate-100 px-4 py-2.5">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Chat with this brain
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Ask questions and it will respond using the knowledge you&apos;ve
                    stored above.
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3">
                  {activeProject.messages.length === 0 ? (
                    <div className="mt-8 text-center text-xs text-slate-400">
                      Start by asking something like:
                      <div className="mt-2 space-y-1">
                        <p className="rounded-full bg-slate-50 px-3 py-1 text-[11px] text-slate-600">
                          &quot;Summarise this person&apos;s political stance on
                          immigration&quot;
                        </p>
                        <p className="rounded-full bg-slate-50 px-3 py-1 text-[11px] text-slate-600">
                          &quot;What are three key controversies mentioned in my
                          notes?&quot;
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeProject.messages.map((m) => (
                        <div
                          key={m.id}
                          className={`flex ${
                            m.from === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-3xl px-4 py-2 text-xs leading-relaxed ${
                              m.from === "user"
                                ? "bg-slate-900 text-slate-50"
                                : "bg-slate-100 text-slate-800"
                            } whitespace-pre-wrap`}
                          >
                            {m.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form
                  onSubmit={handleAskQuestion}
                  className="border-t border-slate-100 p-3"
                >
                  <div className="flex items-end gap-2 rounded-3xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200 focus-within:ring-slate-400">
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask a question based on this project’s saved knowledge..."
                      className="max-h-28 min-h-[44px] flex-1 resize-none bg-transparent text-xs outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!question.trim()}
                      className="mb-1 inline-flex items-center justify-center rounded-2xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-50 disabled:opacity-40"
                    >
                      Send
                    </button>
                  </div>
                </form>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}