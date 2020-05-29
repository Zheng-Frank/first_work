const domain = process.argv[2];
const distributionId = process.argv[3];
if(!domain || !distributionId) {
    throw "Failed. Call example: node deploy csr.qmenu.us EONS08EC2015T, where first param is domain and second is distributionId";
}
const AWS = require('aws-sdk');
const fs = require('fs');
//configuring the AWS environment
AWS.config.update({
    region: 'us-east-1',
});
const s3 = new AWS.S3();
const cloudfront = new AWS.CloudFront();
const mime = require('mime-types');

const bucketName = `qmenu-domains/${domain}`;
const folder = "./dist/admin";

async function run() {
    const files = fs.readdirSync(folder);
    /// ONLY push ones with postfixes
    const caredFiles = files.filter(f => f.split(".").length > 1);

    // push to S3 bucket
    for (let file of caredFiles) {
        const contentType = mime.lookup(file);
        console.log(file, contentType);
        const objectParams = { Bucket: bucketName, Key: file, Body: fs.readFileSync(`${folder}/${file}`), ACL: "public-read", ContentType: contentType };
        await s3.putObject(objectParams).promise();
    }

    // invalidate Cloudfront
    const cloudfrontParams = {
        DistributionId: distributionId, /* required */
        InvalidationBatch: { /* required */
            CallerReference: new Date().valueOf().toString(), // "Invalidation:" + distId, /* required */
            Paths: { /* required */
                Quantity: 1, /* required */
                Items: [
                    '/index.html',
                    /* more items */
                ]
            }
        }
    };
    const invlidation = await cloudfront.createInvalidation(cloudfrontParams).promise();
    console.log(invlidation);
}

run().then(console.log).catch(console.error);
