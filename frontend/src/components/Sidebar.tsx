import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/", label: "Dashboard", icon: "🏠" },
  { to: "/agenda", label: "Agenda", icon: "📅" },
  { to: "/clientes", label: "Clientes", icon: "👥" },
];

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="hidden md:flex md:flex-col w-64 bg-iris-dark text-white min-h-screen p-4">
      <div className="mb-8 px-2">
        <h1 className="text-xl font-bold tracking-wide">ÍRIS</h1>
        <p className="text-xs text-slate-300">Sistema de Agendamento e Automação</p>
      </div>

      <nav className="flex-1 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                isActive ? "bg-iris-blue text-white" : "text-slate-300 hover:bg-white/10"
              }`
            }
          >
            <span>{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="pt-4 border-t border-white/10 text-sm">
        <p className="text-slate-300">{user?.name}</p>
        <p className="text-xs text-slate-400">{user?.role}</p>
        <button onClick={logout} className="mt-3 text-xs text-iris-gold hover:underline">
          Sair
        </button>
      </div>
    </aside>
  );
}
