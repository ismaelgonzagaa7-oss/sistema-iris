import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { Appointment, Client, Sector, Service } from "../types";
import { Layout } from "../components/Layout";
import { StatusBadge } from "../components/StatusBadge";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm = {
  clientId: "",
  sectorId: "",
  serviceId: "",
  modality: "VIDEOCONFERENCIA" as "VIDEOCONFERENCIA" | "PRESENCIAL",
  date: todayISO(),
  time: "09:00",
  notes: "",
};

export function Agenda() {
  const [date, setDate] = useState(todayISO());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadAppointments(d: string) {
    const { data } = await api.get("/appointments", { params: { date: d } });
    setAppointments(data);
  }

  useEffect(() => {
    loadAppointments(date);
  }, [date]);

  useEffect(() => {
    api.get("/clients").then((r) => setClients(r.data));
    api.get("/sectors").then((r) => setSectors(r.data));
  }, []);

  useEffect(() => {
    if (form.sectorId) {
      api.get("/services", { params: { sectorId: form.sectorId } }).then((r) => setServices(r.data));
    } else {
      setServices([]);
    }
  }, [form.sectorId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const scheduledAt = new Date(`${form.date}T${form.time}:00`).toISOString();
      await api.post("/appointments", {
        clientId: form.clientId,
        sectorId: form.sectorId,
        serviceId: form.serviceId,
        modality: form.modality,
        scheduledAt,
        notes: form.notes || undefined,
      });
      setForm(emptyForm);
      setShowForm(false);
      loadAppointments(date);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Erro ao salvar agendamento.");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm(id: string) {
    await api.post(`/appointments/${id}/confirm`);
    loadAppointments(date);
  }

  async function handleComplete(id: string) {
    await api.post(`/appointments/${id}/complete`);
    loadAppointments(date);
  }

  async function handleCancel(id: string) {
    const reason = window.prompt("Motivo do cancelamento (opcional):") || undefined;
    await api.post(`/appointments/${id}/cancel`, { reason });
    loadAppointments(date);
  }

  async function handleReschedule(id: string) {
    const newDate = window.prompt("Nova data (AAAA-MM-DD):");
    const newTime = window.prompt("Novo horário (HH:MM):");
    if (!newDate || !newTime) return;
    const scheduledAt = new Date(`${newDate}T${newTime}:00`).toISOString();
    await api.post(`/appointments/${id}/reschedule`, { scheduledAt });
    loadAppointments(date);
  }

  return (
    <Layout>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-iris-dark">Agenda</h2>
          <p className="text-sm text-slate-500">Agendamentos por dia</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={() => setShowForm((s) => !s)}
            className="bg-iris-blue text-white px-4 py-2 rounded-lg text-sm hover:bg-iris-dark transition"
          >
            {showForm ? "Fechar" : "+ Novo agendamento"}
          </button>
        </div>
      </header>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <select required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm">
            <option value="">Selecione o cliente</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </select>

          <select required value={form.sectorId} onChange={(e) => setForm({ ...form, sectorId: e.target.value, serviceId: "" })}
            className="border rounded-lg px-3 py-2 text-sm">
            <option value="">Selecione o setor</option>
            {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <select required value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" disabled={!form.sectorId}>
            <option value="">Selecione o serviço</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" />
          <input required type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" />

          <select value={form.modality} onChange={(e) => setForm({ ...form, modality: e.target.value as any })}
            className="border rounded-lg px-3 py-2 text-sm">
            <option value="VIDEOCONFERENCIA">Videoconferência</option>
            <option value="PRESENCIAL">Presencial</option>
          </select>

          <input placeholder="Observação" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm md:col-span-3" />

          {error && <p className="text-sm text-red-600 md:col-span-3">{error}</p>}

          <div className="md:col-span-3">
            <button type="submit" disabled={saving}
              className="bg-iris-blue text-white px-4 py-2 rounded-lg text-sm hover:bg-iris-dark transition disabled:opacity-60">
              {saving ? "Salvando..." : "Salvar agendamento"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-100">
        {appointments.length === 0 && <p className="p-5 text-sm text-slate-500">Nenhum agendamento neste dia.</p>}
        {appointments.map((a) => (
          <div key={a.id} className="px-5 py-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium w-16">
              {new Date(a.scheduledAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="min-w-[150px]">{a.client.fullName}</span>
            <span className="text-slate-500 min-w-[160px]">{a.service.name}</span>
            <span className="text-slate-500 w-32">{a.sector.name}</span>
            <StatusBadge status={a.status} />
            <div className="ml-auto flex gap-2 text-xs">
              <button onClick={() => handleConfirm(a.id)} className="text-emerald-600 hover:underline">Confirmar</button>
              <button onClick={() => handleComplete(a.id)} className="text-slate-600 hover:underline">Realizado</button>
              <button onClick={() => handleReschedule(a.id)} className="text-purple-600 hover:underline">Reagendar</button>
              <button onClick={() => handleCancel(a.id)} className="text-red-600 hover:underline">Cancelar</button>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
