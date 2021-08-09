export class Channel {
    index?: number;
    type: 'Email' | 'Phone' | 'SMS' | 'Fax';
    value: string;
    orderNotifyLanguage: string;
    notifications?: string[];
}
