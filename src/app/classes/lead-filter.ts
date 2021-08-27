export interface LeadFilter {
    field: string;
    operator: string; // '$gt' | '$lt' | '$eq' | '$gte' | '$lte' | '$in' | '$nin' | '$ne';
    value: any;
    comment?: string;
}