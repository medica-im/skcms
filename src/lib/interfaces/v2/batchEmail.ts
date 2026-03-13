export interface BatchEmailMessage {
	id: number;
	author_uid: string;
	subject: string;
	sent_at: number;
	recipient_uids: string[];
	mailgun_response: Record<string, unknown>;
	success: boolean;
}

export interface BatchEmailMessageDetail extends BatchEmailMessage {
	body: string;
}
