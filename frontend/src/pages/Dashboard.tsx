import { useEffect, useState } from "react";
import { api } from "../api/client";
import { DashboardSummary } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { Layout } from "../components/Layout";

const CARD_CONFIG = [
  { key: "today", label: "Agendamentos hoje", icon: "📅" },
  { key: "future", label: "Agendamentos futuros", icon: "🗓️" },
  { key: "completed", label: "Realizados", icon: "✅" },
  { key: "cancelled", label: "Cancelados", icon: "❌" },
  { key: "videoconference", label: "Videoconferências", icon: "💻" },
  { key: "inPerson", label: "Presenciais", icon: "🏢" },
] as const;

export function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/dashboard/summary")
      .then((res) => setSummary(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <header className="mb-6">
        <h2 className="text-2xl font-semibold text-iris-dark">Dashboard</h2>
        <p className="text-sm text-slate-500">Visão geral dos atendimentos</p>
      </header>

      {loading && <p className="text-slate-500">Carregando...</p>}

      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {CARD_CONFIG.map((card) => (
              <div key={card.key} className="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
                <div className="text-xl mb-1">{card.icon}</div>
                <div className="text-2xl font-bold text-iris-dark">
                  {summary.indicators[card.key]}
                </div>
                <div className="text-xs text-slate-500">{card.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-medium text-iris-dark">Agenda de hoje</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {summary.todayAppointments.length === 0 && (
                <p className="p-5 text-sm text-slate-500">Nenhum agendamento para hoje.</p>
              )}
              {summary.todayAppointments.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                  <span className="font-medium w-16">
                    {new Date(a.scheduledAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="flex-1 min-w-[140px]">{a.client.fullName}</span>
                  <span className="text-slate-500 min-w-[140px]">{a.client.companyName || "-"}</span>
                  <span className="text-slate-500 min-w-[160px]">{a.service.name}</span>
                  <span className="text-slate-500 w-32">{a.sector.name}</span>
                  <span className="text-slate-500 w-40">
                    {a.modality === "VIDEOCONFERENCIA" ? "Videoconferência" : "Presencial"}
                  </span>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
