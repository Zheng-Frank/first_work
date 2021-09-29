export class Channel {
    index?: number;
    type: 'Email' | 'Phone' | 'SMS' | 'Fax';
    value: string;
    language: string;
    notifications?: string[];
}
