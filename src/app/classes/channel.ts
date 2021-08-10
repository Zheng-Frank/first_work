export class Channel {
    index?: number;
    type: 'Email' | 'Phone' | 'SMS' | 'Fax';
    value: string;
    channelLanguage: string;
    notifications?: string[];
}
