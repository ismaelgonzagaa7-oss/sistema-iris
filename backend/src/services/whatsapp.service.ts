import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { WhatsAppMessageStatus, WhatsAppMessageType } from "@prisma/client";

interface SendTextParams {
  to: string;
  body: string;
  type: WhatsAppMessageType;
  appointmentId?: string;
}

interface WhatsAppApiResponse {
  error?: {
    message?: string;
  };
  messages?: Array<{
    id?: string;
  }>;
}

/**
 * Camada de serviço para a WhatsApp Business Platform / Cloud API (Meta).
 * Nunca usa QR Code / WhatsApp Web. Credenciais vêm exclusivamente de variáveis de ambiente.
 */
export class WhatsAppService {
  private baseUrl(): string {
    return `https://graph.facebook.com/${env.whatsapp.apiVersion}/${env.whatsapp.phoneNumberId}/messages`;
  }

  private isConfigured(): boolean {
    return Boolean(
      env.whatsapp.accessToken && env.whatsapp.phoneNumberId
    );
  }

  /**
   * Envia uma mensagem de texto livre. Só funciona dentro da janela de 24h
   * de uma conversa iniciada pelo cliente, ou use templates aprovados
   * (sendTemplate) fora dela.
   */
  async sendText({
    to,
    body,
    type,
    appointmentId,
  }: SendTextParams) {
    const record = await prisma.whatsAppMessage.create({
      data: {
        appointmentId,
        recipientPhone: to,
        type,
        content: body,
        status: WhatsAppMessageStatus.PENDENTE,
      },
    });

    if (!env.whatsapp.notificationsEnabled) {
      await prisma.whatsAppMessage.update({
        where: { id: record.id },
        data: {
          status: WhatsAppMessageStatus.PENDENTE,
          errorMessage:
            "Notificações desativadas em configurações.",
        },
      });

      return record;
    }

    if (!this.isConfigured()) {
      await prisma.whatsAppMessage.update({
        where: { id: record.id },
        data: {
          status: WhatsAppMessageStatus.ERRO,
          errorMessage:
            "WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID não configurados.",
        },
      });

      return record;
    }

    try {
      await prisma.whatsAppMessage.update({
        where: { id: record.id },
        data: {
          status: WhatsAppMessageStatus.ENVIANDO,
          attempts: {
            increment: 1,
          },
        },
      });

      const response = await fetch(this.baseUrl(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.whatsapp.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: {
            body,
          },
        }),
      });

      const data =
        (await response.json()) as WhatsAppApiResponse;

      if (!response.ok) {
        const errorMessage =
          data?.error?.message ||
          "Erro ao enviar mensagem pelo WhatsApp.";

        await prisma.whatsAppMessage.update({
          where: { id: record.id },
          data: {
            status: WhatsAppMessageStatus.ERRO,
            errorMessage,
          },
        });

        return record;
      }

      const metaMessageId =
        data?.messages?.[0]?.id;

      await prisma.whatsAppMessage.update({
        where: { id: record.id },
        data: {
          status: WhatsAppMessageStatus.ENVIADA,
          metaMessageId,
        },
      });

      return record;
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Erro desconhecido.";

      return prisma.whatsAppMessage.update({
        where: { id: record.id },
        data: {
          status: WhatsAppMessageStatus.ERRO,
          errorMessage,
        },
      });
    }
  }

  buildNewAppointmentMessage(data: {
    clientName: string;
    companyName?: string | null;
    serviceName: string;
    sectorName: string;
    dateStr: string;
    timeStr: string;
    modality: string;
    status: string;
    notes?: string | null;
  }): string {
    return [
      "🤖 ÍRIS — NOVO AGENDAMENTO",
      "",
      `👤 Cliente: ${data.clientName}`,
      `🏢 Empresa: ${data.companyName || "-"}`,
      `📄 Serviço: ${data.serviceName}`,
      `🏷️ Setor: ${data.sectorName}`,
      `📅 Data: ${data.dateStr}`,
      `🕐 Horário: ${data.timeStr}`,
      `💻 Modalidade: ${data.modality}`,
      `📌 Status: ${data.status}`,
      "",
      "📝 Observação:",
      data.notes || "-",
    ].join("\n");
  }

  buildCancelMessage(data: {
    clientName: string;
    serviceName: string;
    dateStr: string;
    timeStr: string;
    reason?: string | null;
  }): string {
    return [
      "❌ ÍRIS — AGENDAMENTO CANCELADO",
      "",
      `👤 Cliente: ${data.clientName}`,
      `📄 Serviço: ${data.serviceName}`,
      `📅 Data: ${data.dateStr}`,
      `🕐 Horário: ${data.timeStr}`,
      "",
      "Motivo:",
      data.reason || "-",
    ].join("\n");
  }

  buildRescheduleMessage(data: {
    clientName: string;
    dateStr: string;
    timeStr: string;
    serviceName: string;
    modality: string;
  }): string {
    return [
      "🔄 ÍRIS — AGENDAMENTO REAGENDADO",
      "",
      `👤 Cliente: ${data.clientName}`,
      `📅 Nova data: ${data.dateStr}`,
      `🕐 Novo horário: ${data.timeStr}`,
      `📄 Serviço: ${data.serviceName}`,
      `💻 Modalidade: ${data.modality}`,
    ].join("\n");
  }
}

export const whatsAppService =
  new WhatsAppService();
