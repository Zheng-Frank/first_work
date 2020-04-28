import { environment } from "src/environments/environment";

export class IvrRecord {
    ctrId: string;
    initiatedAt: Date;
    endedAt?: Date;
    customerEndpoint?: string;
    systemEndpoint?: string;
    queueName?: string;
    queueArn?: string;
    agentUsername?: string;
    recordingLocation?: string;
    recordingMp3?: any;
    recordingMp3Url?: string;
    restaurants: any[] = [];
    inbound: boolean;
    duration?: number;

    shouldCallback;
    public static parse(ctr): IvrRecord {
        const ir = new IvrRecord();
        ir.ctrId = ctr._id;
        ir.initiatedAt = new Date(ctr.InitiationTimestamp);

        if (ctr.DisconnectTimestamp) {
            ir.endedAt = new Date(ctr.DisconnectTimestamp);
            ir.duration = Math.ceil((ir.endedAt.valueOf() - ir.initiatedAt.valueOf()) / 1000);
        }

        if (ctr.CustomerEndpoint && ctr.CustomerEndpoint.Address) {
            ir.customerEndpoint = ctr.CustomerEndpoint.Address.replace("+1", "");
        }

        if (ctr.Queue && ctr.Queue.Name) {
            ir.queueName = ctr.Queue.Name;
        }

        if (ctr.Queue && ctr.Queue.ARN) {
            ir.queueArn = ctr.Queue.ARN;
        }

        if (ctr.Agent && ctr.Agent.Username) {
            ir.agentUsername = ctr.Agent.Username;
        }

        if (ctr.Recording && ctr.Recording.Location) {
            ir.recordingLocation = ctr.Recording.Location;
            const bucket = ir.recordingLocation.substr(0, ir.recordingLocation.indexOf("/")) + "-mp3";
            const objectKey = ir.recordingLocation.substr(ir.recordingLocation.indexOf("/") + 1).replace(".wav", ".mp3");
            ir.recordingMp3Url = `${environment.utilsApiUrl}s3-proxy?bucket=${encodeURIComponent(bucket)}&objectKey=${encodeURIComponent(objectKey)}`;

        }
        if (ctr.SystemEndpoint && ctr.SystemEndpoint.Address) {
            ir.systemEndpoint = ctr.SystemEndpoint.Address.replace("+1", "");
        }

        ir.inbound = ctr.InitiationMethod !== "OUTBOUND";
        return ir;
    }
}


// {
//     "_id": {
//         "$oid": "5e836e195374330009ed8ae6"
//     },
//     "AWSAccountId": "449043523134",
//     "AWSContactTraceRecordFormatVersion": "2017-03-10",
//     "Agent": {
//         "ARN": "arn:aws:connect:us-east-1:449043523134:instance/57cd1483-c833-43d9-95e1-f0f97a7c3b09/agent/1cc79f82-d221-47b8-a181-0774037b4be0",
//         "AfterContactWorkDuration": 10,
//         "AfterContactWorkEndTimestamp": "2020-03-31T16:20:40Z",
//         "AfterContactWorkStartTimestamp": "2020-03-31T16:20:30Z",
//         "AgentInteractionDuration": 14,
//         "ConnectedToAgentTimestamp": "2020-03-31T16:20:16Z",
//         "CustomerHoldDuration": 0,
//         "HierarchyGroups": null,
//         "LongestHoldDuration": 0,
//         "NumberOfHolds": 0,
//         "RoutingProfile": {
//             "ARN": "arn:aws:connect:us-east-1:449043523134:instance/57cd1483-c833-43d9-95e1-f0f97a7c3b09/routing-profile/6d5da656-fbc1-48f1-b440-b0404398d5d2",
//             "Name": "Chinese CSR"
//         },
//         "Username": "garysui"
//     },
//     "AgentConnectionAttempts": 1,
//     "Attributes": {
//         "customerNumber": "+16787990850"
//     },
//     "Channel": "VOICE",
//     "ConnectedToSystemTimestamp": "2020-03-31T16:20:01Z",
//     "ContactId": "ee0a8fcc-9cf8-4b9c-9fcf-e86ebe989486",
//     "CustomerEndpoint": {
//         "Address": "+16787990850",
//         "Type": "TELEPHONE_NUMBER"
//     },
//     "DisconnectTimestamp": "2020-03-31T16:20:30Z",
//     "InitialContactId": null,
//     "InitiationMethod": "INBOUND",
//     "InitiationTimestamp": "2020-03-31T16:20:01Z",
//     "InstanceARN": "arn:aws:connect:us-east-1:449043523134:instance/57cd1483-c833-43d9-95e1-f0f97a7c3b09",
//     "LastUpdateTimestamp": "2020-03-31T16:21:44Z",
//     "MediaStreams": [
//         {
//             "Type": "AUDIO"
//         }
//     ],
//     "NextContactId": null,
//     "PreviousContactId": null,
//     "Queue": {
//         "ARN": "arn:aws:connect:us-east-1:449043523134:instance/57cd1483-c833-43d9-95e1-f0f97a7c3b09/queue/de51469a-01b1-464b-b1c9-a2e2aa653862",
//         "DequeueTimestamp": "2020-03-31T16:20:16Z",
//         "Duration": 5,
//         "EnqueueTimestamp": "2020-03-31T16:20:11Z",
//         "Name": "Chinese CSR"
//     },
//     "Recording": {
//         "DeletionReason": null,
//         "Location": "connect-528354a49ecf/connect/qmenu/CallRecordings/2020/03/31/ee0a8fcc-9cf8-4b9c-9fcf-e86ebe989486_20200331T16:20_UTC.wav",
//         "Status": "AVAILABLE",
//         "Type": "AUDIO"
//     },
//     "Recordings": [
//         {
//             "DeletionReason": null,
//             "FragmentStartNumber": null,
//             "FragmentStopNumber": null,
//             "Location": "connect-528354a49ecf/connect/qmenu/CallRecordings/2020/03/31/ee0a8fcc-9cf8-4b9c-9fcf-e86ebe989486_20200331T16:20_UTC.wav",
//             "MediaStreamType": "AUDIO",
//             "ParticipantType": null,
//             "StartTimestamp": null,
//             "Status": "AVAILABLE",
//             "StopTimestamp": null,
//             "StorageType": "S3"
//         }
//     ],
//     "SystemEndpoint": {
//         "Address": "+16786663261",
//         "Type": "TELEPHONE_NUMBER"
//     },
//     "TransferCompletedTimestamp": null,
//     "TransferredToEndpoint": null,
//     "createdAt": 1585671705096
// }