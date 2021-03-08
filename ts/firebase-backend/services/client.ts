export function firebaseService<Service>(executeCall: (name: string, params: any) => Promise<any>) {
    return new Proxy({}, {
        get: (_, key: string) => {
            return (params: any) => executeCall(key, params)
        }
    }) as Service
}
