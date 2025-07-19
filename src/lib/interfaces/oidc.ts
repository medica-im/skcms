interface User {
    name: string,
    email: string,
    image: string
}

export interface OauthSession {
    user: User,
    expires: string
}