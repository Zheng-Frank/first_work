import { Action } from "./action";

export class ActionCancel extends Action {
    constructor(action: any) {
        super(action);
    }
    perform() {
        return Promise.resolve('cancel');
    }
}
