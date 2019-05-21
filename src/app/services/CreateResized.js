// dependencies
var async = require('async');
var AWS = require('aws-sdk');
var gm = require('gm').subClass({ imageMagick: true }); // Enable ImageMagick integration.
var util = require('util');

// constants
var SIZES = [96, 128, 768];

// get reference to S3 client 
var s3 = new AWS.S3();

exports.handler = function (event, context) {

    // Read options from the event.
    console.log("Reading options from event:\n", util.inspect(event, { depth: 5 }));
    var srcBucket = event.Records[0].s3.bucket.name;
    var srcKey = event.Records[0].s3.object.key;
    var dstBucket = srcBucket + "resized";

    // Infer the image type.
    var typeMatch = srcKey.match(/\.([^.]*)$/);
    if (!typeMatch) {
        console.error('unable to infer image type for key ' + srcKey);
        return context.done();
    }
    var imageType = typeMatch[1];
    // if (imageType != "jpg" && imageType != "png") {
    //     console.log('skipping non-image ' + srcKey);
    //     return context.done();
    // }

    // Sanity check: validate that source and destination are different buckets.
    if (srcBucket == dstBucket) {
        console.error("Destination bucket must not match source bucket.");
        return context.done();
    }

    // Download the image from S3
    s3.getObject({
        Bucket: srcBucket,
        Key: srcKey
    },
        function (err, response) {

            if (err)
                return console.error('unable to download image ' + err);

            var contentType = response.ContentType;

            var original = gm(response.Body);
            original.size(function (err, size) {

                if (err)
                    return console.error(err);

                //transform, and upload to a different S3 bucket.
                async.each(SIZES,
                    function (max_size, callback) {
                        resize_photo(size, max_size, imageType, original, srcKey, dstBucket, contentType, callback);
                    },
                    function (err) {
                        if (err) {
                            console.error(
                                'Unable to resize ' + srcBucket +
                                ' due to an error: ' + err
                            );
                        } else {
                            console.log(
                                'Successfully resized ' + srcBucket
                            );
                        }

                        context.done();
                    });
            });


        });



};

//wrap up variables into an options object
var resize_photo = function (size, max_size, imageType, original, srcKey, dstBucket, contentType, done) {

    var dstKey = max_size + "_" + srcKey;


    // transform, and upload to a different S3 bucket.
    async.waterfall([

        function transform(next) {


            // Infer the scaling factor to avoid stretching the image unnaturally.
            var scalingFactor = Math.min(
                max_size / size.width,
                max_size / size.height
            );
            var width = scalingFactor * size.width;
            var height = scalingFactor * size.height;


            // Transform the image buffer in memory.
            console.log('MegaXu width=', width);
            console.log('MegaXu max_size=', max_size);

            // gm('/path/to/image.jpg')
            //     .resize('200', '200', '^')
            //     .gravity('Center')
            //     .crop('200', '200')
            //     .write(writeStream, function (err) {
            //         if (!err) console.log(' hooray! ');
            //     });

            // original.resize(max_size, max_size).autoOrient()
            //     .toBuffer(imageType, function(err, buffer) {

            //         if (err) {
            //             next(err);
            //         } else {
            //             next(null, buffer);
            //         }
            //     });

            original.autoOrient().resize(max_size, max_size, '^').gravity('Center').crop(max_size, max_size)
                .toBuffer(imageType, function (err, buffer) {
                    if (err) {
                        next(err);
                    } else {
                        next(null, buffer);
                    }
                });

        },
        function upload(data, next) {
            // Stream the transformed image to a different S3 bucket.
            s3.putObject({
                Bucket: dstBucket,
                Key: dstKey,
                Body: data,
                ContentType: contentType
            },
                next);
        }
    ], function (err) {

        console.log('finished resizing ' + dstBucket + '/' + dstKey);

        if (err) {
            console.error(err)
                ;
        } else {
            console.log(
                'Successfully resized ' + dstKey
            );
        }

        done(err);
    }
    );
};