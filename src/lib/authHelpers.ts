
import CryptoJS from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';
import { AuthData } from '@/types';

// Helper to escape characters for OAuth 1.0
const oauthEscape = (str: string) => {
    return encodeURIComponent(str).replace(/[!'()*]/g, (c) => {
        return '%' + c.charCodeAt(0).toString(16).toUpperCase();
    });
};

export const signOAuth1 = (
    method: string,
    url: string,
    params: Record<string, string>,
    auth: NonNullable<AuthData['oauth1']>
) => {
    const nonce = auth.nonce || uuidv4().replace(/-/g, '');
    const timestamp = auth.timestamp || Math.floor(Date.now() / 1000).toString();

    const oauthParams: Record<string, string> = {
        oauth_consumer_key: auth.consumerKey,
        oauth_token: auth.token,
        oauth_signature_method: auth.signatureMethod,
        oauth_timestamp: timestamp,
        oauth_nonce: nonce,
        oauth_version: '1.0'
    };

    if (auth.realm) oauthParams.oauth_realm = auth.realm;

    // Merge query params and oauth params
    const allParams = { ...params, ...oauthParams };

    // Sort and stringify
    const sortedKeys = Object.keys(allParams).sort();
    const paramString = sortedKeys.map(k => `${oauthEscape(k)}=${oauthEscape(allParams[k])}`).join('&');

    // Signature Base String
    const baseString = `${method.toUpperCase()}&${oauthEscape(url.split('?')[0])}&${oauthEscape(paramString)}`;
    const signingKey = `${oauthEscape(auth.consumerSecret)}&${oauthEscape(auth.tokenSecret)}`;

    let signature = '';
    if (auth.signatureMethod === 'HMAC-SHA1') {
        signature = CryptoJS.HmacSHA1(baseString, signingKey).toString(CryptoJS.enc.Base64);
    } else if (auth.signatureMethod === 'PLAINTEXT') {
        signature = signingKey;
    } else {
        // RSA-SHA1 not supported in client-side JS easily without heavy libs, fallback to empty or handle later
        console.warn("RSA-SHA1 not fully supported yet");
    }

    const finalParams: Record<string, string> = { ...oauthParams, oauth_signature: signature };

    // Generate Header
    const headerParts = Object.keys(finalParams).sort().map(k => `${k}="${oauthEscape(finalParams[k])}"`);
    return `OAuth ${headerParts.join(', ')}`;
};

export const signAWS = (
    method: string,
    url: string,
    headers: Record<string, string>,
    body: string,
    auth: NonNullable<AuthData['aws']>
) => {
    // Basic AWS v4 Implementation
    const accessKey = auth.accessKey;
    const secretKey = auth.secretKey;
    const region = auth.region;
    const service = auth.service;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substr(0, 8);

    // 1. Canonical Request
    const uri = new URL(url);
    const canonicalUri = uri.pathname;
    const canonicalQuery = Array.from(uri.searchParams).sort().map(([k, v]) =>
        `${encodeURIComponent(k)}=${encodeURIComponent(v)}`
    ).join('&');

    const signedHeaders = Object.keys(headers).map(k => k.toLowerCase()).sort().join(';');
    const canonicalHeaders = Object.keys(headers).map(k => k.toLowerCase()).sort().map(k =>
        `${k}:${headers[k].trim()}\n`
    ).join('');

    const payloadHash = CryptoJS.SHA256(body || '').toString(CryptoJS.enc.Hex);
    const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQuery}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    // 2. String to Sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${CryptoJS.SHA256(canonicalRequest).toString(CryptoJS.enc.Hex)}`;

    // 3. Signature
    const getSignatureKey = (key: string, dateStamp: string, regionName: string, serviceName: string) => {
        const kDate = CryptoJS.HmacSHA256(dateStamp, "AWS4" + key);
        const kRegion = CryptoJS.HmacSHA256(regionName, kDate);
        const kService = CryptoJS.HmacSHA256(serviceName, kRegion);
        const kSigning = CryptoJS.HmacSHA256("aws4_request", kService);
        return kSigning;
    };

    const signingKey = getSignatureKey(secretKey, dateStamp, region, service);
    const signature = CryptoJS.HmacSHA256(stringToSign, signingKey).toString(CryptoJS.enc.Hex);

    return {
        'Authorization': `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
        'X-Amz-Date': amzDate,
        ...(auth.sessionToken ? { 'X-Amz-Security-Token': auth.sessionToken } : {})
    };
};

export const signHawk = (
    method: string,
    url: string,
    auth: NonNullable<AuthData['hawk']>
) => {
    const nonce = auth.nonce || Math.random().toString(36).substring(2);
    const timestamp = auth.timestamp || Math.floor(Date.now() / 1000).toString();
    const uri = new URL(url);

    // Normalize string
    const normalized = `hawk.1.header\n${timestamp}\n${nonce}\n${method.toUpperCase()}\n${uri.pathname}${uri.search}\n${uri.hostname}\n${uri.port || (uri.protocol === 'https:' ? '443' : '80')}\n\n\n${auth.app || ''}\n`;

    const mac = CryptoJS.HmacSHA256(normalized, auth.authKey).toString(CryptoJS.enc.Base64);

    return `Hawk id="${auth.authId}", ts="${timestamp}", nonce="${nonce}", mac="${mac}"${auth.ext ? `, ext="${auth.ext}"` : ''}`;
};

export const calculateDigestHeader = (
    method: string,
    url: string,
    auth: NonNullable<AuthData['digest']>
) => {
    // Basic Digest implementation assuming we have the nonce/realm from user or previous 401
    // Usually, RequestPanel needs to handle the 401 flow, but this function generates the header given the inputs.

    if (!auth.realm || !auth.nonce) return ''; // Can't sign without challenge

    const ha1 = CryptoJS.MD5(`${auth.username}:${auth.realm}:${auth.password}`).toString(CryptoJS.enc.Hex);
    const ha2 = CryptoJS.MD5(`${method}:${url}`).toString(CryptoJS.enc.Hex);

    const nc = '00000001'; // Nonce count, simple for now
    const cnonce = auth.cnonce || Math.random().toString(36).substring(2);
    const qop = auth.qop || 'auth';

    const response = CryptoJS.MD5(`${ha1}:${auth.nonce}:${nc}:${cnonce}:${qop}:${ha2}`).toString(CryptoJS.enc.Hex);

    return `Digest username="${auth.username}", realm="${auth.realm}", nonce="${auth.nonce}", uri="${url}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${response}", opaque="${auth.opaque || ''}"`;
};
