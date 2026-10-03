import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  Bone, Home, Stethoscope, Brain, BarChart3, FlaskConical,
  BookOpen, Github, HeartPulse, MessageSquare, ScanSearch,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/diagnosis', label: 'Diagnosis', icon: Stethoscope },
  { to: '/models', label: 'Models', icon: Brain },
  { to: '/benchmark', label: 'Benchmark', icon: BarChart3 },
  { to: '/demo', label: 'Prediction', icon: FlaskConical },
  { to: '/treatment', label: 'Treatment', icon: HeartPulse },
  { to: '/consultation', label: 'AI Doctor', icon: MessageSquare },
  { to: '/explainability', label: 'Grad-CAM', icon: ScanSearch },
  { to: '/docs', label: 'Docs', icon: BookOpen },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5 transition-transform hover:scale-[1.02]">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-cyan-600 shadow-lg shadow-sky-500/20">
              <Bone className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="text-sm font-bold tracking-tight">Bone Fracture AI</span>
              <span className="ml-1.5 text-xs text-slate-500">v3.0</span>
            </div>
          </Link>

          {/* Desktop nav — scrollable */}
          <nav className="flex items-center gap-0.5 overflow-x-auto sm:gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all sm:px-3 ${
                    isActive
                      ? 'bg-sky-500/15 text-sky-300'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden lg:inline">{label}</span>
              </NavLink>
            ))}
          </nav>

          <a
            href="https://github.com/parasasulochana4/Bone-Fracture-AI-System"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-lg border border-slate-800 px-3 py-1.5 text-sm text-slate-400 transition-colors hover:border-slate-700 hover:text-slate-200 sm:flex"
          >
            <Github className="h-4 w-4" />
            <span>GitHub</span>
          </a>
        </div>
      </header>

      {/* Page content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-cyan-600">
                <Bone className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm text-slate-400">
                Bone Fracture AI Detection System — Deep Learning X-ray Analysis
              </span>
            </div>
            <span className="text-xs text-slate-600">
              For research and educational purposes only. Not for clinical use.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
