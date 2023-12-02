import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
const client = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});

const uploadToS3 = async ({ file, vendorID, userID}) => {
  const key = `${vendorID}/profile/image/${userID}/${file.originalname}`.replace(/ /g, "-");
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });
  try {
    await client.send(command);
    return await getSignedLink({key: key})
    // return { object_key: key, image_link:img_link };
  } catch (err) {
    console.log(err);
    throw err;
  }
};

const getSignedLink = async ({ key }) => {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
  });
  const signedUrl = await getSignedUrl(client, command);
  return {object_key: key, image_link:signedUrl};
};

export { uploadToS3, getSignedLink };
