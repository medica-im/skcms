import { browser } from "$app/environment"

export function setLocalStorage(key: string, data: any): void {
    if (browser) {
        var json = { data: data, cachetime: Date.now() }
        localStorage.setItem(key, JSON.stringify(json))
    }
}
interface LocalStorage {
    data: any,
    cachetime: number
}

export function getLocalStorage(key: string): LocalStorage | null | undefined {
    if (browser) {
        const localStorageString = localStorage.getItem(key);
        if (localStorageString === null) {
            return null
        }
        let data: LocalStorage = JSON.parse(localStorageString);
        return data;
    }
}
