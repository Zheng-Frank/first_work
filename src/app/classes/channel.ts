export class Channel {
    index?: number;
    type: 'Email' | 'Voice' | 'SMS' | 'Fax';
    value: string;
    notifications?: string[];
}
