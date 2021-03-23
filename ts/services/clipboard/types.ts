export interface ClipboardServiceInterface {
    copy: (text: string) => Promise<void>
}
