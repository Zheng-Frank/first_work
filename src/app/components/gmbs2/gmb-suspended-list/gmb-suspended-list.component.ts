import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GlobalService } from '../../../services/global.service';
import { TimezoneService } from '../../../services/timezone.service';
import { AlertType } from '../../../classes/alert-type';

@Component({
  selector: 'app-gmb-suspended-list',
  templateUrl: './gmb-suspended-list.component.html',
  styleUrls: ['./gmb-suspended-list.component.css']
})
export class GmbSuspendedListComponent implements OnInit {

  rows = [];
  filteredRows = [];
  notShowComplete: boolean = false;
  bmRequest;
  pagination: boolean = true;
  averageRequestsPerDay = 0;
  numberOfLocations = 0;

  now = new Date();
  apiLoading = false;

  myColumnDescriptors = [
    {
      label: "Number"
    },
    {
      label: "Restaurant Name"
    },
    {
      label: "Timezone"
    },
    {
      label: "Account"
    },
    {
      label: "Suspended At"
    },
    {
      label: "Score",
      paths: ['score'],
      sort: (a, b) => (a || 0) > (b || 0) ? 1 : ((a || 0) < (b || 0) ? -1 : 0)
    },
    {
      label: "Logs"
    },
    {
      label: "Action"
    }
  ];

  constructor(private _api: ApiService, private _global: GlobalService, public _timezone: TimezoneService) {
    this.refresh();
    // this.test();
  }

  ngOnInit() {
  }

  async refresh() {
    this.apiLoading = false;

    try {
      // this.rows = await this._api.post(environment.appApiUrl + "gmb/generic", {
      //   name: "refresh-locations",
      //   payload: {
      //     current: "Suspended",
      //     previous: "Published"
      //   }
      // }).toPromise();

      //FIXME
      const result = this.getTestResult();
      result.forEach( loc => {
        // const enabled = loc.disabled.reduce( (indexes, disabled, index) => { if (!disabled) indexes.push(index)}, [] );

      });
    }
    catch (error) {
      console.error(`Error. Couldn't sync GMB`, error);
      return false;
    }

    this.apiLoading = false;
    this.filter();
  }

  // Filtering
  async filter() {
    this.filteredRows = this.rows;
    if (this.notShowComplete) {
      this.filteredRows = this.filteredRows.filter(row => !row.checker && !row.checkedAt);
    }
    this.numberOfLocations = this.filteredRows.length;
  }

  // Refresh a single entry's completion status
  async refreshSingleEntry(requestId) {
    this.now = new Date();
    // Get the updated request information
    const newRequests = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "gmbRequest",
      query: { _id: { $oid: requestId } },
      projection: {
        checker: 1,
        checkedAt: 1,
        "logs.user": 1,
        "logs.date": 1,
        "logs.content": 1
      }
    }).toPromise();
    const newRequest = newRequests[0];
    // Find the corresponding UI row and update it
    const index = this.rows.findIndex(row => row.requestInfos[0]._id == requestId);
    if (index >= 0) {
      const newRow = this.rows[index];
      newRow['checker'] = newRequest['checker'];
      newRow['checkedAt'] = newRequest['checkedAt'];
      newRow['logs'] = newRequest['logs'];
      this.rows[index] = newRow;
    }

    const index2 = this.filteredRows.findIndex(row => row.requestInfos[0]._id == requestId);
    if (index2 >= 0) {
      const newRow = this.filteredRows[index2];
      newRow['checker'] = newRequest['checker'];
      newRow['checkedAt'] = newRequest['checkedAt'];
      newRow['logs'] = newRequest['logs'];
      this.filteredRows[index2] = newRow;
    }
  }

  async addLog(r: any) {
    if (r.content) {
      try {
        // Copy and add the new log
        const newLog = JSON.parse(JSON.stringify(r.logs || []));
        newLog.push({
          user: this._global.user.username,
          date: new Date(),
          content: r.content
        });
        for (const requestInfo of r.requestInfos) {
          const oldData = {
            _id: requestInfo._id,
            logs: r.logs
          };
          const newData = {
            _id: requestInfo._id,
            logs: newLog
          };
          await this._api.patch(environment.qmenuApiUrl + 'generic?resource=gmbRequest', [{ old: oldData, new: newData }]).toPromise();
        }
        this._global.publishAlert(AlertType.Success, `Log added successfully`);
        await this.refreshSingleEntry(r.requestInfos[0]._id);
      } catch (error) {
        console.error('error while adding comment.', error);
        this._global.publishAlert(AlertType.Danger, `Error while adding comment.`);
      }
      r.content = "";
    } else {
      console.error("Log cannot be blank");
      this._global.publishAlert(AlertType.Danger, `Log cannot be blank.`);
    }
  }

  // Update the database to store the completion information
  async markRequestChecked(r: any) {
    if (confirm(`Are you sure to complete ${r.name ? r.name : "this restaurant"}?`)) {
      try {
        for (const requestInfo of r.requestInfos) {
          const oldData = {
            _id: requestInfo._id
          };
          const newData = {
            _id: requestInfo._id,
            checker: this._global.user.username,
            checkedAt: new Date()
          };
          await this._api.patch(environment.qmenuApiUrl + 'generic?resource=gmbRequest', [{ old: oldData, new: newData }]).toPromise();
        }
        this._global.publishAlert(AlertType.Success, `Request marked complete successfully`);
        // await this.refreshSingleEntry(r.requestInfos[0]._id);
        r.content = 'marked COMPLETED';
        this.addLog(r);
      } catch (error) {
        console.error('error while marking request complete.', error);
        this._global.publishAlert(AlertType.Danger, `Error while marking request complete.`);
      }
    }
  }

  async markRequestUnchecked(r: any) {
    if (confirm(`Are you sure to redo ${r.name ? r.name : "this restaurant"}?`)) {
      try {
        for (const requestInfo of r.requestInfos) {
          const oldData = {
            _id: requestInfo._id,
            checker: r.checker,
            checkedAt: r.checkedAt
          };
          const newData = {
            _id: requestInfo._id,
          };
          await this._api.patch(environment.qmenuApiUrl + 'generic?resource=gmbRequest', [{ old: oldData, new: newData }]).toPromise();
        }
        this._global.publishAlert(AlertType.Success, `Request marked incomplete successfully`);
        // await this.refreshSingleEntry(r.requestInfos[0]._id);
        r.content = 'reverted back to INCOMPLETED';
        this.addLog(r);
      } catch (error) {
        console.error('error while marking request incomplete.', error);
        this._global.publishAlert(AlertType.Danger, `Error while marking request incomplete.`);
      }
    }
  }

  createAngularIndentifiableArray(array) {
    if (array) {
      return Array.from(array);
    } else {
      return [];
    }
  }


  getTestResult(){
    return [{
      "email": "menufy7653@gmail.com",
      "place_id": "ChIJBz-dtpT_24ARqU5KH38JdtU",
      "locationName": "accounts/110078921567054301264/locations/6235327148201862526",
      "appealId": "02513627454449128049",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-15T23:39:29.967Z",
      "rtId": ["5e608a082ec19e92fdf1adac"],
      "name": ["Chef Chin"],
      "address": ["4433 Convoy St, San Diego, CA 92111, USA"],
      "score": [2.14],
      "timezone": [],
      "disabled": []
  }, {
      "email": "online6977@gmail.com",
      "place_id": "ChIJeYh2LFMGBYgRd10SNTAZycE",
      "locationName": "accounts/102121207797107134351/locations/8102457795400482735",
      "appealId": "04109224283687668257",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-07T07:32:40.247Z",
      "rtId": ["5a1bd785796eda140048c0aa"],
      "name": ["Fujiyama (Brookfield)"],
      "address": ["17395 W Bluemound Rd, Brookfield, WI 53045, USA"],
      "score": [21.71],
      "timezone": [],
      "disabled": []
  }, {
      "email": "menufy6987@gmail.com",
      "place_id": "ChIJfSqd_kJU2YARG-xMMFMeFSI",
      "locationName": "accounts/100495121058626434833/locations/16346928241397228470",
      "appealId": "18400037210352977915",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-02T20:21:07.067Z",
      "rtId": ["5f23e659eacb7ad0e91ad76a"],
      "name": ["Lagos Kitchen"],
      "address": ["3727 University Ave, San Diego, CA 92105, USA"],
      "score": [1.57],
      "timezone": [],
      "disabled": [true]
  }, {
      "email": "menufy6987@gmail.com",
      "place_id": "ChIJhZd-y4R9j4ARGcV_0VXHN84",
      "locationName": "accounts/100495121058626434833/locations/10617073595028535644",
      "appealId": "08613520828137831776",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-17T16:17:21.688Z",
      "rtId": [],
      "name": [],
      "address": [],
      "score": [],
      "timezone": [],
      "disabled": []
  }, {
      "email": "online75589@gmail.com",
      "place_id": "ChIJr0q_WcveGYgRMAs3qa9rshI",
      "locationName": "accounts/108895662866340838180/locations/17241289725012354583",
      "appealId": "03068132339963778540",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-16T04:00:09.552Z",
      "rtId": ["5d4a229b2f3cd383d329fdcd"],
      "name": ["Juan Lin"],
      "address": ["565 Water St, Allegan, MI 49010, USA"],
      "score": [10.43],
      "timezone": [],
      "disabled": []
  }, {
      "email": "online75589@gmail.com",
      "place_id": "ChIJ6-R1yy63j4ARk93BCTlXgq8",
      "locationName": "accounts/108895662866340838180/locations/650256614484594279",
      "appealId": "13440869736232130722",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-05T14:58:05.189Z",
      "rtId": ["5d1c4175a45ea64ae67e984d"],
      "name": ["The Gurkha Kitchen"],
      "address": ["1342 S Mary Ave, Sunnyvale, CA 94087, USA"],
      "score": [4],
      "timezone": [],
      "disabled": []
  }, {
      "email": "cmo73587@gmail.com",
      "place_id": "ChIJQfBIU83ruokREqQBdy8oJqs",
      "locationName": "accounts/109577943905528763308/locations/7368667269291293177",
      "appealId": "03862596609766474075",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-11-08T21:17:57.643Z",
      "rtId": ["5f7e6fecc34efdfe925b9fe1"],
      "name": ["Twisted Cafe Chinese Restaurant"],
      "address": ["315 N Great Neck Rd Ste 308, Virginia Beach, VA 23454, USA"],
      "score": [1],
      "timezone": [],
      "disabled": []
  }, {
      "email": "chinagarden17055@gmail.com",
      "place_id": "ChIJtTEoRlrDwoARWq8fn2pFaXU",
      "locationName": "accounts/115414850368145170558/locations/11036982283175670773",
      "appealId": "01559942171639905402",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-12T22:35:46.322Z",
      "rtId": ["5fbef7271093b8d71c1ac785"],
      "name": ["Chong Qing YaoMei Hotpot"],
      "address": ["55 W Green St, Pasadena, CA 91105, USA"],
      "score": [1],
      "timezone": [],
      "disabled": []
  }, {
      "email": "menufy987@gmail.com",
      "place_id": "ChIJcbewuK6MqYkRJuucHJp6K7s",
      "locationName": "accounts/110012139928469292733/locations/13117144962494317965",
      "appealId": "06312633311207134789",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-26T21:03:17.838Z",
      "rtId": [],
      "name": [],
      "address": [],
      "score": [],
      "timezone": [],
      "disabled": []
  }, {
      "email": "menufy987@gmail.com",
      "place_id": "ChIJ2bnZcy1x04kR3MdlVF7bpTQ",
      "locationName": "accounts/110012139928469292733/locations/8488820196742353513",
      "appealId": "00982582355656445054",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-01T22:14:18.102Z",
      "rtId": ["60063f8f1c2c51a8396b5a4f"],
      "name": ["Sun Garden"],
      "address": ["55 Crosspoint Pkwy Suite #118, Getzville, NY 14068, USA"],
      "score": [1],
      "timezone": [],
      "disabled": []
  }, {
      "email": "coo075588@gmail.com",
      "place_id": "ChIJpdfiqJyRwokR-wPpSJ-FouI",
      "locationName": "accounts/100454142789747932096/locations/17074957055327254658",
      "appealId": "14775506406993719900",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-21T18:50:37.927Z",
      "rtId": ["5f1310cb9279bbc75c385dc1"],
      "name": ["Best"],
      "address": ["351 Mamaroneck Ave, Mamaroneck, NY 10543, USA"],
      "score": [2.71],
      "timezone": [],
      "disabled": []
  }, {
      "email": "online6976@gmail.com",
      "place_id": "ChIJBXP3eBO5woAR9kfA7VSHfuE",
      "locationName": "accounts/111228584871056117879/locations/9699005802893367277",
      "appealId": "03767774444441990050",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-15T11:59:38.544Z",
      "rtId": ["5f0ef8c09279bbc75c3dbdaa"],
      "name": ["New India Sweets & Spicy"],
      "address": ["1245 S Fairfax Ave, Los Angeles, CA 90019, USA"],
      "score": [1.17],
      "timezone": [],
      "disabled": []
  }, {
      "email": "menufy6975@gmail.com",
      "place_id": "ChIJq8zqJ4-xxokR8xP1-OQDNbM",
      "locationName": "accounts/100545272970429640469/locations/16334029294950018979",
      "appealId": "13477271739976001155",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-01T18:21:25.672Z",
      "rtId": ["5b4876f36efb0014000dc11f"],
      "name": ["Panda Bistro"],
      "address": ["630 Welsh Rd, Huntingdon Valley, PA 19006, USA"],
      "score": [5.71],
      "timezone": [],
      "disabled": []
  }, {
      "email": "menufy8797@gmail.com",
      "place_id": "ChIJ85tbw0aHhYARIXIu4a1XW-A",
      "locationName": "accounts/101268261950337945102/locations/17147088461579763984",
      "appealId": "13448775448752692979",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-31T21:09:38.112Z",
      "rtId": ["5f59500120f825bc72386959"],
      "name": ["um.ma"],
      "address": ["1220 9th Ave, San Francisco, CA 94122, USA"],
      "score": [4.57],
      "timezone": [],
      "disabled": []
  }, {
      "email": "1menu0755@gmail.com",
      "place_id": "ChIJUWuTxlWpJIYRVGejgAEwt9w",
      "locationName": "accounts/113048426303289660393/locations/17751144445061433417",
      "appealId": "11332518488103501504",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-02T21:40:06.375Z",
      "rtId": ["600de18bd91b785a3918ac17"],
      "name": ["China Dragon Buffet"],
      "address": ["1703 N Parkerson Ave, Crowley, LA 70526, USA"],
      "score": [0],
      "timezone": [],
      "disabled": []
  }, {
      "email": "1menu0755@gmail.com",
      "place_id": "ChIJ2dmASMBzK4cR6g2uiXuy9U0",
      "locationName": "accounts/113048426303289660393/locations/927170823443754367",
      "appealId": "05509118156022231868",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-01T07:31:51.253Z",
      "rtId": ["5d7ecfdb2f3cd383d3e352a3"],
      "name": ["Nee House Chinese Restaurant"],
      "address": ["13843 N Tatum Blvd # 15, Phoenix, AZ 85032, USA"],
      "score": [1],
      "timezone": [],
      "disabled": []
  }, {
      "email": "sz075589@gmail.com",
      "place_id": "ChIJU7CFfaELsYkR44r2uEO_j6w",
      "locationName": "accounts/100542516610273488104/locations/5186651255509782161",
      "appealId": "01759970598441703276",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-01T20:54:20.078Z",
      "rtId": ["5deb10eb2f3cd383d35ea346"],
      "name": ["Chan's Restaurant"],
      "address": ["7060 Commons Plaza, Chesterfield, VA 23832, USA"],
      "score": [5.57],
      "timezone": [],
      "disabled": []
  }, {
      "email": "sz075589@gmail.com",
      "place_id": "ChIJHa9NC_hJXYgRzMyWuQ-9t-g",
      "locationName": "accounts/100542516610273488104/locations/555196405974074238",
      "appealId": "10572002309162357412",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-01T05:22:46.268Z",
      "rtId": ["5f654e54c34efdfe92e7357b"],
      "name": ["Yamato Steakhouse of Japan"],
      "address": ["2774, 370 S Hwy 27 #8, Somerset, KY 42501, USA"],
      "score": [5.29],
      "timezone": [],
      "disabled": []
  }, {
      "email": "bobstills8798@gmail.com",
      "place_id": "ChIJ58SKIbXd3IARj5uZcPERtW0",
      "locationName": "accounts/100663757464885638169/locations/18350668635199987112",
      "appealId": "15565831748250378516",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-31T17:39:29.381Z",
      "rtId": ["5e73eca42ec19e92fd5b32ef"],
      "name": ["MOOJI RAMEN 木子拉麵"],
      "address": ["4250 Barranca Pkwy, Irvine, CA 92604, USA"],
      "score": [4.14],
      "timezone": [],
      "disabled": []
  }, {
      "email": "aashine9878@gmail.com",
      "place_id": "ChIJfQfKzY_V6YkRYNyd2idabY4",
      "locationName": "accounts/102187898287739931397/locations/17967721904698976963",
      "appealId": "05651043796271655152",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-27T21:41:16.655Z",
      "rtId": ["5ff666facdf3f01e2fc82bbc"],
      "name": ["Potstickers & Company"],
      "address": ["4909 Merrick Rd, Massapequa Park, NY 11762, USA"],
      "score": [0],
      "timezone": [],
      "disabled": []
  }, {
      "email": "murm4286@gmail.com",
      "place_id": "ChIJN9_-Qidby4kRAskLmCCfutc",
      "locationName": "accounts/102857395785411009014/locations/12916189856364991251",
      "appealId": "10694172443007649108",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-01T05:20:21.109Z",
      "rtId": ["5af5236ac260e914006346e4"],
      "name": ["Kim Moon Restaurant"],
      "address": ["718 Philadelphia St, Indiana, PA 15701, USA"],
      "score": [12.71],
      "timezone": [],
      "disabled": []
  }, {
      "email": "murm4286@gmail.com",
      "place_id": "ChIJl-VhOL-HwokRt266XCg6Vdg",
      "locationName": "accounts/102857395785411009014/locations/13964273007930732013",
      "appealId": "16317334884678454771",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-07T23:21:06.330Z",
      "rtId": ["5c888372e5779ea6a97044a1", "5f554dfa20f825bc72db4ec6"],
      "name": ["TJ Chinese and Mexican Restaurant - old", "TJ Chinese and Mexican Restaurant"],
      "address": ["579 Willis Ave #1, Williston Park, NY 11596, USA", "579 Willis Ave #1, Williston Park, NY 11596, USA"],
      "score": [2.43, 2.43],
      "timezone": [],
      "disabled": [true]
  }, {
      "email": "11sajal8979@gmail.com",
      "place_id": "ChIJL5DV6nUgbRQRIIrJfu8lDG4",
      "locationName": "accounts/112024089246525435753/locations/6818986427083278243",
      "appealId": "02943344080345980545",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-29T15:42:52.654Z",
      "rtId": ["5dab5bc22f3cd383d36be970"],
      "name": ["China Chef"],
      "address": ["821 W Main St, Immokalee, FL 34142, USA"],
      "score": [4],
      "timezone": [],
      "disabled": []
  }, {
      "email": "11sajal8979@gmail.com",
      "place_id": "ChIJtTyP7oW2xokRXCRmx_v-DLg",
      "locationName": "accounts/112024089246525435753/locations/14767312038781603318",
      "appealId": "09718329264705305483",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-28T14:12:30.916Z",
      "rtId": [],
      "name": [],
      "address": [],
      "score": [],
      "timezone": [],
      "disabled": []
  }, {
      "email": "11sajal8979@gmail.com",
      "place_id": "ChIJUZSutUJEkIARZIucNq5fjPU",
      "locationName": "accounts/112024089246525435753/locations/5861305911325093691",
      "appealId": "18134352542315694271",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-15T21:04:18.621Z",
      "rtId": ["5df76af92f3cd383d36b1507"],
      "name": ["Happy Indian Kitchen"],
      "address": ["1290 W Colony Rd, Ripon, CA 95366, USA"],
      "score": [1.57],
      "timezone": [],
      "disabled": []
  }, {
      "email": "11sajal8979@gmail.com",
      "place_id": "ChIJNQgFuFez5YgR40oBPchBDjs",
      "locationName": "accounts/112024089246525435753/locations/5036200609542436848",
      "appealId": "02496759026580731493",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-22T22:26:07.456Z",
      "rtId": ["5fdac1cfaa8b1e69e65989c8"],
      "name": ["Hunan Wok"],
      "address": ["1531 Monument Rd, Jacksonville, FL 32225, USA"],
      "score": [5.57],
      "timezone": [],
      "disabled": []
  }, {
      "email": "111ellengray879@gmail.com",
      "place_id": "ChIJs3v_f2OdQIYRz5VBwMCdLfc",
      "locationName": "accounts/117766850712772313218/locations/9220799819217830410",
      "appealId": "06420584064454264673",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-16T09:14:44.546Z",
      "rtId": ["5ca1709e2c667c6b2eb44ec1"],
      "name": ["Orient Cafe"],
      "address": ["2800 Marina Bay Dr A, League City, TX 77573, USA"],
      "score": [12.57],
      "timezone": [],
      "disabled": []
  }, {
      "email": "07katiereagan02@gmail.com",
      "place_id": "ChIJSTyJKFHFwoARfHM5ntjmlx4",
      "locationName": "accounts/103785446592950428715/locations/8533718487045911941",
      "appealId": "12600865359070287393",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-28T15:54:58.769Z",
      "rtId": [],
      "name": [],
      "address": [],
      "score": [],
      "timezone": [],
      "disabled": []
  }, {
      "email": "07katiereagan02@gmail.com",
      "place_id": "ChIJPSTyYDJFkFQRfY1piuLll2Q",
      "locationName": "accounts/103785446592950428715/locations/9206195593692278017",
      "appealId": "17559333244332390606",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-28T16:21:38.779Z",
      "rtId": [],
      "name": [],
      "address": [],
      "score": [],
      "timezone": [],
      "disabled": []
  }, {
      "email": "online8985@gmail.com",
      "place_id": "ChIJXeAKIR0rw4ARLT--0sNR7ho",
      "locationName": "accounts/109877995664702465496/locations/7756921581595971460",
      "appealId": "15589599274867623651",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-02T21:38:09.670Z",
      "rtId": ["601099ebd91b785a3980681a"],
      "name": ["Liu Roast Fish-老刘家 烤鱼 烤串City of Industry"],
      "address": ["18207 Gale Ave, City of Industry, CA 91748, USA"],
      "score": [1],
      "timezone": [],
      "disabled": [false]
  }, {
      "email": "evolveenef@gmail.com",
      "place_id": "ChIJHXFwZcCJtocRgl8O-9xB42g",
      "locationName": "accounts/102276835100030448091/locations/11096074791943765076",
      "appealId": "16571686601227819628",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-15T09:49:31.292Z",
      "rtId": ["5b1777210a8b6c1400eeacf1"],
      "name": ["Bamboo Garden Inc"],
      "address": ["8210 S Elm Pl, Broken Arrow, OK 74011, USA"],
      "score": [3],
      "timezone": [],
      "disabled": []
  }, {
      "email": "evolveenef@gmail.com",
      "place_id": "ChIJoUtXur6XJIgRLDW5GmRsgB4",
      "locationName": "accounts/102276835100030448091/locations/14553528541595716782",
      "appealId": "14649453142897197649",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-01T06:12:49.073Z",
      "rtId": ["6004a1711c2c51a839766b6f"],
      "name": ["Golden Buffet"],
      "address": ["5630 Dixie Hwy, Waterford Twp, MI 48329, USA"],
      "score": [1],
      "timezone": [],
      "disabled": []
  }, {
      "email": "scenicumez@gmail.com",
      "place_id": "ChIJqxJEv9p5PIgRp_S3a6g9Fl4",
      "locationName": "accounts/117887252635008895821/locations/8538793078677033618",
      "appealId": "17952830157817539042",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-20T12:29:43.234Z",
      "rtId": [],
      "name": [],
      "address": [],
      "score": [],
      "timezone": [],
      "disabled": []
  }, {
      "email": "alexali@sifumenus.com",
      "place_id": "ChIJO813Usi3t4kRmtWoHLuN0_o",
      "locationName": "accounts/112312173846885606016/locations/5019820484665096826",
      "appealId": "08604725000070399656",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-29T00:37:03.361Z",
      "rtId": [],
      "name": [],
      "address": [],
      "score": [],
      "timezone": [],
      "disabled": []
  }, {
      "email": "alexali@sifumenus.com",
      "place_id": "ChIJ58SKIbXd3IARj5uZcPERtW0",
      "locationName": "accounts/112312173846885606016/locations/18305227800697088796",
      "appealId": "01773877137973800597",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-01T18:43:30.714Z",
      "rtId": ["5e73eca42ec19e92fd5b32ef"],
      "name": ["MOOJI RAMEN 木子拉麵"],
      "address": ["4250 Barranca Pkwy, Irvine, CA 92604, USA"],
      "score": [4.14],
      "timezone": [],
      "disabled": []
  }, {
      "email": "pascualjason04@gmail.com",
      "place_id": "ChIJ2yevBmxYwIcRu6NKyMQePJ4",
      "locationName": "accounts/114407183362769411902/locations/13695684502519812262",
      "appealId": "10284695025335525281",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-08T20:07:30.575Z",
      "rtId": ["5ededf008b6849feece9012c"],
      "name": ["Asian Buffet"],
      "address": ["511 NW Barry Rd, Kansas City, MO 64155, USA"],
      "score": [5],
      "timezone": [],
      "disabled": []
  }, {
      "email": "pascualjason04@gmail.com",
      "place_id": "ChIJN8BIZwXTD4gRMI2zfrtEzMM",
      "locationName": "accounts/114407183362769411902/locations/16696524796943876901",
      "appealId": "07396388506105193309",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-05T05:24:57.442Z",
      "rtId": ["5e9998aad74cbf45e69e2ae1"],
      "name": ["Paula's Thai Kitchen"],
      "address": ["2441 N Halsted St, Chicago, IL 60614, USA"],
      "score": [1.22],
      "timezone": [],
      "disabled": []
  }, {
      "email": "58z0qg3lazaqe@gmail.com",
      "place_id": "ChIJfbVll5qqmlQRGvrdpYAiIts",
      "locationName": "accounts/107416054684136601164/locations/17673258307745291158",
      "appealId": "06916408577619794517",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-17T10:09:10.187Z",
      "rtId": ["5f8ccdf5c34efdfe92eb797e"],
      "name": ["Jade Garden Chinese Restaurant & Lounge"],
      "address": ["3133 Broadway, Everett, WA 98201, USA"],
      "score": [1],
      "timezone": [],
      "disabled": []
  }, {
      "email": "58z0qg3lazaqe@gmail.com",
      "place_id": "ChIJ0wWKt75YwokRj5vuNJ06Afo",
      "locationName": "accounts/107416054684136601164/locations/3442140625900716770",
      "appealId": "06310101206502486558",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-06T20:07:38.489Z",
      "rtId": ["5f4ff7cb20f825bc72c358cd"],
      "name": ["Yuka"],
      "address": ["1557 2nd Ave, New York, NY 10028, USA"],
      "score": [1],
      "timezone": [],
      "disabled": []
  }, {
      "email": "online35879@gmail.com",
      "place_id": "ChIJY24Jf7jq54kRSE84C7KPU2k",
      "locationName": "accounts/118250753638880101132/locations/3386260393521640924",
      "appealId": "16960933090537979357",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-01T06:14:36.506Z",
      "rtId": ["5f6fe000c34efdfe923cf6f5"],
      "name": ["Happy Garden"],
      "address": ["1098 Main St, Watertown, CT 06795, USA"],
      "score": [1.86],
      "timezone": [],
      "disabled": []
  }, {
      "email": "qm0755@gmail.com",
      "place_id": "ChIJ2dmASMBzK4cR6g2uiXuy9U0",
      "locationName": "accounts/112238312884562866703/locations/17820267807097854815",
      "appealId": "06416465346830588978",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-07T22:28:31.004Z",
      "rtId": ["5d7ecfdb2f3cd383d3e352a3"],
      "name": ["Nee House Chinese Restaurant"],
      "address": ["13843 N Tatum Blvd # 15, Phoenix, AZ 85032, USA"],
      "score": [1],
      "timezone": [],
      "disabled": []
  }, {
      "email": "qm0755@gmail.com",
      "place_id": "ChIJO8FBHsvHyIARcPWlHEOvUUM",
      "locationName": "accounts/112238312884562866703/locations/14845333589764193588",
      "appealId": "15949420976187028955",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-03T04:36:51.797Z",
      "rtId": ["5fd03365aa8b1e69e63b7418"],
      "name": ["PHO WIN9"],
      "address": ["4075 S Durango Dr suite 106, Las Vegas, NV 89147, USA"],
      "score": [1],
      "timezone": [],
      "disabled": []
  }, {
      "email": "o2dvqj66b@gmail.com",
      "place_id": "ChIJG9F6N63XxokRxvrLihTMpgs",
      "locationName": "accounts/112539085862375785312/locations/13010520361017817259",
      "appealId": "07797336241530599719",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-28T14:11:07.282Z",
      "rtId": [],
      "name": [],
      "address": [],
      "score": [],
      "timezone": [],
      "disabled": []
  }, {
      "email": "kzkc3tvqb@gmail.com",
      "place_id": "ChIJBwuW1iXDxokR7tzcELovxGQ",
      "locationName": "accounts/109204674054006520755/locations/7218202940462281498",
      "appealId": "00793025568772168346",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-28T01:53:42.429Z",
      "rtId": ["5fa08bf51093b8d71c420389"],
      "name": ["Ocean House"],
      "address": ["1030 MacDade Blvd, Collingdale, PA 19023, USA"],
      "score": [5.14],
      "timezone": [],
      "disabled": []
  }, {
      "email": "amychen7763@gmail.com",
      "place_id": "ChIJt7qt8kMX5IkRz7PqeYsQC6g",
      "locationName": "accounts/me/locations/897235681785438076",
      "appealId": "10560938479351439213",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-16T16:37:30.103Z",
      "rtId": ["5b99cf284c304db9cabdbd29"],
      "name": ["Hot Wok"],
      "address": ["319 Main Street, Douglas, MA 01516, USA"],
      "score": [8.29],
      "timezone": [],
      "disabled": []
  }, {
      "email": "sz987988@gmail.com",
      "place_id": "ChIJIzi_uZG6woARkjnTKz7jWQQ",
      "locationName": "accounts/116166517629095844782/locations/8697631474537533253",
      "appealId": "10652521183316013226",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-27T16:04:47.938Z",
      "rtId": ["5f3474ca44fcce5f3b469048"],
      "name": ["Asakuma sushi"],
      "address": ["2805 Abbot Kinney Blvd c, Venice, CA 90291, USA"],
      "score": [0],
      "timezone": [],
      "disabled": []
  }, {
      "email": "sz987988@gmail.com",
      "place_id": "ChIJlX4gDBP1UocRQNXUnkpXJH0",
      "locationName": "accounts/116166517629095844782/locations/16843813597188569912",
      "appealId": "05989267585720080968",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-24T22:29:02.320Z",
      "rtId": ["5e30c81a2ec19e92fd914f0d"],
      "name": ["Charlie Chows Dragon Grill"],
      "address": ["255 E 400 S, Salt Lake City, UT 84111, USA"],
      "score": [4.86],
      "timezone": [],
      "disabled": []
  }, {
      "email": "sz987988@gmail.com",
      "place_id": "ChIJrfiWVatL0YkRTvo0m9r6Q3o",
      "locationName": "accounts/116166517629095844782/locations/5640996121179019874",
      "appealId": "13775079610246886462",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-01T02:02:40.879Z",
      "rtId": ["5f5a832420f825bc724c7be3"],
      "name": ["Chef King Henrietta"],
      "address": ["2199 E Henrietta Rd #18, Rochester, NY 14623, USA"],
      "score": [4.86],
      "timezone": [],
      "disabled": []
  }, {
      "email": "sz987988@gmail.com",
      "place_id": "ChIJxfmxIbFT3YgRbA5hnBd8ui8",
      "locationName": "accounts/116166517629095844782/locations/12449319949738322786",
      "appealId": "11697162430786614016",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-30T06:55:58.837Z",
      "rtId": ["5f037b048b6849feecb2f932"],
      "name": ["Hibachi Express Zephyrhills"],
      "address": ["7306 Gall Blvd, Zephyrhills, FL 33541, USA"],
      "score": [19.57],
      "timezone": [],
      "disabled": []
  }, {
      "email": "sz987988@gmail.com",
      "place_id": "ChIJifK2xgBMvIcRi5_aDhwCA4M",
      "locationName": "accounts/116166517629095844782/locations/10960606371897236745",
      "appealId": "08537436538087682906",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-29T00:09:51.169Z",
      "rtId": ["5d3a2e95a45ea64ae662b49f"],
      "name": ["Jin Jin Garden Chinese Restaurant"],
      "address": ["450 W 18th St, Junction City, KS 66441, USA"],
      "score": [27],
      "timezone": [],
      "disabled": []
  }, {
      "email": "sz987988@gmail.com",
      "place_id": "ChIJDa0EAXFtZIgRovPlS_TBxYM",
      "locationName": "accounts/116166517629095844782/locations/17232555998017422378",
      "appealId": "11393181790291081456",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-30T04:20:39.903Z",
      "rtId": ["5b39a5b3d9ca12140081ae9a"],
      "name": ["Kirin Sushi"],
      "address": ["795 Bell Rd, Antioch, TN 37013, USA"],
      "score": [7.86],
      "timezone": [],
      "disabled": []
  }, {
      "email": "sz987988@gmail.com",
      "place_id": "ChIJeeZk-AQbyUwRKOltyrJZHWI",
      "locationName": "accounts/116166517629095844782/locations/6091873594927534007",
      "appealId": "11390224871547107217",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-11-09T06:01:44.800Z",
      "rtId": [],
      "name": [],
      "address": [],
      "score": [],
      "timezone": [],
      "disabled": []
  }, {
      "email": "sz987988@gmail.com",
      "place_id": "ChIJL4vFjF6Nk4cRLtuYD8UGqBQ",
      "locationName": "accounts/116166517629095844782/locations/16108046810849273615",
      "appealId": "14955232849116450832",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-04T11:43:03.927Z",
      "rtId": ["5fcfef3aaa8b1e69e6c356b2"],
      "name": ["Ninjaa Japan Restaurant"],
      "address": ["7641 Cass St, Omaha, NE 68114, USA"],
      "score": [1],
      "timezone": [],
      "disabled": []
  }, {
      "email": "sz987988@gmail.com",
      "place_id": "ChIJnUpQDwJfwokRvvBVqTD_k6c",
      "locationName": "accounts/116166517629095844782/locations/5399713533101993104",
      "appealId": "14265961421234769241",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-24T01:09:13.258Z",
      "rtId": [],
      "name": [],
      "address": [],
      "score": [],
      "timezone": [],
      "disabled": []
  }, {
      "email": "sz987988@gmail.com",
      "place_id": "ChIJm_BgnwBtkFQRDsSVcjmmOVA",
      "locationName": "accounts/116166517629095844782/locations/15582956401841808815",
      "appealId": "09907957474750526071",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-08T20:33:41.894Z",
      "rtId": ["5f4974c120f825bc7278a65d"],
      "name": ["Sizzling Pot King"],
      "address": ["14125 NE 20th St, Bellevue, WA 98007, USA"],
      "score": [2.14],
      "timezone": [],
      "disabled": []
  }, {
      "email": "sz987988@gmail.com",
      "place_id": "ChIJX-U3S2DRmoARufNVhTSzxqY",
      "locationName": "accounts/116166517629095844782/locations/8754250586182476999",
      "appealId": "06399229357121630023",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-30T00:27:30.646Z",
      "rtId": [],
      "name": [],
      "address": [],
      "score": [],
      "timezone": [],
      "disabled": []
  }, {
      "email": "sz987988@gmail.com",
      "place_id": "ChIJ-VwcC7NJ5IgR-L1swZ5JDi4",
      "locationName": "accounts/116166517629095844782/locations/429375219110385349",
      "appealId": "02468563376161417257",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-28T14:09:49.920Z",
      "rtId": [],
      "name": [],
      "address": [],
      "score": [],
      "timezone": [],
      "disabled": []
  }, {
      "email": "sz987988@gmail.com",
      "place_id": "ChIJKVOIlyPEQIYROt9Ia_Sp4DQ",
      "locationName": "accounts/116166517629095844782/locations/11449270773880260046",
      "appealId": "05162220463100385256",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-08T14:25:57.472Z",
      "rtId": ["5fc320b91093b8d71cabfd35"],
      "name": ["WanFu Cafe"],
      "address": ["1441 Wirt Rd, Houston, TX 77055, USA"],
      "score": [1],
      "timezone": [],
      "disabled": []
  }, {
      "email": "sz987988@gmail.com",
      "place_id": "ChIJH-UeoLL3wokRB1K80VSPeso",
      "locationName": "accounts/116166517629095844782/locations/13600565200813016793",
      "appealId": "12246640200036453562",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-05T10:38:21.281Z",
      "rtId": ["5c6cdb2de5779ea6a97040f4"],
      "name": ["Szechun Express"],
      "address": ["639 Palisade Ave, Cliffside Park, NJ 07010, USA"],
      "score": [3.86],
      "timezone": [],
      "disabled": []
  }, {
      "email": "qmenu8798@gmail.com",
      "place_id": "ChIJB1b3BqG3xokRo1nYJvsIsqE",
      "locationName": "accounts/102158041846627580480/locations/6405319700535532337",
      "appealId": "03150528733215836848",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-28T14:09:15.225Z",
      "rtId": [],
      "name": [],
      "address": [],
      "score": [],
      "timezone": [],
      "disabled": []
  }, {
      "email": "menufy5874@gmail.com",
      "place_id": "ChIJiQfbamT4rlQR3kmPQtbgQGI",
      "locationName": "accounts/101205509865994953467/locations/3248901861670518347",
      "appealId": "05541148677825665332",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-14T09:08:52.178Z",
      "rtId": [],
      "name": [],
      "address": [],
      "score": [],
      "timezone": [],
      "disabled": []
  }, {
      "email": "byramsushict@gmail.com",
      "place_id": "ChIJp3T-PUFUrlQREwGOSTVcC9E",
      "locationName": "accounts/105186699253436234546/locations/16404562391283362393",
      "appealId": "06608955421305068081",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-13T22:06:11.342Z",
      "rtId": ["5f2ddc1344fcce5f3baaa119", "5fc45f4c1093b8d71c0457a1"],
      "name": ["Great Wall Restaurant - old", "Great Wall Restaurant"],
      "address": ["2590 N Eagle Rd, Meridian, ID 83646, USA", "2590 N Eagle Rd, Meridian, ID 83646, USA"],
      "score": [0, 1],
      "timezone": [],
      "disabled": [true]
  }, {
      "email": "byramsushict@gmail.com",
      "place_id": "ChIJXQu_dZwt6IkRewLUR4NbX7Y",
      "locationName": "accounts/105186699253436234546/locations/8371377004975388743",
      "appealId": "14742260790474456660",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-01T20:56:55.010Z",
      "rtId": ["5ffb639ccdf3f01e2f2c38f2"],
      "name": ["Xing Wang Kitchen"],
      "address": ["36 Bay Shore Rd, Bay Shore, NY 11706, USA"],
      "score": [0],
      "timezone": [],
      "disabled": []
  }, {
      "email": "webonline8957@gmail.com",
      "place_id": "ChIJa5ogNFbz24AR22LEVlM8oUg",
      "locationName": "accounts/103739703864630345093/locations/9823291271059297797",
      "appealId": "00154464048178068460",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-28T15:04:41.741Z",
      "rtId": ["5f800641c34efdfe92bd5935"],
      "name": ["China bros"],
      "address": ["1875 S Centre City Pkwy suit D, Escondido, CA 92025, USA"],
      "score": [7],
      "timezone": [],
      "disabled": []
  }, {
      "email": "came86166@gmail.com",
      "place_id": "ChIJCSUq13f5tokRW34lScmYQHo",
      "locationName": "accounts/115025080635620646262/locations/9145293351353962196",
      "appealId": "07321697587387401761",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-16T03:31:49.634Z",
      "rtId": ["5b28c48b392e68140027c828"],
      "name": ["Feng's Garden"],
      "address": ["18091 Triangle Shopping Plaza, Dumfries, VA 22026, USA"],
      "score": [4],
      "timezone": [],
      "disabled": []
  }, {
      "email": "came86166@gmail.com",
      "place_id": "ChIJt4j9A1wbU4cRDE2P3jeN6pM",
      "locationName": "accounts/115025080635620646262/locations/4286401830586048167",
      "appealId": "08393312624679641767",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-01T19:09:43.166Z",
      "rtId": ["5ebb213209e2bf378e88dca5"],
      "name": ["Imperial Asian Cuisine & Sushi"],
      "address": ["2058 W 1700 S, Syracuse, UT 84075, USA"],
      "score": [6.43],
      "timezone": [],
      "disabled": []
  }, {
      "email": "gmb@qmenu360.com",
      "place_id": "ChIJPeN2efknxokRk1Ew1BuvXa0",
      "locationName": "accounts/me/locations/825698448394599896",
      "appealId": "10088636897064783535",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-01-10T01:26:34.339Z",
      "rtId": ["5c9d20392c667c6b2eb44ea4"],
      "name": ["Szechuan Gourmet"],
      "address": ["1930 Columbia Ave, Lancaster, PA 17603, USA"],
      "score": [1.57],
      "timezone": [],
      "disabled": []
  }, {
      "email": "cindybows9687@gmail.com",
      "place_id": "ChIJhZO4_Ju1xokRm3RFYaKAG78",
      "locationName": "accounts/111210608962391727308/locations/7126284127253318302",
      "appealId": "05157581176340092351",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-16T20:55:40.456Z",
      "rtId": ["5fa603551093b8d71c629932"],
      "name": ["King Food"],
      "address": ["7426 Frankford Ave, Philadelphia, PA 19136, USA"],
      "score": [1],
      "timezone": [],
      "disabled": []
  }, {
      "email": "cindybows9687@gmail.com",
      "place_id": "ChIJe92pjlym2YgROlT2x-0h3u8",
      "locationName": "accounts/111210608962391727308/locations/2935954471951514266",
      "appealId": "13412546519403723296",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-01T05:48:50.729Z",
      "rtId": ["5b83ff9d9583a1140079ab83"],
      "name": ["Wu's Kitchen"],
      "address": ["2224 N Flamingo Rd, Pembroke Pines, FL 33028, USA"],
      "score": [3.29],
      "timezone": [],
      "disabled": []
  }, {
      "email": "ellainegrey0702@gmail.com",
      "place_id": "ChIJ0z8SX3JRZYcRB_cr6h-FCFk",
      "locationName": "accounts/103757712862382945534/locations/3271100698927140563",
      "appealId": "08589488431545314960",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-28T09:25:14.389Z",
      "rtId": ["600a6696d91b785a3935025b"],
      "name": ["Asian Buffet"],
      "address": ["3485 10th St, Gering, NE 69341, USA"],
      "score": [1],
      "timezone": [],
      "disabled": []
  }, {
      "email": "ellainegrey0702@gmail.com",
      "place_id": "ChIJCxj-cBzORIYRqVW0keXjcM8",
      "locationName": "accounts/103757712862382945534/locations/14021189255748182747",
      "appealId": "13880091563765343148",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-28T02:46:08.254Z",
      "rtId": ["5fe12593cdf3f01e2f35f934"],
      "name": ["BO ASIAN BISTRO - CHINESE RESTAURANT"],
      "address": ["2711 La Frontera Blvd #260, Round Rock, TX 78681, USA"],
      "score": [1.25],
      "timezone": [],
      "disabled": []
  }, {
      "email": "2stevewills9878@gmail.com",
      "place_id": "ChIJByFSIPmrK4cR5_-hl81dzkY",
      "locationName": "accounts/105474497936464364104/locations/5716587708430536333",
      "appealId": "18077487758890054774",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-16T03:34:59.492Z",
      "rtId": ["5fc69b5d1093b8d71cbfce98"],
      "name": ["Gold chef"],
      "address": ["1055 S Arizona Ave UNIT 10, Chandler, AZ 85286, USA"],
      "score": [1.25],
      "timezone": [],
      "disabled": []
  }, {
      "email": "2stevewills9878@gmail.com",
      "place_id": "ChIJy945PiDHt4kRVD6gkNfwdBQ",
      "locationName": "accounts/105474497936464364104/locations/14190922837050763255",
      "appealId": "01095534574238810554",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-27T01:50:41.597Z",
      "rtId": ["5f87af90c34efdfe92c6aa2b"],
      "name": ["Teriyaki Kaizen - Teppenyaki grill & sushi"],
      "address": ["5501 Baltimore Ave Suite 103, Hyattsville, MD 20781, USA"],
      "score": [0],
      "timezone": [],
      "disabled": []
  }, {
      "email": "11ab9878@gmail.com",
      "place_id": "ChIJ9VUCn_PcQIYR3ajLuMKU4ws",
      "locationName": "accounts/117053227849084627884/locations/11868807571057897486",
      "appealId": "15692807347885784549",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-07T22:51:03.534Z",
      "rtId": ["5a5daf86ecb7931400500a19", "5ffe2ab3cdf3f01e2feb7a47"],
      "name": ["Emperor Cafe", "Kagoshima Sushi Asian(Emperor Cafe）"],
      "address": ["12280 Westheimer Rd, Houston, TX 77077, USA", "12280 Westheimer Rd, Houston, TX 77077, USA"],
      "score": [5.71, 5.71],
      "timezone": [],
      "disabled": [true, false]
  }, {
      "email": "pronouncedhchg@gmail.com",
      "place_id": "ChIJtYlhkNJHhIAR1LsIpgrHASA",
      "locationName": "accounts/116843152339176123084/locations/991067417017794820",
      "appealId": "01678470935580939340",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-16T03:32:08.265Z",
      "rtId": ["58c071699cd61d1100877535", "58ba1a8d9b4e441100d8cdc1"],
      "name": ["China Legend", "Demo"],
      "address": ["500 Mission Blvd, Santa Rosa, CA 95409, USA", "500 Mission Blvd, Santa Rosa, CA 95409, USA"],
      "score": [8.86, 7.86],
      "timezone": [],
      "disabled": [false]
  }, {
      "email": "pronouncedhchg@gmail.com",
      "place_id": "ChIJpybabuXqyIAR3UvLlcIgkk4",
      "locationName": "accounts/116843152339176123084/locations/6161061909540564876",
      "appealId": "06692543341158317145",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-08T01:29:43.033Z",
      "rtId": ["6019ea67639500ef5af8779c"],
      "name": ["Sushi 88（Sushi Ko）"],
      "address": ["7101 W Craig Rd # 104, Las Vegas, NV 89129, USA"],
      "score": [0],
      "timezone": [],
      "disabled": []
  }, {
      "email": "incentiveiapx@gmail.com",
      "place_id": "ChIJt_Cvwiy-j4ARBlZmEdwdAi0",
      "locationName": "accounts/103091367418011395442/locations/7910513883008705158",
      "appealId": "01599493916260072558",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-28T14:09:33.924Z",
      "rtId": ["5c872228e5779ea6a970444f"],
      "name": ["Chong Qing Xiao Mian"],
      "address": ["34420 Fremont Blvd, Fremont, CA 94555, USA"],
      "score": [2],
      "timezone": [],
      "disabled": []
  }, {
      "email": "forbiddinggfuz@gmail.com",
      "place_id": "ChIJjVqBaYFStokR3zBYXXvgqmA",
      "locationName": "accounts/102875576823090303450/locations/3853543462099575584",
      "appealId": "18254613018806124780",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-10-16T05:39:45.447Z",
      "rtId": ["5d48d3492f3cd383d31430c4"],
      "name": ["Asian Grill"],
      "address": ["6228 Rolling Rd # 8, Springfield, VA 22152, USA"],
      "score": [1.29],
      "timezone": [],
      "disabled": []
  }, {
      "email": "settledzhbw@gmail.com",
      "place_id": "ChIJU9uc3dhrToYRoOD5-TujZyc",
      "locationName": "accounts/111013064924573189180/locations/231341301852084159",
      "appealId": "18282523448842857133",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-16T04:00:29.949Z",
      "rtId": ["5ca573a72c667c6b2eb44ee8"],
      "name": ["Chen's Wok"],
      "address": ["910 S Crowley Rd #15, Crowley, TX 76036, USA"],
      "score": [9.14],
      "timezone": [],
      "disabled": []
  }, {
      "email": "settledzhbw@gmail.com",
      "place_id": "ChIJo898YwK9woARBMgR-isa5K8",
      "locationName": "accounts/111013064924573189180/locations/13530007455507672755",
      "appealId": "05041034343827312501",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-16T21:47:53.840Z",
      "rtId": ["5fb642aa1093b8d71c3946e2"],
      "name": ["Fresh & Meaty Burgers"],
      "address": ["4350 Laurel Canyon Blvd, Studio City, CA 91604, USA"],
      "score": [1],
      "timezone": [],
      "disabled": []
  }, {
      "email": "settledzhbw@gmail.com",
      "place_id": "ChIJycAwqJONtocRqfDPSZaPdKU",
      "locationName": "accounts/111013064924573189180/locations/12240855477914689154",
      "appealId": "05131386527864140037",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-16T03:32:37.499Z",
      "rtId": ["5fbc6f901093b8d71cd1e11c"],
      "name": ["Hibachi Grill Super Buffet"],
      "address": ["8110 E 74th Pl, Tulsa, OK 74133, USA"],
      "score": [1],
      "timezone": [],
      "disabled": []
  }, {
      "email": "marketingazyy@gmail.com",
      "place_id": "ChIJieKpg0lZwokR72pqekNa1zM",
      "locationName": "accounts/116002973271219631589/locations/8371139242789587283",
      "appealId": "06173502748330473843",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-24T14:29:49.055Z",
      "rtId": [],
      "name": [],
      "address": [],
      "score": [],
      "timezone": [],
      "disabled": []
  }, {
      "email": "lucyhills@sifumenus.com",
      "place_id": "ChIJO3CJXJ_fnIgRO7KsZhs68sI",
      "locationName": "accounts/108406010831338799673/locations/13749079219446228967",
      "appealId": "18227996384568686324",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-11T22:14:18.058Z",
      "rtId": ["5f710653c34efdfe922980ba"],
      "name": ["City Buffet Sushi & Grill"],
      "address": ["560 Weathersby Rd, Hattiesburg, MS 39402, USA"],
      "score": [1],
      "timezone": [],
      "disabled": []
  }, {
      "email": "lucyhills@sifumenus.com",
      "place_id": "ChIJ8ziIy0R9P4gRohd_lUVKXVI",
      "locationName": "accounts/108406010831338799673/locations/4548205190653943037",
      "appealId": "06125822420383281415",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-07T08:27:42.604Z",
      "rtId": ["5f73a4fac34efdfe925fc7aa"],
      "name": ["Dragon Buffet"],
      "address": ["6200 Brandt Pike, Dayton, OH 45424, USA"],
      "score": [2.57],
      "timezone": [],
      "disabled": []
  }, {
      "email": "ghope115@gmail.com",
      "place_id": "ChIJk2f7kHiM24kRnPL3pZWMP8E",
      "locationName": "accounts/116089569283896999445/locations/7678021520133499474",
      "appealId": "06822573009184587585",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-01T06:39:17.707Z",
      "rtId": ["600dd239d91b785a39fe14c4"],
      "name": ["Hunan Gourmet"],
      "address": ["1962, 19 Ford Ave A, Oneonta, NY 13820, USA"],
      "score": [0],
      "timezone": [],
      "disabled": []
  }, {
      "email": "ghope115@gmail.com",
      "place_id": "ChIJ85tbw0aHhYARIXIu4a1XW-A",
      "locationName": "accounts/116089569283896999445/locations/10379682816424367080",
      "appealId": "03245008212037474285",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-24T21:01:52.092Z",
      "rtId": ["5f59500120f825bc72386959"],
      "name": ["um.ma"],
      "address": ["1220 9th Ave, San Francisco, CA 94122, USA"],
      "score": [4.57],
      "timezone": [],
      "disabled": []
  }, {
      "email": "chinesefoodcs@gmail.com",
      "place_id": "ChIJfeM-xqK1jocRpqTKI95G77s",
      "locationName": "accounts/111882012241665597511/locations/11063844728681504577",
      "appealId": "07573620791754768844",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-08T17:56:25.878Z",
      "rtId": ["5a683e68f60a541400246387"],
      "name": ["Oshima Sushi Japanese Cuisine"],
      "address": ["109 E 10th St, Sioux Falls, SD 57104, USA"],
      "score": [13.57],
      "timezone": [],
      "disabled": []
  }, {
      "email": "danielshort270@gmail.com",
      "place_id": "ChIJVd2lENKQ0YkRBtl_NJwYrag",
      "locationName": "accounts/108024535658807011001/locations/8214572534167014836",
      "appealId": "17096771869884758080",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-02T03:49:51.319Z",
      "rtId": ["5e192ec22f3cd383d3979610"],
      "name": ["China Buffet"],
      "address": ["82 Erie Ave, Hornell, NY 14843, USA"],
      "score": [2.43],
      "timezone": [],
      "disabled": []
  }, {
      "email": "kasteldrew@gmail.com",
      "place_id": "ChIJuUUAU_pdwokR2BWIbnoU1mk",
      "locationName": "accounts/118391530789489797736/locations/16557809177463279685",
      "appealId": "05322005136273561878",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-19T20:47:19.033Z",
      "rtId": ["5b6e43f46d9fac1400d4ce0f", "5dd8a9f62f3cd383d350228e"],
      "name": ["Yummy 88 - old", "Yummy 88"],
      "address": ["130 Wilson Ave, Brooklyn, NY 11237, USA", "130 Wilson Ave, Brooklyn, NY 11237, USA"],
      "score": [1, 4],
      "timezone": [],
      "disabled": [true]
  }, {
      "email": "madieshorton@gmail.com",
      "place_id": "ChIJV5cdiA-4wogRhhdxDy_isr8",
      "locationName": "accounts/105611896644422161178/locations/4389401382780474589",
      "appealId": "14941020927588081984",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-22T19:59:32.816Z",
      "rtId": ["5ffdfe3bcdf3f01e2fa7e4ed"],
      "name": ["China City"],
      "address": ["16049 Tampa Palms Blvd W, Tampa, FL 33647, USA"],
      "score": [2],
      "timezone": [],
      "disabled": []
  }, {
      "email": "madieshorton@gmail.com",
      "place_id": "ChIJ3WPvTn9xxokRtJ1Mec7nsKc",
      "locationName": "accounts/105611896644422161178/locations/17967198007103231000",
      "appealId": "13419609609763059680",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-01T06:40:12.087Z",
      "rtId": ["5fe93be1cdf3f01e2fb0592e"],
      "name": ["Fortune Cafe"],
      "address": ["1177 Berkshire Blvd, Wyomissing, PA 19610, USA"],
      "score": [0],
      "timezone": [],
      "disabled": []
  }, {
      "email": "madieshorton@gmail.com",
      "place_id": "ChIJ58SKIbXd3IARj5uZcPERtW0",
      "locationName": "accounts/105611896644422161178/locations/15121479469318013368",
      "appealId": "02530151327922165915",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-24T17:07:48.005Z",
      "rtId": ["5e73eca42ec19e92fd5b32ef"],
      "name": ["MOOJI RAMEN 木子拉麵"],
      "address": ["4250 Barranca Pkwy, Irvine, CA 92604, USA"],
      "score": [4.14],
      "timezone": [],
      "disabled": []
  }, {
      "email": "parksabrina364@gmail.com",
      "place_id": "ChIJ0cMK3-2BwokRGDNyeu-MMr8",
      "locationName": "accounts/102629883777459489423/locations/9895185457726863000",
      "appealId": "06117707632624009614",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-21T02:33:53.371Z",
      "rtId": ["5ffb5a2ecdf3f01e2f1d233e"],
      "name": ["Cloud Asian Restaurant"],
      "address": ["2 W Village Green, Hicksville, NY 11801, USA"],
      "score": [1],
      "timezone": [],
      "disabled": []
  }, {
      "email": "jacobsyasmine5@gmail.com",
      "place_id": "ChIJL4vCM_yl0ocR2NZ8lXAq0t0",
      "locationName": "accounts/107957026614548586698/locations/1912410778616620698",
      "appealId": "12543601953376959193",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-21T22:41:55.985Z",
      "rtId": ["5f1a347eeacb7ad0e90721ca"],
      "name": ["Asian Grill Buffet"],
      "address": ["10001 Mabelvale Plaza Dr, Little Rock, AR 72209, USA"],
      "score": [2.14],
      "timezone": [],
      "disabled": [true]
  }, {
      "email": "jacobsyasmine5@gmail.com",
      "place_id": "ChIJKdObKP_VslIRQ5QH9_b5KmI",
      "locationName": "accounts/107957026614548586698/locations/17106601722594184029",
      "appealId": "11434156916840076289",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-19T01:37:17.133Z",
      "rtId": ["5f8357e4c34efdfe92742dfd", "5ff3721ecdf3f01e2fc40fbc"],
      "name": ["Fortune House Chinese Cuisine - old", "Fortune House Thai & Chinese Food"],
      "address": ["2900 Rice St, Little Canada, MN 55113, USA", "2900 Rice St, Little Canada, MN 55113, USA"],
      "score": [7.57, 7.57],
      "timezone": [],
      "disabled": [true]
  }, {
      "email": "jacobsyasmine5@gmail.com",
      "place_id": "ChIJYRDbVQLMwogRkzi4VvNCnmE",
      "locationName": "accounts/107957026614548586698/locations/4294683086482014003",
      "appealId": "13370234024559117603",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-02T03:51:11.076Z",
      "rtId": ["5ffe13f0cdf3f01e2fbfa2af"],
      "name": ["Hong Kong Chinese Restaurant"],
      "address": ["11760 E M.L.K. Jr Blvd, Seffner, FL 33584, USA"],
      "score": [0],
      "timezone": [],
      "disabled": []
  }, {
      "email": "corinedrew294@gmail.com",
      "place_id": "ChIJK7Ua3zWl2YgR29e-K1bEr2M",
      "locationName": "accounts/107603369152174250677/locations/2927593228947011449",
      "appealId": "03948119968761731023",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-05T16:12:44.000Z",
      "rtId": [],
      "name": [],
      "address": [],
      "score": [],
      "timezone": [],
      "disabled": []
  }, {
      "email": "corinedrew294@gmail.com",
      "place_id": "ChIJZQ3HCTtFMlERMFf6nLPBWtc",
      "locationName": "accounts/107603369152174250677/locations/12757213962229075704",
      "appealId": "17366113549504865681",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-01T18:43:11.535Z",
      "rtId": ["5ecc523e8b6849feecfcde1b"],
      "name": ["Aurora Crepes & Peking Duck"],
      "address": ["512 Old Steese Hwy, Fairbanks, AK 99701, USA"],
      "score": [5.86],
      "timezone": [],
      "disabled": []
  }, {
      "email": "ginamarquez863@gmail.com",
      "place_id": "ChIJydSCO3QtO4gRKgbNsZMWD10",
      "locationName": "accounts/110282085537459786752/locations/6879839537954758895",
      "appealId": "12988001733728830696",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-20T12:07:33.724Z",
      "rtId": [],
      "name": [],
      "address": [],
      "score": [],
      "timezone": [],
      "disabled": []
  }, {
      "email": "gsheena639@gmail.com",
      "place_id": "ChIJQxr0TLwVq4kRovNwK_6BRvs",
      "locationName": "accounts/me/locations/9741622799963011604",
      "appealId": "12410605457387215250",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-27T02:42:48.427Z",
      "rtId": [],
      "name": [],
      "address": [],
      "score": [],
      "timezone": [],
      "disabled": []
  }, {
      "email": "jm4846286@gmail.com",
      "place_id": "ChIJFc1ZjCa3pIcR46T1MfwZHNA",
      "locationName": "accounts/106234558406331749962/locations/7854400143668032318",
      "appealId": "09324910947983440380",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-13T22:48:35.429Z",
      "rtId": ["5ebda25f09e2bf378e7257fb"],
      "name": ["King Wok"],
      "address": ["1500 E 11th Ave # 65, Hutchinson, KS 67501, USA"],
      "score": [1.71],
      "timezone": [],
      "disabled": []
  }, {
      "email": "daryldrake35@gmail.com",
      "place_id": "ChIJ25JRRwar3IARojMWeDCY7a4",
      "locationName": "accounts/me/locations/17037673357699103774",
      "appealId": "13609458933134468679",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-28T22:25:29.819Z",
      "rtId": ["5dbcb96a2f3cd383d3f73549"],
      "name": ["Rui's Shanghai Bistro"],
      "address": ["1711 W Lugonia Ave Ste 101, Redlands, CA 92374, USA"],
      "score": [11],
      "timezone": [],
      "disabled": []
  }, {
      "email": "windywells8974@gmail.com",
      "place_id": "ChIJVdu0dXlhZIgRHaJQgDHQ464",
      "locationName": "accounts/106214225928069920125/locations/117632796376825175",
      "appealId": "04807934873877504924",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-28T16:19:24.597Z",
      "rtId": ["5c9223252c667c6b2eb44d50"],
      "name": ["Siam Cuisine"],
      "address": ["265 White Bridge Pike E, Nashville, TN 37209, USA"],
      "score": [7.14],
      "timezone": [],
      "disabled": []
  }, {
      "email": "ekatirinagindina6@gmail.com",
      "place_id": "ChIJWRax5I5P2YAR2sH2YIKcWyc",
      "locationName": "accounts/117151890395980439207/locations/2965730396171746430",
      "appealId": "15977680057212743754",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-28T12:25:37.511Z",
      "rtId": ["5f73b30bc34efdfe9279ba61"],
      "name": ["Pho Convoy Noodle House"],
      "address": ["945 Otay Lakes Rd, Chula Vista, CA 91913, USA"],
      "score": [6.43],
      "timezone": [],
      "disabled": []
  }, {
      "email": "ekatirinagindina6@gmail.com",
      "place_id": "ChIJfZEysZBbCogRb9E9sysj0ng",
      "locationName": "accounts/117151890395980439207/locations/3260727012557602594",
      "appealId": "16258179248452719025",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-01T06:14:12.382Z",
      "rtId": ["5b34244f8e840d14006f8abc"],
      "name": ["Sushi Popo"],
      "address": ["4700 N University St, Peoria, IL 61614, USA"],
      "score": [6.57],
      "timezone": [],
      "disabled": []
  }, {
      "email": "irvinttoooa@gmail.com",
      "place_id": "ChIJqap_CenkjYARm5xvAqI7NLk",
      "locationName": "accounts/108786312299960748640/locations/4374454191244111723",
      "appealId": "15118359171136467438",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-05T13:15:34.884Z",
      "rtId": ["5e59aaa22ec19e92fd2e4293"],
      "name": ["Lucky Bamboo Chinese Restaurant"],
      "address": ["1784 Fremont Blvd, Seaside, CA 93955, USA"],
      "score": [5.14],
      "timezone": [],
      "disabled": []
  }, {
      "email": "queensvjp@gmail.com",
      "place_id": "ChIJEVrN2CPnj4ARQ-wLgfooZsc",
      "locationName": "accounts/101729657374461836598/locations/16358672268339652329",
      "appealId": "03353229130522109728",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-28T14:09:57.188Z",
      "rtId": ["5df8be612f3cd383d32810c8"],
      "name": ["Sai's T Restaurant"],
      "address": ["961 Bluebell Dr, Livermore, CA 94551, USA"],
      "score": [3.57],
      "timezone": [],
      "disabled": []
  }, {
      "email": "gradykgo3@gmail.com",
      "place_id": "ChIJm7-eT4l_j4ARsy9_KE1sDVU",
      "locationName": "accounts/112652409160964338787/locations/16454241744011584117",
      "appealId": "09686471669690835707",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-05T13:12:06.761Z",
      "rtId": ["5eb497c709e2bf378e15033e"],
      "name": ["Win Garden"],
      "address": ["2794 Diamond St, San Francisco, CA 94131, USA"],
      "score": [5.43],
      "timezone": [],
      "disabled": []
  }, {
      "email": "financemfnl@gmail.com",
      "place_id": "ChIJG2oUKFbRyIARKVBEcCIpzz0",
      "locationName": "accounts/113374152775452562277/locations/1273392470331012580",
      "appealId": "07442504331247325023",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-18T23:53:47.343Z",
      "rtId": ["5fff6183cdf3f01e2fdea3cf"],
      "name": ["Kungfu Noodle"],
      "address": ["605 Mall Ring Cir Ste 120, Henderson, NV 89014, USA"],
      "score": [2.33],
      "timezone": [],
      "disabled": []
  }, {
      "email": "naturehxih@gmail.com",
      "place_id": "ChIJk9VDpyuCbIcRRgxRwBb9p18",
      "locationName": "accounts/115765665293851464343/locations/15021211032168886389",
      "appealId": "04591616021145914397",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-20T22:41:37.306Z",
      "rtId": ["5e8161f22ec19e92fd52b223"],
      "name": ["Little Basil Asian Grill - old"],
      "address": ["7923 S Broadway, Littleton, CO 80122, USA"],
      "score": [9.57],
      "timezone": [],
      "disabled": [true]
  }, {
      "email": "naturehxih@gmail.com",
      "place_id": "ChIJ85yP_AGolVQRIj2SFpV-smA",
      "locationName": "accounts/115765665293851464343/locations/7395352719879591298",
      "appealId": "16964327117838099978",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-07T21:36:34.161Z",
      "rtId": ["5deebd742f3cd383d3221158"],
      "name": ["The Wishing Well Restaurant"],
      "address": ["8800 N Lombard St #3735, Portland, OR 97203, USA"],
      "score": [1.86],
      "timezone": [],
      "disabled": []
  }, {
      "email": "kentonnjr10@gmail.com",
      "place_id": "ChIJEwm1DfW3t4kRTAsMjaFJxZs",
      "locationName": "accounts/111534197380600702012/locations/18302548209223463322",
      "appealId": "16489137722945182844",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-23T21:45:53.758Z",
      "rtId": [],
      "name": [],
      "address": [],
      "score": [],
      "timezone": [],
      "disabled": []
  }, {
      "email": "skoblyakovasasha6@gmail.com",
      "place_id": "ChIJBz-dtpT_24ARqU5KH38JdtU",
      "locationName": "accounts/105143184350194487132/locations/11759156854290859608",
      "appealId": "05871071438319820612",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-23T02:18:32.604Z",
      "rtId": ["5e608a082ec19e92fdf1adac"],
      "name": ["Chef Chin"],
      "address": ["4433 Convoy St, San Diego, CA 92111, USA"],
      "score": [2.14],
      "timezone": [],
      "disabled": []
  }, {
      "email": "yq2m7w2225@gmail.com",
      "place_id": "ChIJ0600vjN2f4gRHZ32LazhKgw",
      "locationName": "accounts/116613971079032899604/locations/16126236001929850302",
      "appealId": "08986673777862151764",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-01T17:02:57.590Z",
      "rtId": ["5ed962318b6849feeca54a44"],
      "name": ["Asian Kitchen"],
      "address": ["7605 U.S. 70 #104 (next to, Kroger, Bartlett, TN 38133, USA"],
      "score": [11.43],
      "timezone": [],
      "disabled": []
  }, {
      "email": "wm.frazier12455@gmail.com",
      "place_id": "ChIJaaAjK9YH9YgR1bE0NjJe_c8",
      "locationName": "accounts/103460302869698125740/locations/18404600601728496310",
      "appealId": "11265708661913595204",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-16T16:36:55.138Z",
      "rtId": ["5aa36b69aac7061400dccae7"],
      "name": ["Chopsticks"],
      "address": ["2088 Briarcliff Rd NE, Atlanta, GA 30329, USA"],
      "score": [2.57],
      "timezone": [],
      "disabled": []
  }, {
      "email": "deborahghwalker@gmail.com",
      "place_id": "ChIJqfka93N8u4cRP7qo2RBogVU",
      "locationName": "accounts/111639240013624238866/locations/17880987793367497265",
      "appealId": "07726018432494083437",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-10T21:09:02.945Z",
      "rtId": ["5fd039dbaa8b1e69e641cf11"],
      "name": ["Panda Kitchen"],
      "address": ["107 W Grand Ave, Hillsboro, KS 67063, USA"],
      "score": [1.43],
      "timezone": [],
      "disabled": []
  }, {
      "email": "deborahghwalker@gmail.com",
      "place_id": "ChIJ-S2wbHMphYARKMsmrS5N9dI",
      "locationName": "accounts/111639240013624238866/locations/18250769993668593043",
      "appealId": "07501683674726130098",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-16T05:21:23.462Z",
      "rtId": ["5b9b1590ac400914000b3387", "5ef692198b6849feec1b71c1"],
      "name": ["Uniboil - old", "Uniboil"],
      "address": ["132 E St, Davis, CA 95616, USA", "132 E St, Davis, CA 95616, USA"],
      "score": [1, 1.43],
      "timezone": [],
      "disabled": [true]
  }, {
      "email": "bettyghbarnes@gmail.com",
      "place_id": "ChIJLXn2xel-wokRRnoeqtyKvDg",
      "locationName": "accounts/106247001126115046403/locations/15337980737288622640",
      "appealId": "12666243832656642505",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-07T22:54:16.244Z",
      "rtId": ["6019aa84d91b785a39a65f56"],
      "name": ["Komo"],
      "address": ["221 Bedford Ave, Bellmore, NY 11710, USA"],
      "score": [0],
      "timezone": [],
      "disabled": []
  }, {
      "email": "kathyghcarter@gmail.com",
      "place_id": "ChIJBdR_fAGD5IkRm0yBr5Kpwk4",
      "locationName": "accounts/101436980990947304426/locations/9236622264408193937",
      "appealId": "15135222660960782893",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-01T19:12:43.116Z",
      "rtId": ["60089ddbd91b785a391da830"],
      "name": ["C & J Cuisine"],
      "address": ["183 S Main St, Randolph, MA 02368, USA"],
      "score": [3],
      "timezone": [],
      "disabled": []
  }, {
      "email": "stafrisaetjhoiuiy419@gmail.com",
      "place_id": "ChIJTcr80LZvYIgRwNr1df4JJ70",
      "locationName": "accounts/115154420919596415196/locations/11116368964800695592",
      "appealId": "18335222241060178147",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-28T02:27:15.970Z",
      "rtId": ["5ffec397cdf3f01e2f75c890"],
      "name": ["New China"],
      "address": ["69 Poplar Springs Rd, Ringgold, GA 30736, USA"],
      "score": [1.67],
      "timezone": [],
      "disabled": []
  }, {
      "email": "stafrisaetjhoiuiy419@gmail.com",
      "place_id": "ChIJF5hfmtwH5IkRaq_9Argsx7Y",
      "locationName": "accounts/115154420919596415196/locations/395842994372592662",
      "appealId": "13557239423107951508",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-15T11:06:37.876Z",
      "rtId": [],
      "name": [],
      "address": [],
      "score": [],
      "timezone": [],
      "disabled": []
  }, {
      "email": "sephnifierarw473@gmail.com",
      "place_id": "ChIJ__8_2DpMtokReP87H5PPKSI",
      "locationName": "accounts/114526027404584905920/locations/8183243144463099634",
      "appealId": "16855414924627602531",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-16T03:35:41.603Z",
      "rtId": ["5d8d594f2f3cd383d3fb4d70"],
      "name": ["China Star"],
      "address": ["9600 Main St, Fairfax, VA 22031, USA"],
      "score": [6.14],
      "timezone": [],
      "disabled": []
  }, {
      "email": "sephnifierarw473@gmail.com",
      "place_id": "ChIJsa5xHLgz6IkR2p4OvBYOwX8",
      "locationName": "accounts/114526027404584905920/locations/9876315033649700257",
      "appealId": "09739158165452203478",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-01T19:11:05.620Z",
      "rtId": ["5e41bef22ec19e92fd4faa81"],
      "name": ["Hong Hing"],
      "address": ["1527 Brentwood Rd, Bay Shore, NY 11706, USA"],
      "score": [1.43],
      "timezone": [],
      "disabled": []
  }, {
      "email": "sephnifierarw473@gmail.com",
      "place_id": "ChIJLwtjaMv3kYARsS5Trdq6icA",
      "locationName": "accounts/114526027404584905920/locations/16174586430476557621",
      "appealId": "15790743504901405013",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-16T04:03:17.887Z",
      "rtId": ["5d09ac382c667c6b2eb45321"],
      "name": ["The Wok"],
      "address": ["355 San Felipe Rd, Hollister, CA 95023, USA"],
      "score": [3.43],
      "timezone": [],
      "disabled": []
  }, {
      "email": "rachelghrogers@gmail.com",
      "place_id": "ChIJVUmd_G-WkIgRs36ZCTM6OkE",
      "locationName": "accounts/114072410211683702919/locations/11916472263523354259",
      "appealId": "07253757574220667977",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-07T22:27:17.972Z",
      "rtId": ["5f2df58644fcce5f3bf8674c"],
      "name": ["Great China"],
      "address": ["2170 W 9 Mile Rd, Pensacola, FL 32534, USA"],
      "score": [7.14],
      "timezone": [],
      "disabled": []
  }, {
      "email": "sarahfgwood@gmail.com",
      "place_id": "ChIJ7Vhi4qzFyIARO3kWzzwZaRc",
      "locationName": "accounts/100990610057574638481/locations/4343168115556318941",
      "appealId": "17011721949167547811",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-20T04:32:39.393Z",
      "rtId": ["600667b21c2c51a839882396"],
      "name": ["Big Mama's Pizza"],
      "address": ["4110 S Maryland Pkwy, Las Vegas, NV 89119, USA"],
      "score": [1.6],
      "timezone": [],
      "disabled": []
  }, {
      "email": "sarahfgwood@gmail.com",
      "place_id": "ChIJ_8_MVbBtaYgRy1TRf-wPGW0",
      "locationName": "accounts/100990610057574638481/locations/7157500590420954942",
      "appealId": "13904685383378342732",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-20T14:40:49.656Z",
      "rtId": [],
      "name": [],
      "address": [],
      "score": [],
      "timezone": [],
      "disabled": []
  }, {
      "email": "sarahfgwood@gmail.com",
      "place_id": "ChIJl-VhOL-HwokRt266XCg6Vdg",
      "locationName": "accounts/100990610057574638481/locations/1223682249388256342",
      "appealId": "08474209092491510536",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-01T21:19:38.532Z",
      "rtId": ["5c888372e5779ea6a97044a1", "5f554dfa20f825bc72db4ec6"],
      "name": ["TJ Chinese and Mexican Restaurant - old", "TJ Chinese and Mexican Restaurant"],
      "address": ["579 Willis Ave #1, Williston Park, NY 11596, USA", "579 Willis Ave #1, Williston Park, NY 11596, USA"],
      "score": [2.43, 2.43],
      "timezone": [],
      "disabled": [true]
  }, {
      "email": "ythrasdgh589@gmail.com",
      "place_id": "ChIJHeZovVdBzoARsJ7t-mYCgos",
      "locationName": "accounts/106567835546046083713/locations/863938526988980673",
      "appealId": "10914195173351871755",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-01T06:14:25.805Z",
      "rtId": ["601233ced91b785a393586d1"],
      "name": ["China Panda Restaurant"],
      "address": ["2164 AZ-95, Bullhead City, AZ 86442, USA"],
      "score": [0],
      "timezone": [],
      "disabled": []
  }, {
      "email": "graddadst693@gmail.com",
      "place_id": "ChIJ_QDiO3Jv54gRFvF1wLX0uo0",
      "locationName": "accounts/106449035955928446751/locations/10451124397892609410",
      "appealId": "01163502447238556102",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-08T18:19:28.710Z",
      "rtId": ["5f03cb758b6849feec309e2c"],
      "name": ["China Chef"],
      "address": ["4042 N Goldenrod Rd, Winter Park, FL 32792, USA"],
      "score": [8],
      "timezone": [],
      "disabled": []
  }, {
      "email": "pamelaghreed@gmail.com",
      "place_id": "ChIJuSIX9bvVTYYRAuJI0wyS5gw",
      "locationName": "accounts/114187963794489783687/locations/16218548907617877745",
      "appealId": "05192810791855218531",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-13T22:35:13.806Z",
      "rtId": [],
      "name": [],
      "address": [],
      "score": [],
      "timezone": [],
      "disabled": []
  }, {
      "email": "pamelaghreed@gmail.com",
      "place_id": "ChIJuSRLfDG7D4gReOeuz9sfNCQ",
      "locationName": "accounts/114187963794489783687/locations/16062076184133615310",
      "appealId": "10185235236668762776",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-16T11:25:37.042Z",
      "rtId": ["5e6aa68a2ec19e92fd3d39a3"],
      "name": ["Chopstick"],
      "address": ["1930 W Central Rd, Rolling Meadows, IL 60008, USA"],
      "score": [11.29],
      "timezone": [],
      "disabled": []
  }, {
      "email": "pamelaghreed@gmail.com",
      "place_id": "ChIJO2sRJAMV44kR-dntbFMQOMI",
      "locationName": "accounts/114187963794489783687/locations/9379575423269857042",
      "appealId": "14945739606495835547",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-01T06:38:45.691Z",
      "rtId": ["5e710bfb2ec19e92fd1f664a"],
      "name": ["Fen Yang House"],
      "address": ["40 Atlantic Ave #4, Marblehead, MA 01945, USA"],
      "score": [19.14],
      "timezone": [],
      "disabled": []
  }, {
      "email": "seodehdr683@gmail.com",
      "place_id": "ChIJR0e2nYco2YgRNxsuVFlmTQA",
      "locationName": "accounts/104051723142136342711/locations/17190916195969946196",
      "appealId": "15930295976434601479",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-06T01:49:38.712Z",
      "rtId": ["5f34988944fcce5f3b8cb133"],
      "name": ["China Uno"],
      "address": ["6332 Forest Hill Blvd, Greenacres, FL 33415, USA"],
      "score": [4.29],
      "timezone": [],
      "disabled": []
  }, {
      "email": "gloriajhevans@gmail.com",
      "place_id": "ChIJldElXFJhXIYRZnpEGJ-Vz2w",
      "locationName": "accounts/103602951356488858414/locations/14907150245010080967",
      "appealId": "12066180351697191573",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-23T20:27:25.237Z",
      "rtId": ["5e169de02f3cd383d363189d"],
      "name": ["Viva Pho"],
      "address": ["2114 NW Military Hwy, Castle Hills, TX 78213, USA"],
      "score": [4.14],
      "timezone": [],
      "disabled": []
  }, {
      "email": "sakurakingfl@gmail.com",
      "place_id": "ChIJSUgCk_642YgRq2QfZunn18c",
      "locationName": "accounts/118399030191860675410/locations/12969315026643487950",
      "appealId": "06528927101696980274",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-27T18:42:00.851Z",
      "rtId": [],
      "name": [],
      "address": [],
      "score": [],
      "timezone": [],
      "disabled": []
  }, {
      "email": "sharonhjrivera@gmail.com",
      "place_id": "ChIJfaZHQ-W2JoYRoGWHuLCvuic",
      "locationName": "accounts/104796617490690320300/locations/14441232436679463341",
      "appealId": "04507235262951773001",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-24T14:29:55.730Z",
      "rtId": [],
      "name": [],
      "address": [],
      "score": [],
      "timezone": [],
      "disabled": []
  }, {
      "email": "istrophewgdfty489@gmail.com",
      "place_id": "ChIJO2sRJAMV44kR-dntbFMQOMI",
      "locationName": "accounts/108925880711361669499/locations/1380693104124833073",
      "appealId": "15187362052459881480",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-21T22:18:10.261Z",
      "rtId": ["5e710bfb2ec19e92fd1f664a"],
      "name": ["Fen Yang House"],
      "address": ["40 Atlantic Ave #4, Marblehead, MA 01945, USA"],
      "score": [19.14],
      "timezone": [],
      "disabled": []
  }, {
      "email": "istrophewgdfty489@gmail.com",
      "place_id": "ChIJwaDY1i566lIRRVJHbQ5onSc",
      "locationName": "accounts/108925880711361669499/locations/3142103038039576147",
      "appealId": "09289066525946443727",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2020-12-27T03:57:29.985Z",
      "rtId": ["5e532f672ec19e92fd4080b1"],
      "name": ["Tasty Chinese Cuisine"],
      "address": ["129 Regent Ave W, Winnipeg, MB R2C 1R1, Canada"],
      "score": [1],
      "timezone": [],
      "disabled": [true]
  }, {
      "email": "qwert9204@gmail.com",
      "place_id": "ChIJvQ-0CFdFwokRtfkIrNtefnI",
      "locationName": "accounts/100731199769530167839/locations/17535673506010665265",
      "appealId": "11567682378002128916",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-05T21:25:26.045Z",
      "rtId": ["5b473554140023140072df49"],
      "name": ["Panda Chinese Restaurant"],
      "address": ["7018 3rd Ave, Brooklyn, NY 11209, USA"],
      "score": [2.29],
      "timezone": [],
      "disabled": []
  }, {
      "email": "rlaguswhd0@gmail.com",
      "place_id": "ChIJObTiLo_bwoARfFgzlEfqFUM",
      "locationName": "accounts/113606636151766330070/locations/14719769407588930968",
      "appealId": "08915083914573221134",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-01T14:25:27.530Z",
      "rtId": ["5bebbf714c304db9cabee0e2"],
      "name": ["Crawplay"],
      "address": ["10502 Lower Azusa Rd, El Monte, CA 91731, USA"],
      "score": [1],
      "timezone": [],
      "disabled": []
  }, {
      "email": "rlaguswhd0@gmail.com",
      "place_id": "ChIJkYCXLwqj9YgRxoxg2shXO4g",
      "locationName": "accounts/113606636151766330070/locations/1112048619673446585",
      "appealId": "14176233289392312891",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-28T12:24:59.797Z",
      "rtId": [],
      "name": [],
      "address": [],
      "score": [],
      "timezone": [],
      "disabled": []
  }, {
      "email": "ridethecom@gmail.com",
      "place_id": "ChIJ3QEhEtV5J4YR5VKfCALFhkw",
      "locationName": "accounts/116014273343349806544/locations/686617910935563672",
      "appealId": "11555462537003949627",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-05T23:35:47.811Z",
      "rtId": ["5bd7b5794c304db9cabe973a"],
      "name": ["Grand Chinese Buffet"],
      "address": ["1601 Washington St, Franklinton, LA 70438, USA"],
      "score": [3.57],
      "timezone": [],
      "disabled": []
  }, {
      "email": "ridethecom@gmail.com",
      "place_id": "ChIJobBNDW5FwokRRKdRANWcR0Y",
      "locationName": "accounts/116014273343349806544/locations/13375013216410350678",
      "appealId": "03473201465305564380",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-28T15:53:44.702Z",
      "rtId": ["5b078ac2894fff140092890a"],
      "name": ["Linghu Chong"],
      "address": ["5523 7th Ave, Brooklyn, NY 11220, USA"],
      "score": [1],
      "timezone": [],
      "disabled": []
  }, {
      "email": "qkswn1663@gmail.com",
      "place_id": "ChIJqyOKEHKR9YgRMKDKwAc2vCU",
      "locationName": "accounts/106508759789322468407/locations/10816032957415716033",
      "appealId": "13946178750909281202",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-24T17:55:05.071Z",
      "rtId": [],
      "name": [],
      "address": [],
      "score": [],
      "timezone": [],
      "disabled": []
  }, {
      "email": "karlmanngita9375@gmail.com",
      "place_id": "ChIJF_23XAhhwokRUpFhhXrS-FI",
      "locationName": "accounts/117754646028012001597/locations/10991463744310790025",
      "appealId": "06117662996034454009",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-16T13:59:00.715Z",
      "rtId": ["5b38d71a59e9b014007f0387"],
      "name": ["China King Express"],
      "address": ["146-13 Archer Ave, Jamaica, NY 11435, USA"],
      "score": [1],
      "timezone": [],
      "disabled": []
  }, {
      "email": "karlmanngita9375@gmail.com",
      "place_id": "ChIJOwyMa5Ex34cRQXu3GrAxwyg",
      "locationName": "accounts/117754646028012001597/locations/8051578575920774142",
      "appealId": "04560793384459420927",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-20T15:57:30.848Z",
      "rtId": ["5ec18b5109e2bf378e1a7bd6"],
      "name": ["New China Buffet"],
      "address": ["12190 St Charles Rock Rd, Bridgeton, MO 63044, USA"],
      "score": [2],
      "timezone": [],
      "disabled": []
  }, {
      "email": "readwoodmelizza3098@gmail.com",
      "place_id": "ChIJdS92YG5K3YARp9exnSgvHP8",
      "locationName": "accounts/115321201735287306911/locations/2261624235285946047",
      "appealId": "02731710765688569908",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-24T14:27:22.506Z",
      "rtId": [],
      "name": [],
      "address": [],
      "score": [],
      "timezone": [],
      "disabled": []
  }, {
      "email": "readwoodmelizza3098@gmail.com",
      "place_id": "ChIJU9baAIV_ToYRgmdvYEcb32I",
      "locationName": "accounts/115321201735287306911/locations/3035149787097810822",
      "appealId": "10512255214767233834",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-01-24T12:17:16.628Z",
      "rtId": ["5e70fd022ec19e92fd18b554"],
      "name": ["Szechuan Cafe"],
      "address": ["505 N Industrial Blvd Ste 1000, Bedford, TX 76021, USA"],
      "score": [5.29],
      "timezone": [],
      "disabled": []
  }, {
      "email": "selfdarylann3606@gmail.com",
      "place_id": "ChIJw7tteT4stokRpKLjPyE-UYA",
      "locationName": "accounts/105319901553642482153/locations/15048028502757484657",
      "appealId": "02450032895440023510",
      "reinstateLog": "locations.reinstateLog",
      "lastAt": "2021-02-01T18:47:16.921Z",
      "rtId": ["5cf9b8c32c667c6b2eb452a0"],
      "name": ["Asia Cafe"],
      "address": ["12937 Wisteria Dr, Germantown, MD 20874, USA"],
      "score": [2.43],
      "timezone": [],
      "disabled": []
  }
];

  }

}
