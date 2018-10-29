import { environment } from '../../environments/environment';
import { ApiService } from '../services/api.service';
declare var AWS: any;

export class Helper {

    static awsAccessKeyId;
    static awsSecretAccessKey;

    static uploadImage(files: File[], callback) {
        if(!Helper.awsAccessKeyId || !Helper.awsSecretAccessKey) {
            callback('Missing AWS kyes. Contact qMenu.', null);
        }
        else if (files && files.length > 0 && files[0].type.indexOf('image') < 0) {
            callback('Invalid file type. Choose image only.', null);
        } else if (files && files.length > 0 && files[0].size > 10000000) {
            callback('The image size exceeds 10M.', null);
        } else {
            AWS.config.accessKeyId = Helper.awsAccessKeyId;
            AWS.config.secretAccessKey = Helper.awsSecretAccessKey;

            let file = files[0];
            let uuid = new Date().valueOf();
            let ext = file.name.split('.').pop();

            let bucket = new AWS.S3({ params: { Bucket: 'chopst', ContentType: 'image/jpeg' } });
            let imageFile = { Key: 'menuImage/' + uuid + '.' + ext, Body: file };
            bucket.upload(imageFile, callback);
        }
    }

    static async uploadImage2(files: File[], _api: ApiService) {

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
        } else if (files && files.length > 0 && files[0].size > 10000000) {
            throw 'The image size exceeds 10M.';
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
}