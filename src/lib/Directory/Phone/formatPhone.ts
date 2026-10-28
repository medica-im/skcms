const nb = ' ';

export function formatPhone(phone: string): string {
	const compact = phone.replace(/[\s.\-]/g, '');
	const national = compact.match(/^0(\d{9})$/);
	if (national) return compact.match(/\d{2}/g)!.join(nb);
	const international = compact.match(/^\+33(\d)(\d{8})$/);
	if (international) return ['+33', international[1], ...international[2].match(/\d{2}/g)!].join(nb);
	return phone;
}
