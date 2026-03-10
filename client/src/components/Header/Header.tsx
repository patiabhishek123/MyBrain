import { Link } from "react-router-dom"

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/Logodesign.png"
            alt="MyBrain logo"
            className="h-9 w-9 rounded-xl border border-slate-200 bg-slate-50 object-contain"
          />
          <div className="leading-tight">
            <div className="text-sm font-semibold text-slate-900">
              MyBrain
            </div>
            <p className="text-[10px] text-slate-500">
              A tiny second brain for each topic.
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="hidden sm:inline">
            Built with React + Tailwind
          </span>
        </div>
      </nav>
    </header>
  )
}

