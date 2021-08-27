import { LeadFilter } from "./lead-filter";

export interface LeadFunnelAnalysis {
    count: number;
    ratio?: number;
    filter?: LeadFilter
}