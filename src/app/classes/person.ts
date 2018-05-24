import { Channel } from './channel';
export class Person {
    index?: number;
    title: string;
    name: string;
    roles: string[];    // owner, manager, employee
    channels?: Channel[];
}
