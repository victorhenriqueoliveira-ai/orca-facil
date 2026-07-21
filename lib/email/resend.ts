import { Resend } from "resend";
import { buildTrialReminderHtml, type TrialReminderData } from "./templates/trial-reminder";

export interface SendTrialReminderParams {
  to: string;
  data: TrialReminderData;
}

export interface SendTrialReminderResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Cria um cliente Resend usando a variável de ambiente RESEND_API_KEY.
 * Exportada para permitir mock nos testes.
 */
export function createResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }
  return new Resend(apiKey);
}

/**
 * Envia o e-mail de reengajamento de trial via Resend.
 * Retorna um resultado tipado com sucesso/erro para evitar que exceções não tratadas
 * interrompam o processamento em lote do cron job.
 */
export async function sendTrialReminder(
  to: string,
  data: TrialReminderData
): Promise<SendTrialReminderResult> {
  try {
    const resend = createResendClient();
    const name = data.business_name ?? "Marceneiro";

    const { data: resendData, error } = await resend.emails.send({
      from: "Orça Fácil <noreply@orcafacil.com.br>",
      to,
      subject: `${name}, seu trial expira em breve — assine agora`,
      html: buildTrialReminderHtml(data),
    });

    if (error) {
      return {
        success: false,
        error: `Resend API error: ${error.message}`,
      };
    }

    return {
      success: true,
      id: resendData?.id,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: message,
    };
  }
}
