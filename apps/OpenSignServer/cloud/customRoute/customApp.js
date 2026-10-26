import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import uploadFile from './uploadFile.js';
import { validateApiToken } from './apiAuth.js';
import requestSignature from './requestSignature.js';
import resendSignature from './resendSignature.js';
import downloadDocument from './downloadDocument.js';
import signingStatus from './signingStatus.js';

dotenv.config();

export const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.post('/file_upload', uploadFile);

/**
 * Integration API router.
 * Mounted at /app/v1 on the main server (before Parse) so it works on the
 * same path prefix as cloud functions: https://host/app/v1/...
 */
export const apiV1 = express.Router();
apiV1.use(cors());
apiV1.use(express.json({ limit: '50mb' }));
apiV1.use(express.urlencoded({ limit: '50mb', extended: true }));

apiV1.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'instasign-api-v1' });
});

apiV1.post('/request-signature', validateApiToken, requestSignature);
apiV1.post('/resend-signature', validateApiToken, resendSignature);
apiV1.get('/download-document', validateApiToken, downloadDocument);
apiV1.post('/download-document', validateApiToken, downloadDocument);
apiV1.get('/signing-status', validateApiToken, signingStatus);
apiV1.post('/signing-status', validateApiToken, signingStatus);

// Keep legacy /api/v1 paths for local direct server access (port 8080)
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', service: 'instasign-api-v1' });
});
app.post('/api/v1/request-signature', validateApiToken, requestSignature);
app.post('/api/v1/resend-signature', validateApiToken, resendSignature);
app.get('/api/v1/download-document', validateApiToken, downloadDocument);
app.post('/api/v1/download-document', validateApiToken, downloadDocument);
app.get('/api/v1/signing-status', validateApiToken, signingStatus);
app.post('/api/v1/signing-status', validateApiToken, signingStatus);
