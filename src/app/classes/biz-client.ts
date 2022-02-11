export class BizClient {
  _id: string;
  restaurant: any; // { name: xxxx, _id: xxxx}
  shellVersion?: string; // eg., if it's deployed as an APP
  coreVersion: string; // the version of the PWA
  connections: any[];
  endpoint: string;
  createdAt: Date;
}
