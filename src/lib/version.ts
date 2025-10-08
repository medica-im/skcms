import { version } from '$app/environment';
import { browser } from "$app/environment"

export const checkVersion = () => {
    if (!browser) return
    let localVersion = localStorage.getItem("version");
    console.log(`localVersion: ${localVersion}`);
    console.log(`app version: ${version}`);
    if (!localVersion) {
        console.log("No local version: clearing localstorage...");
        localStorage.clear();
        localStorage.setItem("version", version);
    }
    else if (!(localVersion == version)) {
        console.log(`Local version (${localVersion}) is different from the app version (${version}): clearing localstorage...`);
        localStorage.clear();
        localStorage.setItem("version", version);
    } else {
        console.log(`Local version (${localVersion}) is up to date with app version (${version}): all good!`);
    }
}