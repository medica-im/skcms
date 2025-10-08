export interface Appointment {
    uid: string,
    entry: string,
    url: string|null,
    phone: string|null,
    location: 'house_call'|'office'|null
}