import { environment } from '../../environments/environment';
import { ApiService } from '../services/api.service';
import { Address } from '@qmenu/ui';
import { HttpClient } from '@angular/common/http';

const FULL_LOCALE_OPTS = {year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit'}
export class Helper {

    static async uploadImage(files: File[], _api: ApiService, _http: HttpClient) {
        // let's take only the first file so far (possible for multiple files in future)
        const [file] = files;
        if (file.type.indexOf('image') < 0) {
            throw 'Invalid file type. Choose image only.';
        } else if (file.size > 20000000) {
            throw 'The image size exceeds 20M.';
        } else {
            const apiPath = `utils/s3-signed-url?contentType=${file.type}&prefix=menuImage&extension=${file.name.split('.').pop()}&bucket=chopst&expires=3600`;
            // Get presigned url
            try {
                const response = await _api.get(environment.appApiUrl + apiPath).toPromise();
                const presignedUrl = response['url'];
                await _http.put(presignedUrl, file).toPromise();
                return { Location: presignedUrl.slice(0, presignedUrl.indexOf("?")) };
            } catch (error) {
                throw "Failed to get presigned Url";
            }
        }
    }

    static areObjectsEqual(obj1, obj2) {
        if (Object.is(obj1, obj2)) {
            return true;
        }
        // now make sure obj1 and obj2 have same keys
        if (typeof obj1 !== typeof obj2 || typeof obj1 !== 'object') {
            return false;
        }
        // date compare
        if (obj1 instanceof Date) {
          return obj1.valueOf() === obj2.valueOf();
        }

        const keys1 = Object.getOwnPropertyNames(obj1);
        const keys2 = Object.getOwnPropertyNames(obj2);
        if (keys1.length !== keys2.length || keys1.some(k1 => keys2.indexOf(k1) < 0)) {
            return false;
        }

        if (keys1.some(k1 => !Helper.areObjectsEqual(obj1[k1], obj2[k1]))) {
            return false;
        }
        return true;
    }

    static getFileName(url) {
        if (!url) {
            return url;
        }
        let fileNameIndex = url.lastIndexOf('/') + 1;
        if (fileNameIndex <= 0) {
            fileNameIndex = url.lastIndexOf('\\') + 1;
        }
        if (fileNameIndex <= 0) {
            return url;
        }
        return url.substr(fileNameIndex);
    }

    static getThumbnailUrl(originalUrl): string {
        return originalUrl && environment.thumnailUrl + this.getFileName(originalUrl);
    }

    static getNormalResUrl(originalUrl): string {
        return originalUrl && environment.normalResUrl + this.getFileName(originalUrl);
    }

    static areDomainsSame(d1: string, d2: string): boolean {
        if (!d1 || !d2) {
            return false;
        }
        // stripe remove things before / and after /
        if (!d1.startsWith('http:') && !d1.startsWith('https:')) {
            d1 = 'http://' + d1;
        }

        if (!d2.startsWith('http:') && !d2.startsWith('https:')) {
            d2 = 'http://' + d2;
        }

        let host1 = new URL(d1).host;
        let host2 = new URL(d2).host;
        // treating www as nothing
        if (!host1.startsWith('www.')) {
            host1 = 'www.' + host1;
        }
        if (!host2.startsWith('www.')) {
            host2 = 'www.' + host2;
        }
        return host1 === host2;
    }

    static getTopDomain(url: string): string {
        if (!url) {
            return;
        }

        // remove things before / and after /
        if (!url.startsWith('http:') && !url.startsWith('https:')) {
            url = 'http://' + url;
        }
        try {
            let host = new URL(url).host;
            // keep ONLY last two (NOT GOOD for other country's domain)
            return host.split('.').slice(-2).join('.');
        } catch (error) {
            console.log(url);
            return;
        }
    }


    static processBatchedPromises(promises): any {
        return Promise.all(promises.map(p => new Promise((resolve, reject) => {
            p.then(data => {
                resolve({ result: data, success: true });
            }).catch(error => {
                resolve({ result: error, success: false });
            })
        })));
    }

    static getDaysFromId(mongoId, now): any {
        return Math.floor((now.valueOf() - parseInt(mongoId.substring(0, 8), 16) * 1000) / (24 * 3600000));
    }

    static getDesiredUrls(restaurant) {
        const web = restaurant.web || {};
        // refer to https://docs.google.com/document/d/1kUt2QY8Xmx_gO-mQhVxrQoKkcYtV0cHTu1HmfVEUEQY/edit

        const aliasUrl = environment.customerUrl + '#/' + restaurant.alias;
        let restaurantWebsite = (web.bizManagedWebsite || '').trim().toLowerCase();
        let qmenuWebsite = (web.qmenuWebsite || '').trim().toLowerCase();

        // normalize websites!
        if (qmenuWebsite && !qmenuWebsite.startsWith('http')) {
            qmenuWebsite = 'http://' + qmenuWebsite;
        }

        if (restaurantWebsite && !restaurantWebsite.startsWith('http')) {
            restaurantWebsite = 'http://' + restaurantWebsite;
        }

        const insistedWebsite = web.useBizWebsite;
        const insistedAll = web.useBizWebsiteForAll;

        let targetWebsite = qmenuWebsite;

        if (insistedAll || insistedWebsite) {
            targetWebsite = restaurantWebsite || qmenuWebsite;
        }

        let menuUrl = restaurantWebsite || aliasUrl;
        if (web.useBizMenuUrl && web.menuUrl) {
            menuUrl = web.menuUrl;
        } else if (qmenuWebsite && !insistedAll) {
            menuUrl = qmenuWebsite;
        }

        let orderAheadUrl = restaurantWebsite || aliasUrl;
        if (web.useBizOrderAheadUrl && web.orderAheadUrl) {
            orderAheadUrl = web.orderAheadUrl;
        } else if (qmenuWebsite && !insistedAll) {
            orderAheadUrl = qmenuWebsite;
        }

        let reservationUrl = restaurantWebsite || aliasUrl;
        if (web.useBizReservationUrl && web.reservationUrl) {
            reservationUrl = web.reservationUrl;
        } else if (qmenuWebsite && !insistedAll) {
            reservationUrl = qmenuWebsite;
        }
        return {
            website: targetWebsite,
            menuUrl: menuUrl,
            orderAheadUrl: orderAheadUrl,
            reservation: reservationUrl
        };
    }

    static getState(formatted_address) {
        try {
            let addressArray = formatted_address.split(",");
            if (addressArray[addressArray.length - 1] && addressArray[addressArray.length - 1].match(/\b[A-Z]{2}/)) {
                //console.log('address=', address);
                //console.log(address.match(/\b[A-Z]{2}/)[0]);
                let state = addressArray[addressArray.length - 1].match(/\b[A-Z]{2}/)[0];
                return state;
            }
        }
        catch (e) {
            return '';
        }
    }

    static getCity(formatted_address) {
        try {
            let addressArray = formatted_address.split(",");
            if (addressArray[addressArray.length - 2]) {
                //console.log('address=', address);
                //console.log(address.match(/\b[A-Z]{2}/)[0]);
                let city = addressArray[addressArray.length - 2].trim();
                return city;
            }
        }
        catch (e) {
            return '';
        }
    }

    static getZipcode(formatted_address) {
        try {
            let addressArray = formatted_address.split(",");
            if (addressArray[addressArray.length - 1] && addressArray[addressArray.length - 1].match(/\b\d{5}\b/g)) {
                //console.log('address=', address);
                //console.log(address.match(/\b[A-Z]{2}/)[0]);
                let zip = addressArray[addressArray.length - 1].match(/\b\d{5}\b/g)[0].trim();
                return zip;
            }
        }
        catch (e) {
            return '';
        }
    }


    static getAddressLine1(formatted_address) {
        try {
            let addressArray = formatted_address.split(",");
            return addressArray[0];
        }
        catch (e) {
            return '';
        }
    }

    static getLine1(address: Address) {
        if (!address) {
            return 'Address Missing';
        }
        return (address.street_number ? address.street_number : '') + ' '
            + (address.route ? ' ' + address.route : '') +
            (address.apt ? ', ' + address.apt : '');
    }

    static getTimeZone(formatted_address) {
        const tzMap = {
            PDT: ['WA', 'OR', 'CA', 'NV', 'AZ'],
            MDT: ['MT', 'ID', 'WY', 'UT', 'CO', 'NM'],
            CDT: ['ND', 'SD', 'MN', 'IA', 'NE', 'KS',
                'OK', 'TX', 'LA', 'AR', 'MS', 'AL', 'TN', 'MO', 'IL', 'WI'],
            EDT: ['MI', 'IN', 'KY', 'GA', 'FL', 'SC', 'NC', 'VA', 'WV',
                'OH', 'PA', 'NY', 'VT', 'NH', 'ME', 'MA', 'RJ', 'CT',
                'NJ', 'DE', 'MD', 'DC', 'RI'],
            HST: ['HI'],
            AKDT: ['AK']
        };

        let matchedTz = '';
        if (formatted_address && formatted_address.match(/\b[A-Z]{2}/)) {
            //console.log('address=', address);
            //console.log(address.match(/\b[A-Z]{2}/)[0]);
            let state = formatted_address.match(/\b[A-Z]{2}/)[0];

            Object.keys(tzMap).map(tz => {
                if (tzMap[tz].indexOf(state) > -1) {
                    matchedTz = tz;
                }
            });
        }
        return matchedTz;
    }


    static getOffsetNumToEST(timezone: string) {
      if (timezone) {
        const now = new Date();
        const offset = (new Date(now.toLocaleString('en-US', {timeZone: timezone, ...FULL_LOCALE_OPTS})).valueOf()
          - new Date(now.toLocaleString('en-US', {timeZone: 'America/New_York', ...FULL_LOCALE_OPTS})).valueOf()) / 3600000;
        if (offset > 0) {
          return '+' + offset;
        } else {
          return offset;
        }
      } else {
        return '+0';
      }
    }

  /**
   * give a local date, get it's correspond time in given timezone, then convert that time to local time
   * eg. local(New_York): 4/9/2021, 12:30:50 AM, correspond Phoenix time is 4/9/2021, 9:30:50 AM,
   * we'll get a 4/9/2021, 9:30:50 AM show on local
   * @param datetime
   * @param timezone
   */
  static adjustDate(datetime: Date, timezone?: string) {
    return new Date(datetime.toLocaleString('en-US', {timeZone: timezone, ...FULL_LOCALE_OPTS}));
    }

    static sanitizedName(menuItemName) {
        let processedName;

        //remove (Lunch) and numbers
        processedName = (menuItemName || '').toLowerCase().replace(/\(.*?\)/g, "").replace(/[0-9]/g, "").trim()
        processedName = processedName.replace('&', '');
        processedName = processedName.replace('.', ' ');
        // processedName = processedName.replace('w.', ' ');
        // processedName = processedName.replace('with', ' ');

        // Remove non-English characters
        processedName = processedName.replace(/[^\x00-\x7F]/g, '');

        // 19a Sesame Chicken --> Sesame Chicken
        // B Bourbon Chicken --> Bourbon Chicken
        let nameArray = processedName.split(' ');
        for (let i = 0; i < nameArray.length; i++) {
            //remove 19a
            if (/\d/.test(nameArray[i]) || nameArray[i].length === 1) {
                nameArray.splice(i, 1);
            }
        }
        processedName = nameArray.join(' ');
        //remove extra space between words
        processedName = processedName.replace(/\s+/g, " ").trim();
        return processedName;
    }

    static getSalesAgent(rateSchedules, users) {
      let now = Date.now();
      const isEnabled = x => users.some(u => u.username === x.agent && !u.disabled);
      let list = (rateSchedules || []).filter(x => isEnabled(x) && new Date(x.date).valueOf() <= now.valueOf())
        .sort((x, y) => new Date(x.date).valueOf() - new Date(y.date).valueOf());
      let item = list.pop() || {};
      return item.agent || 'N/A';
    }

  static shrink = str => str.trim().replace(/\s+/g, ' ');

  static trim(target: any) {
    switch (typeof target) {
      case 'string':
        return Helper.shrink(target);
      case 'object':
        if (Array.isArray(target)) {
          return target.map(Helper.trim);
        }
        for (let p in target) {
          if (target.hasOwnProperty(p)) {
            target[p] = Helper.trim(target[p]);
          }
        }
        return target;
      default:
        return target;
    }
  }
}
