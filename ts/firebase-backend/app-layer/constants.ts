import { FirebaseApplicationLayer } from "./types";

export const APPLICATION_LAYER_METHOD_NAMES: { [methodName in keyof FirebaseApplicationLayer]: boolean } = {
    executeStorageModuleOperation: true
}