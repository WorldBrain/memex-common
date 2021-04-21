import { FirebaseApplicationLayer } from "./types";
import { APPLICATION_LAYER_METHOD_NAMES } from "./constants";

type ExecuteCall = (name: string, args: any) => Promise<any>;

export function createClientApplicationLayer(executeCall: ExecuteCall): FirebaseApplicationLayer {
    const layer: { [methodName: string]: (args: any) => Promise<any> } = {}
    for (const methodName of Object.keys(APPLICATION_LAYER_METHOD_NAMES)) {
        layer[methodName] = createMethod(executeCall, methodName)
    }
    return layer as any
}

function createMethod(executeCall: ExecuteCall, methodName: string) {
    return (methodArgs: any) => executeCall('applicationLayer', { methodName, methodArgs })
}
