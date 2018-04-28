import { AlertType } from './alert-type';

export interface NotificationSettings {
    emails: string[];
    phones: string[];
    sms: string[];
}

export interface GmbItem {
    name: string;
    address: string;
    lastScanned: Date;
    lastScanResult: boolean;

}

export interface GmbWatch {
    notificationSettings: NotificationSettings;
    list: GmbItem[];
    scanIntervalInSecond: number;
    enabled: boolean;
}
