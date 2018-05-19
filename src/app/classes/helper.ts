declare var AWS: any;

export class Helper {
    static uploadImage(awsAccessKeyId, awsSecretAccessKey, files: File[], callback) {
        if (files && files.length > 0 && files[0].type.indexOf('image') < 0) {
            callback('Invalid file type. Choose image only.', null);
        } else if (files && files.length > 0 && files[0].size > 10000000) {
            callback('The image size exceeds 10M.', null);
        } else {

            AWS.config.accessKeyId = awsAccessKeyId;
            AWS.config.secretAccessKey = awsSecretAccessKey;

            let file = files[0];
            let uuid = new Date().valueOf();
            let ext = file.name.split('.').pop();

            let bucket = new AWS.S3({ params: { Bucket: 'chopst', ContentType: 'image/jpeg' } });
            let imageFile = { Key: 'menuImage/' + uuid + '.' + ext, Body: file };
            bucket.upload(imageFile, callback);
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
}