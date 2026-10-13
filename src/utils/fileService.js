/**
 * FUTO Learn — File Service
 *
 * Handles document picking and text extraction from PDF and DOCX files.
 *
 * FILE READING STRATEGY (Android):
 *  The document picker returns a content:// URI. We copy it to the app's
 *  internal cache using RNFS.copyFile(), which calls ContentResolver.openInputStream()
 *  under the hood — the correct way to read any content:// URI on Android.
 *  Then we read from the copied internal path. This avoids:
 *    - ENOENT failures from mode:'import' copying to unavailable external storage
 *    - ReactNativeBlobUtil content:// incompatibilities
 *    - RNFS direct content:// read failures
 *
 * Extraction pipeline:
 *  DOCX → fflate unzip → word/document.xml → <w:t> text extraction
 *  PDF  → digital text stream parser (instant, no network)
 *       → if insufficient text → Gemini Files API OCR (scanned PDFs, no size limit)
 */

import {pick} from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {unzipSync} from 'fflate';
import {SUPPORTED_MIME_TYPES} from './constants';
import Config from 'react-native-config';

const API_KEY = Config.GOOGLE_API_KEY || '';
const MODEL = 'gemini-3.8-flash';
const GEMINI_GENERATE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const GEMINI_FILES_UPLOAD_URL =
  'https://generativelanguage.googleapis.com/upload/v1beta/files';
const GEMINI_FILES_URL =
  'https://generativelanguage.googleapis.com/v1beta/files';

// ─── File Picking ─────────────────────────────────────────────────────────────

/**
 * Open system file picker restricted to PDF and DOCX.
 * Returns the picked file object or null if cancelled.
 * NOTE: No 'mode' option — we get the raw content:// URI and copy it ourselves.
 */
export const pickDocument = async () => {
  try {
    const results = await pick({
      type: SUPPORTED_MIME_TYPES,
      allowMultiSelection: false,
    });
    return results[0] || null;
  } catch (err) {
    if (
      err?.code === 'DOCUMENT_PICKER_CANCELED' ||
      err?.message?.includes('cancel')
    ) {
      return null;
    }
    throw err;
  }
};

// ─── Main Extraction Entry Point ──────────────────────────────────────────────

/**
 * Extract plain text from a file based on its MIME type.
 * @returns {{ text: string, success: boolean, error?: string }}
 */
export const extractTextFromFile = async (fileUri, mimeType) => {
  try {
    if (mimeType === 'application/pdf') {
      return await extractFromPdf(fileUri, mimeType);
    } else if (
      mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return await extractFromDocx(fileUri, mimeType);
    } else {
      return {
        success: false,
        text: '',
        error: 'Unsupported file type. Please use PDF or DOCX.',
      };
    }
  } catch (err) {
    console.warn('[FileService] Extraction error:', err);
    return {
      success: false,
      text: '',
      error: `Could not read this file: ${err?.message || 'Unknown error'}. Please try a different file.`,
    };
  }
};

// ─── Reliable file reading via internal cache copy ────────────────────────────
/**
 * Copies a picked file (content:// or file:// URI) to internal cache,
 * reads it as base64, then cleans up the temp file.
 *
 * RNFS.copyFile on Android uses ContentResolver.openInputStream() for
 * content:// URIs — this is the Android-correct way to read any picker URI.
 */
const readFileAsBase64 = async (uri, mimeType) => {
  const ext = mimeType === 'application/pdf' ? 'pdf' : 'docx';
  const tempPath = `${RNFS.CachesDirectoryPath}/futolearn_tmp_${Date.now()}.${ext}`;

  console.log('[FileService] Reading URI:', uri);
  console.log('[FileService] Copying to:', tempPath);

  try {
    await RNFS.copyFile(uri, tempPath);
    const base64 = await RNFS.readFile(tempPath, 'base64');
    console.log('[FileService] Read success, base64 length:', base64.length);
    return base64;
  } finally {
    // Always clean up the temp file
    RNFS.unlink(tempPath).catch(() => {});
  }
};

// ─── Base64 → Uint8Array (pure JS, no atob — reliable in Hermes) ─────────────

const base64ToUint8Array = base64 => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }

  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = clean.length;
  const extra = len % 4;
  const bufLen =
    Math.floor((len / 4) * 3) +
    (extra === 3 ? 2 : extra === 2 ? 1 : 0);

  const bytes = new Uint8Array(bufLen);
  let p = 0;

  for (let i = 0; i < len; i += 4) {
    const b0 = lookup[clean.charCodeAt(i)];
    const b1 = lookup[clean.charCodeAt(i + 1)];
    const b2 = i + 2 < len ? lookup[clean.charCodeAt(i + 2)] : 0;
    const b3 = i + 3 < len ? lookup[clean.charCodeAt(i + 3)] : 0;
    bytes[p++] = (b0 << 2) | (b1 >> 4);
    if (p < bufLen) {bytes[p++] = ((b1 & 0x0f) << 4) | (b2 >> 2);}
    if (p < bufLen) {bytes[p++] = ((b2 & 0x03) << 6) | b3;}
  }
  return bytes;
};

// ─── DOCX Extraction ─────────────────────────────────────────────────────────

const extractFromDocx = async (fileUri, mimeType) => {
  const base64 = await readFileAsBase64(fileUri, mimeType);
  const uint8Array = base64ToUint8Array(base64);

  let unzipped;
  try {
    unzipped = unzipSync(uint8Array);
  } catch (e) {
    return {
      success: false,
      text: '',
      error:
        'Could not open this DOCX file. Please make sure it is a valid .docx (not .doc or .odt).',
    };
  }

  const docXmlBytes = unzipped['word/document.xml'];
  if (!docXmlBytes) {
    return {
      success: false,
      text: '',
      error:
        'Could not find document content inside the DOCX file. It may be an older .doc format.',
    };
  }

  let xmlStr;
  try {
    const decoder = new TextDecoder('utf-8');
    xmlStr = decoder.decode(docXmlBytes);
  } catch (_) {
    xmlStr = String.fromCharCode(...docXmlBytes);
  }

  // Split on paragraph tags, extract text from <w:t> runs
  const paragraphs = xmlStr.split(/<w:p[ >]/);
  const textParts = paragraphs.map(para => {
    const runs = [];
    const tRunRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let m;
    while ((m = tRunRegex.exec(para)) !== null) {
      runs.push(m[1]);
    }
    return runs.join('');
  });

  const text = textParts
    .join('\n')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!text || text.length < 20) {
    return {
      success: false,
      text: '',
      error:
        'The document appears to be empty or contains only images/tables without text.',
    };
  }

  return {success: true, text};
};

// ─── PDF Extraction ───────────────────────────────────────────────────────────

const extractFromPdf = async (fileUri, mimeType) => {
  const tempPath = `${RNFS.CachesDirectoryPath}/futolearn_tmp_${Date.now()}.pdf`;

  try {
    await RNFS.copyFile(fileUri, tempPath);
    const base64 = await RNFS.readFile(tempPath, 'base64');

    // ── Try digital text extraction first (instant, no network) ──────────────
    const uint8 = base64ToUint8Array(base64);
    let rawPdf = '';
    const CHUNK = 8192;
    for (let i = 0; i < uint8.length; i += CHUNK) {
      rawPdf += String.fromCharCode(...uint8.subarray(i, i + CHUNK));
    }

    const digitalText = parsePdfTextStreams(rawPdf);
    if (digitalText && digitalText.trim().length >= 50) {
      return {success: true, text: cleanText(digitalText)};
    }

    // ── Fallback: Gemini Files API OCR for scanned/image PDFs ────────────────
    if (!API_KEY) {
      return {
        success: false,
        text: '',
        error: 'This appears to be a scanned PDF. AI-powered OCR requires a Gemini API key in .env.',
      };
    }

    // Pass the temp file path for binary upload (more reliable than base64 multipart)
    return await extractScannedPdfWithGemini(tempPath);
  } finally {
    // Temp file is cleaned up after Gemini upload completes (or fails)
    RNFS.unlink(tempPath).catch(() => {});
  }
};

// ─── PDF Text Stream Parser ───────────────────────────────────────────────────

const parsePdfTextStreams = rawPdf => {
  const textParts = [];
  const btEtRegex = /BT([\s\S]*?)ET/g;
  let match;

  while ((match = btEtRegex.exec(rawPdf)) !== null) {
    const block = match[1];
    const strRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*(?:Tj|'|")/g;
    const arrRegex = /\[([^\]]*)\]\s*TJ/g;
    let sm;
    while ((sm = strRegex.exec(block)) !== null) {
      textParts.push(decodePdfString(sm[1]));
    }
    let am;
    while ((am = arrRegex.exec(block)) !== null) {
      const inner = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g;
      let im;
      while ((im = inner.exec(am[1])) !== null) {
        textParts.push(decodePdfString(im[1]));
      }
    }
  }

  return textParts.join(' ');
};

const decodePdfString = str =>
  str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\([0-7]{3})/g, (_, oct) =>
      String.fromCharCode(parseInt(oct, 8)),
    );

// ─── Gemini Files API OCR (scanned PDFs) ─────────────────────────────────────
// Uses Files API (not inline_data) to avoid the 7 MB inline size limit.
// Supports up to 2 GB. File is auto-deleted from Gemini after 48h.

/**
 * Upload a scanned PDF to Gemini Files API using binary upload via
 * ReactNativeBlobUtil — avoids the 7 MB inline_data limit and the
 * broken base64 multipart format issue.
 */
const extractScannedPdfWithGemini = async filePath => {
  let uploadedFileUri = null;

  try {
    // ── Step 1: Binary upload to Gemini Files API ─────────────────────────────
    // Using the simple media upload endpoint with raw binary bytes.
    // ReactNativeBlobUtil.wrap() sends the file bytes directly.
    const uploadResponse = await ReactNativeBlobUtil.fetch(
      'POST',
      `${GEMINI_FILES_UPLOAD_URL}?uploadType=media&key=${API_KEY}`,
      {
        'X-Goog-Upload-Command': 'upload, finalize',
        'X-Goog-Upload-Header-Content-Type': 'application/pdf',
        'Content-Type': 'application/pdf',
      },
      ReactNativeBlobUtil.wrap(filePath),
    );

    const uploadData = JSON.parse(uploadResponse.data);
    uploadedFileUri = uploadData?.file?.uri;
    console.log('[FileService] Files API upload result:', uploadData?.file?.name, 'uri:', uploadedFileUri);

    if (!uploadedFileUri) {
      return {
        success: false,
        text: '',
        error: 'Upload succeeded but no file reference returned. Please try again.',
      };
    }

    // ── Step 2: Wait for file to be processed ────────────────────────────────
    await new Promise(res => setTimeout(res, 2000));

    // ── Step 3: Generate content (with retry for 503 overload) ─────────────────
    let generateData = null;
    for (let attempt = 0; attempt <= 3; attempt++) {
      const generateResponse = await fetch(
        `${GEMINI_GENERATE_URL}?key=${API_KEY}`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    file_data: {
                      mime_type: 'application/pdf',
                      file_uri: uploadedFileUri,
                    },
                  },
                  {
                    text: 'Extract ALL text content from this document exactly as it appears. Preserve paragraph structure, headings, bullet points, and numbered lists. Return only the raw extracted text — no summaries, no commentary.',
                  },
                ],
              },
            ],
            generationConfig: {temperature: 0, maxOutputTokens: 8192},
          }),
        },
      );

      if (generateResponse.ok) {
        generateData = await generateResponse.json();
        break;
      }

      const errText = await generateResponse.text();
      console.warn('[FileService] Gemini generate error:', generateResponse.status, errText);

      // Retry on 503 (overload) or 429 (rate limit)
      if ((generateResponse.status === 503 || generateResponse.status === 429) && attempt < 3) {
        const waitMs = [5000, 15000, 30000][attempt] ?? 30000;
        console.log(`[FileService] Retrying PDF generation in ${waitMs / 1000}s (attempt ${attempt + 1}/3)`);
        await new Promise(res => setTimeout(res, waitMs));
        continue;
      }

      return {
        success: false,
        text: '',
        error: `AI could not process this PDF (Error ${generateResponse.status}). Please try again.`,
      };
    }
    const text = generateData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text || text.trim().length < 20) {
      return {
        success: false,
        text: '',
        error: 'AI could not extract readable text from this PDF. The file may be a blank scan.',
      };
    }

    return {success: true, text: cleanText(text)};
  } catch (err) {
    console.warn('[FileService] Gemini OCR error:', err);
    return {
      success: false,
      text: '',
      error: 'Could not connect to AI for text extraction. Please check your internet connection.',
    };
  } finally {
    // ── Step 4: Delete from Gemini servers (auto-expires after 48h anyway) ────
    if (uploadedFileUri) {
      const fileId = uploadedFileUri.split('/').pop();
      fetch(`${GEMINI_FILES_URL}/${fileId}?key=${API_KEY}`, {
        method: 'DELETE',
      }).catch(() => {});
    }
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const cleanText = text =>
  text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const getExtFromMime = mimeType => {
  if (mimeType === 'application/pdf') {return 'pdf';}
  if (
    mimeType ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }
  return 'bin';
};

export const getFileTypeLabel = mimeType => {
  if (mimeType === 'application/pdf') {return 'PDF';}
  if (
    mimeType ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'DOCX';
  }
  return 'File';
};
