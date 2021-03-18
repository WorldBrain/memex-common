export function firebaseService<Service>(prefix: string, executeCall: (name: string, params: any) => Promise<any>) {
    return new Proxy({}, {
        get: (_, key: string) => {
            return (params: any) => executeCall(`${prefix}-${key}`, params)
        }
    }) as Service
}
