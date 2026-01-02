import { config } from "@/config/config";
import { s3 as s3Client } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const generatePresignedUrl = async (
  fileName: string,
  fileType: string
) => {
  const key = `t3.chat/profile-pics/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: config.AWS_S3_BUCKET,
    Key: key,
    ContentType: fileType,
  });

  const url = await getSignedUrl(s3Client, command, {
    expiresIn: 60 * 2,
  });

  const publicUrl = `https://${config.AWS_S3_BUCKET}.s3.${config.AWS_REGION}.amazonaws.com/${key}`;

  return { url, publicUrl, key };
};
