interface User {
    name: string,
    email: string,
    userId: string,
    provider: string,
    image?: string
}

export interface OauthSession {
    user: User,
    expires: string
}