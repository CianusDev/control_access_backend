import 'dotenv/config';
import { EmailParams, Recipient } from "mailersend";
import { mailerSend } from "../config/email";

/**
 * Envoie un email simple à un destinataire unique.
 * @param toEmail - L'adresse email du destinataire.
 * @param subject - Le sujet de l'email.
 * @param htmlBody - Le corps de l'email en HTML.
 * @param senderName - Nom de l'expéditeur (optionnel, utilise celui par défaut si non fourni).
 * @param senderEmail - Email de l'expéditeur (optionnel, utilise celui par défaut si non fourni).
 */
export async function sendEmail(
    toEmail: string,
    subject: string,
    htmlBody: string,
    senderName?: string,
    senderEmail?: string,
): Promise<void> {
    try {
        const recipients = [new Recipient(toEmail)];

        // Utilise la configuration par défaut si senderName ou senderEmail ne sont pas fournis
        const finalSenderEmail = senderEmail || process.env.SMTP_USER;
        const finalSenderName = senderName || process.env.SMTP_NAME;

        if (!finalSenderEmail || !finalSenderName) {
             throw new Error('Sender email or name is not configured.');
        }

         // MailerSend API key est déjà gérée dans le fichier de config, pas besoin de la passer ici
        const mailerSendConfig = mailerSend; // Réutilise l'instance mailerSend configurée

        const emailParams = new EmailParams()
            .setFrom({
                 email: finalSenderEmail,
                 name: finalSenderName,
             })
            .setTo(recipients)
            .setReplyTo({
                email: finalSenderEmail,
                name: finalSenderName,
            })
            .setSubject(subject)
            .setHtml(htmlBody);

        await mailerSendConfig.email.send(emailParams);
        console.log(`✅ Email envoyé avec succès à ${toEmail}`);

    } catch (error) {
        console.error(`❌ Erreur lors de l'envoi de l'email à ${toEmail} :`, error);
        // Propage l'erreur après logging
        throw new Error(`Failed to send email to ${toEmail}: ${error instanceof Error ? error.message : String(error)}`);
    }
} 