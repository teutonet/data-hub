import axios from 'axios';
import { SMTP } from './urls';

export interface Message {
	Attachments: number;
	Bcc: Array<{
		Address: string;
		Name: string;
	}>;
	Cc: Array<{
		Address: string;
		Name: string;
	}>;
	Created: string;
	From: {
		Address: string;
		Name: string;
	};
	ID: string;
	MessageID: string;
	Read: boolean;
	ReplyTo: Array<{
		Address: string;
		Name: string;
	}>;
	Size: number;
	Snippet: string;
	Subject: string;
	Tags: Array<string>;
	To: Array<{
		Address: string;
		Name: string;
	}>;
	Username: string;
}

export interface MessageDetail extends Message {
	Text: string;
	HTML: string;
}

export interface Messages {
	messages: Array<Message>;
	messages_count: number;
	messages_unread: number;
	start: number;
	tags: Array<string>;
	total: number;
	unread: number;
}

const SMTP_USER = 'admin';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;

export async function searchByEmailAndSubject(email: string, subject: string) {
	return (
		await axios.get<Messages>(`${SMTP}api/v1/search`, {
			params: {
				query: `to: ${email} subject: "${subject}"`
			},
			auth: {
				username: SMTP_USER,
				password: SMTP_PASSWORD
			},
			headers: {
				accept: 'application/json'
			}
		})
	).data;
}

export async function getEmailById(id: string) {
	return (
		await axios.get<MessageDetail>(`${SMTP}api/v1/message/${id}`, {
			auth: {
				username: SMTP_USER,
				password: SMTP_PASSWORD
			},
			headers: {
				accept: 'application/json'
			}
		})
	).data;
}
