import { useEffect, useMemo, useState } from "react"
import type React from "react"
import { ApiClientError, get, post } from "../../apiClient"

type AuthMode = "login" | "register"

const SourceType = {
  TEXT: "TEXT",
  YOUTUBE: "YOUTUBE",
} as const

type SourceType = (typeof SourceType)[keyof typeof SourceType]

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
  slug?: string
  sources: Source[]
  messages: ChatMessage[]
}

interface ApiProject {
  id: string
  ownerId: string
  name: string
  slug: string
  createdAt: string
  updatedAt: string
}

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`
}

export default function Home() {
  const [authMode, setAuthMode] = useState<AuthMode>("login")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authName, setAuthName] = useState("")
  const [authEmail, setAuthEmail] = useState("")
  const [authPassword, setAuthPassword] = useState("")

  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [newProjectName, setNewProjectName] = useState("")

  const [newTextTitle, setNewTextTitle] = useState("")
  const [newTextContent, setNewTextContent] = useState("")
  const [ytTitle, setYtTitle] = useState("")
  const [ytUrl, setYtUrl] = useState("")
  const [sourceLoading, setSourceLoading] = useState(false)
  const [sourceError, setSourceError] = useState<string | null>(null)

  const [question, setQuestion] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId],
  )

  async function handleAuthSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!authEmail || !authPassword || (authMode === "register" && !authName)) {
      return
    }

    setAuthLoading(true)
    setAuthError(null)

    try {
      type AuthApiResponse = {
        user: {
          id: string
          email: string
          name: string | null
        }
        tokens: {
          accessToken: string
          refreshToken: string
        }
      }

      const endpoint = authMode === "login" ? "/auth/login" : "/auth/register"
      const payload =
        authMode === "login"
          ? {
              email: authEmail,
              password: authPassword,
            }
          : {
              name: authName,
              email: authEmail,
              password: authPassword,
            }

      const response = await post<AuthApiResponse, typeof payload>(endpoint, payload)

      localStorage.setItem("accessToken", response.tokens.accessToken)
      localStorage.setItem("refreshToken", response.tokens.refreshToken)

      setAuthName(response.user.name ?? "")
      setIsAuthenticated(true)
    } catch (error) {
      if (error instanceof ApiClientError) {
        setAuthError(error.message)
      } else {
        setAuthError("Authentication failed. Please try again.")
      }
    } finally {
      setAuthLoading(false)
    }
  }

  useEffect(() => {
    if (localStorage.getItem("accessToken")) {
      setIsAuthenticated(true)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return

    let isMounted = true

    const loadProjects = async () => {
      setProjectsLoading(true)
      setProjectsError(null)

      try {
        const response = await get<{
          success: boolean
          data: { projects: ApiProject[] }
          error: unknown
        }>("/projects")

        if (!response.success) {
          throw new Error("Failed to fetch projects")
        }

        if (!isMounted) return

        const mappedProjects: Project[] = response.data.projects.map((project) => ({
          id: project.id,
          name: project.name,
          slug: project.slug,
          sources: [],
          messages: [],
        }))

        setProjects(mappedProjects)
        setActiveProjectId((prev) => prev ?? mappedProjects[0]?.id ?? null)
      } catch (error) {
        if (!isMounted) return
        if (error instanceof ApiClientError) {
          setProjectsError(error.message)
        } else {
          setProjectsError("Failed to load projects.")
        }
      } finally {
        if (isMounted) {
          setProjectsLoading(false)
        }
      }
    }

    void loadProjects()

    return () => {
      isMounted = false
    }
  }, [isAuthenticated])

  async function handleCreateProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = newProjectName.trim()
    if (!trimmed) return

    setProjectsError(null)

    try {
      const response = await post<{
        success: boolean
        data: { project: ApiProject }
        error: unknown
      }, { name: string }>("/projects", { name: trimmed })

      if (!response.success) {
        throw new Error("Failed to create project")
      }

      const project: Project = {
        id: response.data.project.id,
        name: response.data.project.name,
        slug: response.data.project.slug,
        sources: [],
        messages: [],
      }

      setProjects((prev) => [project, ...prev])
      setActiveProjectId(project.id)
      setNewProjectName("")
    } catch (error) {
      if (error instanceof ApiClientError) {
        setProjectsError(error.message)
      } else {
        setProjectsError("Failed to create project.")
      }
    }
  }

  function updateProject(id: string, updater: (project: Project) => Project) {
    setProjects((prev) => prev.map((p) => (p.id === id ? updater(p) : p)))
  }

  async function handleAddTextSource(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!activeProject || !newTextContent.trim()) return

    setSourceLoading(true)
    setSourceError(null)

    try {
      const payload = {
        type: SourceType.TEXT,
        title: newTextTitle.trim() || "Untitled note",
        metadata: {
          rawText: newTextContent.trim(),
        },
      }

      const response = await post<{ sourceId: string; status: string }, typeof payload>(
        `/projects/${activeProject.id}/sources`,
        payload,
      )

      const source: Source = {
        id: response.sourceId || createId("src"),
        type: SourceType.TEXT,
        title: payload.title,
        content: newTextContent.trim(),
        createdAt: new Date().toISOString(),
      }

      updateProject(activeProject.id, (p) => ({
        ...p,
        sources: [source, ...p.sources],
      }))

      setNewTextTitle("")
      setNewTextContent("")
    } catch (error) {
      if (error instanceof ApiClientError) {
        setSourceError(error.message)
      } else {
        setSourceError("Failed to add text source.")
      }
    } finally {
      setSourceLoading(false)
    }
  }

  async function handleAddYoutubeSource(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!activeProject || !ytUrl.trim()) return

    setSourceLoading(true)
    setSourceError(null)

    try {
      const payload = {
        type: SourceType.YOUTUBE,
        title: ytTitle.trim() || "YouTube video",
        externalRef: ytUrl.trim(),
      }

      const response = await post<{ sourceId: string; status: string }, typeof payload>(
        `/projects/${activeProject.id}/sources`,
        payload,
      )

      const source: Source = {
        id: response.sourceId || createId("src"),
        type: SourceType.YOUTUBE,
        title: payload.title,
        content: payload.externalRef,
        createdAt: new Date().toISOString(),
      }

      updateProject(activeProject.id, (p) => ({
        ...p,
        sources: [source, ...p.sources],
      }))

      setYtTitle("")
      setYtUrl("")
    } catch (error) {
      if (error instanceof ApiClientError) {
        setSourceError(error.message)
      } else {
        setSourceError("Failed to add YouTube source.")
      }
    } finally {
      setSourceLoading(false)
    }
  }

  async function handleAskQuestion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!activeProject || !question.trim()) return

    const trimmed = question.trim()
    setChatError(null)

    const userMessage: ChatMessage = {
      id: createId("msg"),
      from: "user",
      text: trimmed,
      createdAt: new Date().toISOString(),
    }

    updateProject(activeProject.id, (p) => ({
      ...p,
      messages: [...p.messages, userMessage],
    }))

    setQuestion("")
    setChatLoading(true)

    try {
      const response = await post<{ answer: string; sources: unknown[] }, { query: string }>(
        `/projects/${activeProject.id}/chat`,
        { query: trimmed },
      )

      const assistantMessage: ChatMessage = {
        id: createId("msg"),
        from: "assistant",
        text: response.answer,
        createdAt: new Date().toISOString(),
      }

      updateProject(activeProject.id, (p) => ({
        ...p,
        messages: [...p.messages, assistantMessage],
      }))
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : "Failed to get answer from backend."
      setChatError(message)

      const assistantMessage: ChatMessage = {
        id: createId("msg"),
        from: "assistant",
        text: `I couldn't complete your request right now. ${message}`,
        createdAt: new Date().toISOString(),
      }

      updateProject(activeProject.id, (p) => ({
        ...p,
        messages: [...p.messages, assistantMessage],
      }))
    } finally {
      setChatLoading(false)
    }
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
              disabled={authLoading}
              className="mt-2 w-full rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-50 shadow-sm transition hover:bg-slate-800"
            >
              {authLoading
                ? "Please wait..."
                : authMode === "login"
                ? "Enter MyBrain"
                : "Create MyBrain account"}
            </button>

            {authError && (
              <p className="text-xs text-red-600">{authError}</p>
            )}
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
            {projectsLoading ? (
              <p className="text-xs text-slate-400">
                Loading projects...
              </p>
            ) : projects.length === 0 ? (
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

            {projectsError && (
              <p className="pt-1 text-xs text-red-600">{projectsError}</p>
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
                        disabled={sourceLoading}
                        className="rounded-2xl bg-slate-900 px-4 py-1.5 text-xs font-semibold text-slate-50 hover:bg-slate-800"
                      >
                        {sourceLoading ? "Saving..." : "Add note to knowledge"}
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
                        disabled={sourceLoading}
                        className="rounded-2xl bg-slate-900 px-4 py-1.5 text-xs font-semibold text-slate-50 hover:bg-slate-800"
                      >
                        {sourceLoading ? "Saving..." : "Save YouTube link"}
                      </button>
                    </form>
                  </section>
                </div>

                {sourceError && (
                  <p className="mt-3 text-xs text-red-600">{sourceError}</p>
                )}

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
                              {s.type === SourceType.TEXT ? "Text note" : "YouTube link"}
                            </p>
                          </div>
                          {s.type === SourceType.YOUTUBE && (
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
                  {chatError && (
                    <p className="mb-2 text-xs text-red-600">{chatError}</p>
                  )}

                  <div className="flex items-end gap-2 rounded-3xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200 focus-within:ring-slate-400">
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask a question based on this project’s saved knowledge..."
                      className="max-h-28 min-h-[44px] flex-1 resize-none bg-transparent text-xs outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!question.trim() || chatLoading}
                      className="mb-1 inline-flex items-center justify-center rounded-2xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-50 disabled:opacity-40"
                    >
                      {chatLoading ? "Thinking..." : "Send"}
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