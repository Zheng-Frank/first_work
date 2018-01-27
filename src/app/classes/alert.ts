import { AlertType } from './alert-type';

export interface Alert {
    type: AlertType;
    text: string;
    timeout: number;
}
