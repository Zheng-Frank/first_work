import { Action } from "./action";

export class ActionClose extends Action {
    constructor(action: any) {
        super(action);
    }
    perform() {
        alert('closed')
        return Promise.resolve('close');
    }
}
