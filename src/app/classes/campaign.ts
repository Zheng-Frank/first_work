import { CallLog } from "./call-log";
import { LeadFunnel } from "./lead-funnel";

export class Campaign {
    type: 'CALL' | 'POSTCARD' | 'EMAIL';
    funnel: LeadFunnel;
    username?: string;
    createdAt?: Date;
    scheduledAt?: Date;
    logs?: CallLog[];
}