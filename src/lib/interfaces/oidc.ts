interface User {
    name: string,
    email: string,
    providerAccountId: string,
    provider: string,
    image?: string
}

export interface OauthSession {
    user: User,
    expires: string
}