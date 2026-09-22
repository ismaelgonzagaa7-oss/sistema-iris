import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { Client } from "../types";
import { Layout } from "../components/Layout";

const emptyForm = {
  fullName: "",
  documentId: "",
  personType: "PF" as "PF" | "PJ",
  companyName: "",
  phone: "",
  whatsapp: "",
  email: "",
  notes: "",
};

export function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load(q?: string) {
    const { data } = await api.get("/clients", { params: q ? { q } : {} });
    setClients(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    load(search);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/clients", form);
      setForm(emptyForm);
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-iris-dark">Clientes</h2>
          <p className="text-sm text-slate-500">Cadastro e pesquisa de clientes</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-iris-blue text-white px-4 py-2 rounded-lg text-sm hover:bg-iris-dark transition"
        >
          {showForm ? "Fechar" : "+ Novo cliente"}
        </button>
      </header>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input required placeholder="Nome completo" value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="CPF/CNPJ" value={form.documentId}
            onChange={(e) => setForm({ ...form, documentId: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" />
          <select value={form.personType}
            onChange={(e) => setForm({ ...form, personType: e.target.value as "PF" | "PJ" })}
            className="border rounded-lg px-3 py-2 text-sm">
            <option value="PF">Pessoa Física</option>
            <option value="PJ">Pessoa Jurídica</option>
          </select>
          <input placeholder="Empresa (opcional para PF)" value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Telefone" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="WhatsApp" value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="E-mail" type="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Observações" value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm md:col-span-2" />

          <div className="md:col-span-2">
            <button type="submit" disabled={saving}
              className="bg-iris-blue text-white px-4 py-2 rounded-lg text-sm hover:bg-iris-dark transition disabled:opacity-60">
              {saving ? "Salvando..." : "Salvar cliente"}
            </button>
          </div>
        </form>
      )}

      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          placeholder="Pesquisar por nome, CPF/CNPJ, telefone ou empresa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        />
        <button type="submit" className="border rounded-lg px-4 py-2 text-sm hover:bg-slate-100">
          Buscar
        </button>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-100">
        {clients.length === 0 && <p className="p-5 text-sm text-slate-500">Nenhum cliente encontrado.</p>}
        {clients.map((c) => (
          <div key={c.id} className="px-5 py-3 flex flex-wrap gap-3 text-sm items-center">
            <span className="font-medium min-w-[180px]">{c.fullName}</span>
            <span className="text-slate-500 min-w-[130px]">{c.documentId || "-"}</span>
            <span className="text-slate-500 min-w-[150px]">{c.companyName || "-"}</span>
            <span className="text-slate-500 min-w-[130px]">{c.whatsapp || c.phone || "-"}</span>
            <span className="text-slate-500">{c.email || "-"}</span>
          </div>
        ))}
      </div>
    </Layout>
  );
}
