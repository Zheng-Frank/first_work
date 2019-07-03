import { environment } from '../../environments/environment';
import { ApiService } from '../services/api.service';
import { Address } from '@qmenu/ui';
declare var AWS: any;

export class Helper {

    static awsAccessKeyId;
    static awsSecretAccessKey;

    // static uploadImage(files: File[], callback) {
    //     if(!Helper.awsAccessKeyId || !Helper.awsSecretAccessKey) {
    //         callback('Missing AWS kyes. Contact qMenu.', null);
    //     }
    //     else if (files && files.length > 0 && files[0].type.indexOf('image') < 0) {
    //         callback('Invalid file type. Choose image only.', null);
    //     } else if (files && files.length > 0 && files[0].size > 10000000) {
    //         callback('The image size exceeds 10M.', null);
    //     } else {
    //         AWS.config.accessKeyId = Helper.awsAccessKeyId;
    //         AWS.config.secretAccessKey = Helper.awsSecretAccessKey;

    //         let file = files[0];
    //         let uuid = new Date().valueOf();
    //         let ext = file.name.split('.').pop();

    //         let bucket = new AWS.S3({ params: { Bucket: 'chopst', ContentType: 'image/jpeg' } });
    //         let imageFile = { Key: 'menuImage/' + uuid + '.' + ext, Body: file };
    //         bucket.upload(imageFile, callback);
    //     }
    // }

    static async uploadImage(files: File[], _api: ApiService) {

        if (!Helper.awsAccessKeyId || !Helper.awsSecretAccessKey) {
            const keys = await _api.get(environment.qmenuApiUrl + "generic", {
                resource: "key",
                projection: {
                    awsAccessKeyId: 1,
                    awsSecretAccessKey: 1
                },
                limit: 1
            }).toPromise();

            Helper.awsAccessKeyId = keys[0].awsAccessKeyId;
            Helper.awsSecretAccessKey = keys[0].awsSecretAccessKey;
        }

        if (files && files.length > 0 && files[0].type.indexOf('image') < 0) {
            throw 'Invalid file type. Choose image only.';
        } else if (files && files.length > 0 && files[0].size > 20000000) {
            throw 'The image size exceeds 20M.';
        } else {

            AWS.config.accessKeyId = Helper.awsAccessKeyId;
            AWS.config.secretAccessKey = Helper.awsSecretAccessKey;

            let file = files[0];
            let uuid = new Date().valueOf();
            let ext = file.name.split('.').pop();

            let bucket = new AWS.S3({ params: { Bucket: 'chopst', ContentType: 'image/jpeg' } });
            let imageFile = { Key: 'menuImage/' + uuid + '.' + ext, Body: file };


            return new Promise((resolve, reject) => {
                const callback = function (error, data) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(data);
                    }
                }
                bucket.upload(imageFile, callback);
            });
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

        let host = new URL(url).host;
        // keep ONLY last two (NOT GOOD for other country's domain)
        return host.split('.').slice(-2).join('.');
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

        let aliasRedirect = aliasUrl + (restaurantWebsite ? '?target=' + encodeURIComponent(restaurantWebsite) : '');

        const insistedWebsite = web.useBizWebsite;
        const insistedAll = web.useBizWebsiteForAll;

        let targetWebsite = qmenuWebsite;
        if (!targetWebsite || insistedAll || insistedWebsite) {
            targetWebsite = aliasRedirect;
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
}