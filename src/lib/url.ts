/** Prefix a root-relative path with the site base (e.g. /dantesinferno on GitHub Pages). */
export const url = (path: string) => import.meta.env.BASE_URL.replace(/\/$/, '') + path;
