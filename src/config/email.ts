import 'dotenv/config';
import dotenv from 'dotenv';
dotenv.config();

import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";

// Vérification des variables d'environnement pour MailerSend
if (!process.env.SMTP_API_KEY || !process.env.SMTP_USER || !process.env.SMTP_NAME) {
    throw new Error('Missing environment variables for MailerSend (SMTP_API_KEY, SMTP_USER, SMTP_NAME)');
}

export const mailerSend = new MailerSend({
  apiKey: process.env.SMTP_API_KEY!,
});

const sentFrom = new Sender(process.env.SMTP_USER!, process.env.SMTP_NAME!);

export async function senderEmail(
    personalization: {
        email: string;
        data: {
            firstname?: string;
            lastname?: string;
            username: string;
            subject: string;
            [key: string]: any;
        };
    }[],
    setSubject?: string,
    setHtml?: string,
) {
    try {
        const recipients = personalization.map(({ email, data }) => {
            const name = (data.firstname && data.lastname) ? `${data.firstname} ${data.lastname}` : data.username;
            return new Recipient(email, name);
        });

        const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setReplyTo(sentFrom)
        .setPersonalization(personalization)
        .setSubject(setSubject || "{{ subject }}")
        .setHtml(setHtml || "This is the HTML content, {{ test }}"); // Note: Default HTML is a placeholder, consider using templates or providing dynamic content

        await mailerSend.email.send(emailParams);

    }catch (error) {
        console.error('❌ Erreur lors de l\'envoi de l\'email :', error);
        // Propage l'erreur pour que le code appelant puisse la gérer
        throw new Error(`Failed to send email: ${error instanceof Error ? error.message : String(error)}`);
    }
}
