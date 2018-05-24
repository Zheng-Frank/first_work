export class PostcardAction {
    time: Date;
    action: 'Requested' | 'Notified' | 'Handled';
    result?: any;

    constructor(pc?: any) {
        if (pc) {
            this.time = new Date(pc.time);
            this.action = pc.action;
            this.result = pc.result;
        }
    }
}
