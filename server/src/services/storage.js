import fs from 'node:fs/promises'
import path from 'node:path'
import { createReadStream } from 'node:fs'
import { config } from '../config.js'
import { logger } from '../logger.js'

let s3Client = null

async function getS3() {
  if (s3Client) return s3Client
  const { S3Client } = await import('@aws-sdk/client-s3')
  s3Client = new S3Client({
    region: config.s3.region,
    ...(config.s3.endpoint ? { endpoint: config.s3.endpoint } : {}),
    forcePathStyle: config.s3.forcePathStyle,
    ...(config.s3.accessKeyId
      ? { credentials: { accessKeyId: config.s3.accessKeyId, secretAccessKey: config.s3.secretAccessKey } }
      : {}),
  })
  return s3Client
}

function localPath(key) {
  return path.join(config.dataDir, 'uploads', key.replace(/\\/g, '/'))
}

export function usesObjectStorage() {
  return Boolean(config.s3.bucket)
}

export async function putObject(key, filePath, contentType) {
  if (usesObjectStorage()) {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3')
    const client = await getS3()
    await client.send(
      new PutObjectCommand({
        Bucket: config.s3.bucket,
        Key: key,
        Body: createReadStream(filePath),
        ContentType: contentType,
        ServerSideEncryption: config.s3.endpoint ? undefined : 'AES256',
      }),
    )
    logger.info('stored object', { key, backend: 's3' })
    return key
  }
  const dest = localPath(key)
  await fs.mkdir(path.dirname(dest), { recursive: true })
  await fs.copyFile(filePath, dest)
  logger.info('stored object', { key, backend: 'local' })
  return key
}

export async function getObjectBuffer(key) {
  if (usesObjectStorage()) {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3')
    const client = await getS3()
    const out = await client.send(new GetObjectCommand({ Bucket: config.s3.bucket, Key: key }))
    const chunks = []
    for await (const c of out.Body) chunks.push(c)
    return Buffer.concat(chunks)
  }
  return fs.readFile(localPath(key))
}

export async function deleteObject(key) {
  if (!key) return
  try {
    if (usesObjectStorage()) {
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3')
      const client = await getS3()
      await client.send(new DeleteObjectCommand({ Bucket: config.s3.bucket, Key: key }))
      return
    }
    await fs.unlink(localPath(key)).catch(() => {})
  } catch (err) {
    logger.warn('delete object failed', { key, error: err.message })
  }
}

export async function putJson(key, data) {
  const tmp = path.join(config.dataDir, 'tmp', `${Date.now()}-${path.basename(key)}`)
  await fs.mkdir(path.dirname(tmp), { recursive: true })
  await fs.writeFile(tmp, JSON.stringify(data))
  await putObject(key, tmp, 'application/json')
  await fs.unlink(tmp).catch(() => {})
}
