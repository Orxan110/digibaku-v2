import { createClient } from '@supabase/supabase-js';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { HttpError } from '../http.js';


const authUrl = process.env.NEON_AUTH_URL;
const jwksUrl = process.env.NEON_AUTH_JWKS_URL;


let admin = null;
let jwks = null;


function storageClient() {
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;


if (!url || !key) {
throw new HttpError(500, 'storage_not_configured');
}


admin ??= createClient(url, key, {
auth: {
persistSession: false,
autoRefreshToken: false
}
});


return admin;
}


function getJWKS() {
if (!authUrl || !jwksUrl) {
throw new HttpError(500, 'neon_auth_not_configured');
}


jwks ??= createRemoteJWKSet(new URL(jwksUrl));
return jwks;
}


export async function getUserFromToken(token) {
if (!token) return null;


try {
const { payload } = await jwtVerify(token, getJWKS(), {
issuer: new URL(authUrl).origin
});


if (!payload.sub) return null;

return {
  id: payload.sub,
  email: payload.email || null,
  user_metadata: {
    full_name: payload.name || null
  }
};



} catch {
return null;
}
}


export async function uploadPublic(bucket, path, body, contentType) {
const client = storageClient();


const { error } = await client.storage
.from(bucket)
.upload(path, body, { contentType, upsert: false });


if (error) throw new HttpError(400, error.message);


return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}


export const authConfig = () => ({
neonAuthUrl: authUrl || null
});


