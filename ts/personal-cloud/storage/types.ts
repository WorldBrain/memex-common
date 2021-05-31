export enum PersonalDeviceType {
    Mobile = 'mobile',
    DesktopBrowser = 'desktop-browser',
}
export enum PersonalDeviceOs {
    Android = 'android',
    IOS = 'ios',
    Linux = 'linux',
    Windows = 'windows',
    MacOS = 'macos',
}
export enum PersonalDeviceBrowser {
    Firefox = 'firefox',
    Chrome = 'chrome',
    Edge = 'edge',
    Brave = 'brave',
    Vivaldi = 'vivaldi',
}
export enum PersonalDeviceProduct {
    Extension = 'extension',
    MobileApp = 'mobile-app',
    WebUI = 'web-ui',
}
export enum DataChangeType {
    Create = 'create',
    Modify = 'modify',
    Delete = 'delete'
}
export enum ContentLocatorType {
    Local = 'local',
    Remote = 'remote',
    MemexCloud = 'memex-cloud',
}
export enum ContentLocatorFormat {
    HTML = 'html',
    PDF = 'pdf',
    EPUB = 'epub',
    TXT = 'txt',
    SpotifyLink = 'spotify-link',
    HtmlSnapshot = 'html-snapshot',
}

export enum LocationSchemeType {
    NormalizedUrlV1 = 'normalized-url-v1',
    FilesystemPathV1 = 'filesystem-path-v1',
}

// We don't explicitly use this type in code, but these
// are the prefixes we use for our fingerprint URIs
export enum FingerprintScheme7Type {
    PdfV1 = 'x-pdf-v1'
}
