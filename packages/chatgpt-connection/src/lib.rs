//! Optional app-owned ChatGPT connection. Credentials never cross this Rust API.
//! Independent implementation of the public SIWC protocol; no DevKit code.
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use jsonwebtoken::{decode, decode_header, jwk::JwkSet, Algorithm, DecodingKey, Validation};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::{BTreeMap, BTreeSet},
    sync::atomic::{AtomicBool, AtomicU64, Ordering},
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::TcpListener,
    sync::Mutex,
};
use url::Url;
const ISSUER: &str = "https://auth.openai.com";
const AUTHORIZE: &str = "https://auth.openai.com/api/accounts/authorize";
const TOKEN: &str = "https://auth.openai.com/api/accounts/oauth/token";
const RESOURCE: &str = "https://api.openai.com/v1";
const SCOPES: &str =
    "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct";
const PLAN: &str = "chatgpt.tokens.use.direct";
const MAX_REPLY: usize = 4 * 1024 * 1024;

#[derive(Clone, Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AccountSummary {
    pub client_id: String,
    pub email: Option<String>,
    pub subject: String,
    pub connected: bool,
    pub plan_enabled: bool,
}
#[derive(Clone, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionStatus {
    pub available: bool,
    pub busy: bool,
    pub active_client_id: Option<String>,
    pub accounts: Vec<AccountSummary>,
    pub pending_client_ids: Vec<String>,
    pub error: Option<String>,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Model {
    pub slug: String,
    pub display_name: String,
}
/// Stable, redacted codes only. Never wrap provider response bodies or URLs.
#[derive(Clone, Debug, Serialize, PartialEq)]
pub struct ConnectionError(pub String, pub Option<ProviderFailure>);
#[derive(Clone, Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProviderFailure {
    pub status: u16,
    pub request_id: Option<String>,
    pub code: Option<String>,
    pub parameter: Option<String>,
}
impl std::fmt::Display for ConnectionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}
impl std::error::Error for ConnectionError {}
fn err(code: &str) -> ConnectionError {
    ConnectionError(code.into(), None)
}
fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}
fn random() -> String {
    let mut b = [0u8; 32];
    rand::rng().fill_bytes(&mut b);
    URL_SAFE_NO_PAD.encode(b)
}

// Deliberately no Debug/Serialize public exposure of credentials.
#[derive(Clone, Serialize, Deserialize)]
struct Account {
    client_id: String,
    subject: String,
    email: Option<String>,
    id_token: Option<String>,
    access_token: Option<String>,
    refresh_token: Option<String>,
    expires_at: u64,
    scopes: Vec<String>,
}
impl Account {
    fn summary(&self) -> AccountSummary {
        AccountSummary {
            client_id: self.client_id.clone(),
            subject: self.subject.clone(),
            email: self.email.clone(),
            connected: self.access_token.is_some(),
            plan_enabled: self.access_token.is_some() && self.scopes.iter().any(|s| s == PLAN),
        }
    }
}
#[derive(Clone, Default, Serialize, Deserialize)]
struct Vault {
    host_id: Option<String>,
    active: Option<String>,
    accounts: BTreeMap<String, Account>,
    pending_registrations: BTreeSet<String>,
}
#[derive(Clone, Deserialize)]
struct TokenReply {
    access_token: String,
    refresh_token: Option<String>,
    id_token: Option<String>,
    token_type: String,
    expires_in: u64,
    scope: String,
}
#[derive(Clone, Deserialize)]
struct Claims {
    sub: String,
    email: Option<String>,
    nonce: Option<String>,
    exp: u64,
    #[serde(default)]
    aud: serde_json::Value,
    #[serde(default)]
    azp: Option<String>,
}

pub struct Controller {
    app_name: String,
    #[cfg_attr(test, allow(dead_code))]
    service: String,
    #[cfg(test)]
    test_store: std::sync::Mutex<Option<Vec<u8>>>,
    enabled: bool,
    gate: Mutex<()>,
    vault: Mutex<Vault>,
    loaded: AtomicBool,
    busy: AtomicBool,
    epoch: AtomicU64,
    http: reqwest::Client,
    catalog: Mutex<Option<(u64, String, Vec<Model>)>>,
}
struct Busy<'a>(&'a AtomicBool);
impl Drop for Busy<'_> {
    fn drop(&mut self) {
        self.0.store(false, Ordering::SeqCst);
    }
}
impl Controller {
    pub fn new(
        app_name: &str,
        keychain_service: &str,
        enabled: bool,
    ) -> Result<Self, ConnectionError> {
        if app_name.trim().is_empty() || keychain_service.trim().is_empty() {
            return Err(err("invalid_configuration"));
        }
        let http = reqwest::Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .connect_timeout(Duration::from_secs(10))
            .timeout(Duration::from_secs(60))
            .build()
            .map_err(|_| err("network_unavailable"))?;
        Ok(Self {
            app_name: app_name.into(),
            service: keychain_service.into(),
            #[cfg(test)]
            test_store: std::sync::Mutex::new(None),
            enabled,
            gate: Mutex::new(()),
            vault: Mutex::new(Vault::default()),
            loaded: AtomicBool::new(false),
            busy: AtomicBool::new(false),
            epoch: AtomicU64::new(0),
            http,
            catalog: Mutex::new(None),
        })
    }
    fn admission(&self) -> Result<(), ConnectionError> {
        if self.enabled {
            Ok(())
        } else {
            Err(err("provider_admission_required"))
        }
    }
    fn process_lock(&self) -> Result<Option<std::fs::File>, ConnectionError> {
        #[cfg(test)]
        {
            Ok(None)
        }
        #[cfg(not(test))]
        {
            let digest = URL_SAFE_NO_PAD.encode(Sha256::digest(self.service.as_bytes()));
            #[cfg(unix)]
            let path = std::path::PathBuf::from("/tmp").join(format!(
                "create-something-chatgpt-{}-{}.lock",
                unsafe { libc::geteuid() },
                digest
            ));
            #[cfg(not(unix))]
            let path =
                std::env::temp_dir().join(format!("create-something-chatgpt-{}.lock", digest));
            let file = open_process_lock(&path)?;
            // Another process may have rotated credentials or switched accounts.
            self.loaded.store(false, Ordering::SeqCst);
            Ok(Some(file))
        }
    }
    async fn load(&self) -> Result<(), ConnectionError> {
        if self.loaded.load(Ordering::SeqCst) {
            return Ok(());
        }
        #[cfg(not(test))]
        let data = read_secret(&self.service)?;
        #[cfg(test)]
        let data = self
            .test_store
            .lock()
            .map_err(|_| err("credential_store_failed"))?
            .clone();
        if let Some(data) = data {
            let restored: Vault =
                serde_json::from_slice(&data).map_err(|_| err("credential_store_invalid"))?;
            let mut v = self.vault.lock().await;
            if v.active != restored.active {
                self.epoch.fetch_add(1, Ordering::SeqCst);
            }
            *v = restored;
        }
        self.loaded.store(true, Ordering::SeqCst);
        Ok(())
    }
    async fn save(&self) -> Result<(), ConnectionError> {
        let v = self.vault.lock().await;
        let bytes = serde_json::to_vec(&*v).map_err(|_| err("credential_store_failed"))?;
        #[cfg(not(test))]
        {
            write_secret(&self.service, &bytes)
        }
        #[cfg(test)]
        {
            *self
                .test_store
                .lock()
                .map_err(|_| err("credential_store_failed"))? = Some(bytes);
            Ok(())
        }
    }
    async fn snapshot(&self, error: Option<String>) -> ConnectionStatus {
        let v = self.vault.lock().await;
        ConnectionStatus {
            available: self.enabled,
            busy: self.busy.load(Ordering::SeqCst),
            active_client_id: v.active.clone(),
            accounts: v.accounts.values().map(Account::summary).collect(),
            pending_client_ids: v.pending_registrations.iter().cloned().collect(),
            error,
        }
    }
    pub async fn status(&self) -> ConnectionStatus {
        if !self.enabled {
            return self
                .snapshot(Some("provider_admission_required".into()))
                .await;
        }
        // Do not race a restore against a callback/refresh write.
        if self.busy.load(Ordering::SeqCst) {
            return self.snapshot(None).await;
        }
        let _lock = self.gate.lock().await;
        let _process_lock = match self.process_lock() {
            Ok(lock) => lock,
            Err(e) => return self.snapshot(Some(e.0)).await,
        };
        match self.load().await {
            Ok(()) => self.snapshot(None).await,
            Err(e) => self.snapshot(Some(e.0)).await,
        }
    }
    pub fn cancel(&self) {
        self.epoch.fetch_add(1, Ordering::SeqCst);
    }
    fn current(&self, epoch: u64) -> Result<(), ConnectionError> {
        if self.epoch.load(Ordering::SeqCst) == epoch {
            Ok(())
        } else {
            Err(err("cancelled"))
        }
    }
    async fn cancellable<T>(
        &self,
        epoch: u64,
        future: impl std::future::Future<Output = Result<T, ConnectionError>>,
    ) -> Result<T, ConnectionError> {
        tokio::select! {result=future=>{self.current(epoch)?;result},_ = async {loop {if self.current(epoch).is_err(){break;}tokio::time::sleep(Duration::from_millis(100)).await;}}=>Err(err("cancelled"))}
    }
    pub async fn select(&self, client_id: &str) -> Result<ConnectionStatus, ConnectionError> {
        self.admission()?;
        self.cancel();
        let _lock = self.gate.lock().await;
        let _process_lock = self.process_lock()?;
        self.load().await?;
        {
            let mut v = self.vault.lock().await;
            if !v.accounts.contains_key(client_id) {
                return Err(err("unknown_account"));
            }
            v.active = Some(client_id.into());
        }
        self.save().await?;
        Ok(self.snapshot(None).await)
    }
    pub async fn connect<F>(
        &self,
        open_browser: F,
        selected_client_id: Option<String>,
    ) -> Result<ConnectionStatus, ConnectionError>
    where
        F: Fn(&str) -> Result<(), String> + Send,
    {
        self.admission()?;
        let _lock = self.gate.try_lock().map_err(|_| err("connection_busy"))?;
        let _process_lock = self.process_lock()?;
        self.load().await?;
        self.busy.store(true, Ordering::SeqCst);
        let busy = Busy(&self.busy);
        let epoch = self.epoch.fetch_add(1, Ordering::SeqCst) + 1;
        let selected = {
            let mut v = self.vault.lock().await;
            if v.host_id.is_none() {
                v.host_id = Some(format!("urn:uuid:{}", uuid::Uuid::new_v4()));
            }
            match selected_client_id.as_ref() {
                Some(id) if v.pending_registrations.contains(id) => None,
                Some(id) => Some(
                    v.accounts
                        .get(id)
                        .cloned()
                        .ok_or_else(|| err("unknown_account"))?,
                ),
                None => None,
            }
        };
        self.save().await?;
        let host = self
            .vault
            .lock()
            .await
            .host_id
            .clone()
            .ok_or_else(|| err("credential_store_failed"))?;
        let listener = TcpListener::bind("127.0.0.1:0")
            .await
            .map_err(|_| err("callback_unavailable"))?;
        let redirect = format!(
            "http://127.0.0.1:{}/auth/callback",
            listener
                .local_addr()
                .map_err(|_| err("callback_unavailable"))?
                .port()
        );
        let state = random();
        let nonce = random();
        let verifier = random();
        let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
        let registration = selected_client_id.filter(|id| {
            selected.is_none()
                && self
                    .vault
                    .try_lock()
                    .ok()
                    .is_some_and(|v| v.pending_registrations.contains(id))
        });
        let client_id = selected
            .as_ref()
            .map(|a| a.client_id.clone())
            .or(registration)
            .unwrap_or_else(|| "dynamic_agent_client".into());
        let mut url = Url::parse(AUTHORIZE).map_err(|_| err("invalid_configuration"))?;
        {
            let mut q = url.query_pairs_mut();
            q.append_pair("client_id", &client_id)
                .append_pair("ext_agent_host_id", &host)
                .append_pair("response_type", "code")
                .append_pair("redirect_uri", &redirect)
                .append_pair("scope", SCOPES)
                .append_pair("resource", RESOURCE)
                .append_pair("state", &state)
                .append_pair("nonce", &nonce)
                .append_pair("code_challenge_method", "S256")
                .append_pair("code_challenge", &challenge);
            if client_id == "dynamic_agent_client" {
                q.append_pair("agent_name_hint", &self.app_name);
            }
            if let Some(a) = &selected {
                if a.access_token.is_some() && !a.scopes.iter().any(|s| s == PLAN) {
                    q.append_pair("prompt", "consent");
                }
                if let Some(id) = &a.id_token {
                    q.append_pair("id_token_hint", id);
                }
                if let Some(email) = &a.email {
                    q.append_pair("login_hint", email);
                }
            }
        }
        self.current(epoch)?;
        open_browser(url.as_str()).map_err(|_| err("browser_unavailable"))?;
        let (code, issued) = self
            .callback(listener, &redirect, &state, &client_id, epoch)
            .await?;
        // Preserve the newly issued registration before exchange, even if a code expires.
        if selected.is_none() {
            self.vault
                .lock()
                .await
                .pending_registrations
                .insert(issued.clone());
            self.save().await?;
        }
        let reply = self
            .token(&[
                ("grant_type", "authorization_code"),
                ("client_id", &issued),
                ("code", &code),
                ("code_verifier", &verifier),
                ("redirect_uri", &redirect),
                ("resource", RESOURCE),
            ])
            .await?;
        let previous = self.vault.lock().await.clone();
        let verified = async {
            self.current(epoch)?;
            let identity = self
                .identity(
                    reply
                        .id_token
                        .as_deref()
                        .ok_or_else(|| err("invalid_identity"))?,
                    &issued,
                    &nonce,
                )
                .await?;
            if selected.as_ref().is_some_and(|a| a.subject != identity.sub) {
                return Err(err("account_mismatch"));
            }
            self.current(epoch)?;
            let account = account_from_reply(issued.clone(), identity, reply.clone())?;
            {
                let mut v = self.vault.lock().await;
                self.current(epoch)?;
                v.accounts.insert(issued.clone(), account);
                v.active = Some(issued.clone());
                v.pending_registrations.remove(&issued);
            }
            Ok::<(), ConnectionError>(())
        }
        .await;
        if let Err(error) = verified {
            if let Some(refresh) = reply.refresh_token.as_deref() {
                if !self.revoke(&issued, refresh).await {
                    return Err(err("cancelled_revocation_unconfirmed"));
                }
            }
            return Err(error);
        }
        if let Err(error) = self.save().await {
            *self.vault.lock().await = previous;
            if let Some(refresh) = reply.refresh_token.as_deref() {
                if !self.revoke(&issued, refresh).await {
                    return Err(err("cancelled_revocation_unconfirmed"));
                }
            }
            return Err(error);
        }
        drop(busy);
        Ok(self.snapshot(None).await)
    }
    async fn callback(
        &self,
        listener: TcpListener,
        redirect: &str,
        state: &str,
        client_id: &str,
        epoch: u64,
    ) -> Result<(String, String), ConnectionError> {
        let until = tokio::time::Instant::now() + Duration::from_secs(300);
        loop {
            self.current(epoch)?;
            if tokio::time::Instant::now() >= until {
                return Err(err("sign_in_timed_out"));
            }
            let accepted =
                tokio::time::timeout(Duration::from_millis(150), listener.accept()).await;
            let Ok(Ok((mut stream, peer))) = accepted else {
                continue;
            };
            if !peer.ip().is_loopback() {
                continue;
            }
            let mut bytes = Vec::new();
            let result = tokio::time::timeout(Duration::from_secs(2), async {
                while bytes.len() < 8192 && !bytes.windows(4).any(|b| b == b"\r\n\r\n") {
                    let mut chunk = [0u8; 1024];
                    let n = stream.read(&mut chunk).await?;
                    if n == 0 {
                        break;
                    }
                    bytes.extend_from_slice(&chunk[..n]);
                }
                Ok::<(), std::io::Error>(())
            })
            .await;
            let parsed = if result.is_ok_and(|r| r.is_ok()) && bytes.len() <= 8192 {
                parse_callback(&bytes, redirect, state, client_id)
            } else {
                Err(err("invalid_callback"))
            };
            let accepted = parsed.is_ok()
                || parsed
                    .as_ref()
                    .err()
                    .is_some_and(|e| e.0 == "access_denied");
            let text = if accepted {
                "Return to the app. You may close this tab."
            } else {
                "Invalid callback. Return to the app to continue."
            };
            let response=format!("HTTP/1.1 {}\r\nContent-Type: text/plain; charset=utf-8\r\nCache-Control: no-store\r\nReferrer-Policy: no-referrer\r\nContent-Security-Policy: default-src 'none'\r\nConnection: close\r\nContent-Length: {}\r\n\r\n{}",if accepted{"200 OK"}else{"400 Bad Request"},text.len(),text);
            let _ = stream.write_all(response.as_bytes()).await;
            if accepted {
                self.current(epoch)?;
                return parsed;
            }
        }
    }
    async fn token(&self, form: &[(&str, &str)]) -> Result<TokenReply, ConnectionError> {
        let response = self
            .http
            .post(TOKEN)
            .form(form)
            .send()
            .await
            .map_err(|_| err("network_unavailable"))?;
        let status = response.status();
        if !status.is_success() {
            return Err(provider_error(response).await);
        }
        let reply: TokenReply = response
            .json()
            .await
            .map_err(|_| err("invalid_token_response"))?;
        if !reply.token_type.eq_ignore_ascii_case("bearer")
            || reply.access_token.is_empty()
            || reply.expires_in == 0
            || reply.expires_in > 3600
            || (reply
                .scope
                .split_whitespace()
                .any(|s| s == "offline_access")
                && reply.refresh_token.as_ref().is_none_or(|r| r.is_empty()))
        {
            return Err(err("invalid_token_response"));
        }
        Ok(reply)
    }
    async fn identity(
        &self,
        token: &str,
        client_id: &str,
        nonce: &str,
    ) -> Result<Claims, ConnectionError> {
        let metadata = self.discovery().await?;
        let url = trusted_auth_url(
            metadata
                .get("jwks_uri")
                .and_then(|v| v.as_str())
                .ok_or_else(|| err("invalid_identity"))?,
        )?;
        let keys: JwkSet = self
            .http
            .get(url)
            .send()
            .await
            .map_err(|_| err("network_unavailable"))?
            .error_for_status()
            .map_err(|_| err("identity_discovery_failed"))?
            .json()
            .await
            .map_err(|_| err("identity_discovery_failed"))?;
        verify_identity(token, client_id, nonce, &keys)
    }
    async fn discovery(&self) -> Result<serde_json::Value, ConnectionError> {
        let response = self
            .http
            .get("https://auth.openai.com/.well-known/openid-configuration")
            .send()
            .await
            .map_err(|_| err("network_unavailable"))?;
        if !response.status().is_success() {
            return Err(provider_error(response).await);
        }
        let metadata: serde_json::Value = response
            .json()
            .await
            .map_err(|_| err("identity_discovery_failed"))?;
        if metadata.get("issuer").and_then(|v| v.as_str()) != Some(ISSUER) {
            return Err(err("invalid_identity"));
        }
        Ok(metadata)
    }
    async fn revoke(&self, client_id: &str, refresh: &str) -> bool {
        let Ok(metadata) = self.discovery().await else {
            return false;
        };
        let Some(endpoint) = metadata.get("revocation_endpoint").and_then(|v| v.as_str()) else {
            return false;
        };
        let Ok(endpoint) = trusted_auth_url(endpoint) else {
            return false;
        };
        for attempt in 0..3 {
            let result = self
                .http
                .post(endpoint.clone())
                .timeout(Duration::from_secs(10))
                .form(&[
                    ("client_id", client_id),
                    ("token", refresh),
                    ("token_type_hint", "refresh_token"),
                ])
                .send()
                .await;
            match result {
                Ok(response) if response.status() == reqwest::StatusCode::OK => return true,
                Ok(response) if !response.status().is_server_error() => return false,
                _ => {}
            }
            if attempt < 2 {
                tokio::time::sleep(Duration::from_millis(150 * (attempt + 1))).await;
            }
        }
        false
    }
    async fn clear_account_tokens(&self, client_id: &str) -> Result<(), ConnectionError> {
        {
            let mut v = self.vault.lock().await;
            if let Some(a) = v.accounts.get_mut(client_id) {
                a.id_token = None;
                a.access_token = None;
                a.refresh_token = None;
                a.scopes.clear();
                a.expires_at = 0;
            }
            if v.active.as_deref() == Some(client_id) {
                v.active = None;
            }
        }
        self.save().await
    }
    async fn handle_refresh_failure(
        &self,
        client_id: &str,
        mut error: ConnectionError,
    ) -> Result<ConnectionError, ConnectionError> {
        if error
            .1
            .as_ref()
            .and_then(|d| d.code.as_deref())
            .is_some_and(|code| {
                matches!(
                    code,
                    "invalid_grant"
                        | "invalid_client"
                        | "refresh_token_reused"
                        | "refresh_token_expired"
                        | "invalid_refresh_token"
                        | "token_expired"
                        | "refresh_token_invalidated"
                )
            })
        {
            self.clear_account_tokens(client_id).await?;
            error.0 = "sign_in_required".into();
        }
        Ok(error)
    }
    async fn access(&self) -> Result<(String, String), ConnectionError> {
        self.load().await?;
        let account = {
            let v = self.vault.lock().await;
            v.active
                .as_ref()
                .and_then(|id| v.accounts.get(id))
                .cloned()
                .ok_or_else(|| err("sign_in_required"))?
        };
        if !account.scopes.iter().any(|s| s == PLAN) {
            return Err(err("plan_permission_required"));
        }
        if account.expires_at > now() + 60 {
            return Ok((
                account
                    .access_token
                    .ok_or_else(|| err("sign_in_required"))?,
                account.client_id,
            ));
        }
        let refresh = account
            .refresh_token
            .as_deref()
            .ok_or_else(|| err("sign_in_required"))?;
        // All callers hold gate, serializing rotating refreshes with logout/account changes.
        let result = self
            .token(&[
                ("grant_type", "refresh_token"),
                ("client_id", &account.client_id),
                ("refresh_token", refresh),
                ("resource", RESOURCE),
            ])
            .await;
        let reply = match result {
            Ok(reply) => reply,
            Err(e) => return Err(self.handle_refresh_failure(&account.client_id, e).await?),
        };
        let mut updated = account.clone();
        updated.access_token = Some(reply.access_token);
        updated.refresh_token = Some(
            reply
                .refresh_token
                .ok_or_else(|| err("invalid_token_response"))?,
        );
        updated.expires_at = now() + reply.expires_in;
        updated.scopes = reply.scope.split_whitespace().map(str::to_owned).collect();
        // Keep the previously validated identity hint: a refresh reply is not a new sign-in.
        let plan_enabled = updated.scopes.iter().any(|s| s == PLAN);
        let token = updated
            .access_token
            .clone()
            .ok_or_else(|| err("sign_in_required"))?;
        self.vault
            .lock()
            .await
            .accounts
            .insert(updated.client_id.clone(), updated);
        self.save().await?;
        if !plan_enabled {
            return Err(err("plan_permission_required"));
        }
        Ok((token, account.client_id))
    }
    pub async fn models(&self) -> Result<Vec<Model>, ConnectionError> {
        self.admission()?;
        let epoch = self.epoch.load(Ordering::SeqCst);
        let _lock = self.gate.try_lock().map_err(|_| err("connection_busy"))?;
        let _process_lock = self.process_lock()?;
        self.current(epoch)?;
        self.busy.store(true, Ordering::SeqCst);
        let _busy = Busy(&self.busy);
        let (token, client_id) = self.access().await?;
        self.current(epoch)?;

        let response = self
            .cancellable(epoch, async {
                self.http
                    .get("https://api.openai.com/v1/models")
                    .bearer_auth(token)
                    .send()
                    .await
                    .map_err(|_| err("network_unavailable"))
            })
            .await?;
        if !response.status().is_success() {
            return Err(provider_error(response).await);
        }
        let data: serde_json::Value = response
            .json()
            .await
            .map_err(|_| err("invalid_models_response"))?;
        self.current(epoch)?;
        let rows = data
            .get("models")
            .and_then(|v| v.as_array())
            .ok_or_else(|| err("invalid_models_response"))?;
        let models: Vec<Model> = rows
            .iter()
            .filter(|m| m.get("visibility").and_then(|v| v.as_str()) == Some("list"))
            .filter_map(|m| {
                Some(Model {
                    slug: m.get("slug")?.as_str()?.into(),
                    display_name: m.get("display_name")?.as_str()?.into(),
                })
            })
            .collect();
        *self.catalog.lock().await = Some((epoch, client_id, models.clone()));
        Ok(models)
    }
    /// Text-only, explicitly invoked input. No canvas/source reads or write tools.
    pub async fn respond(&self, model: &str, input: &str) -> Result<String, ConnectionError> {
        self.admission()?;
        if input.trim().is_empty()
            || input.len() > 64 * 1024
            || model.is_empty()
            || model.len() > 200
        {
            return Err(err("invalid_request"));
        }
        let epoch = self.epoch.load(Ordering::SeqCst);
        let _lock = self.gate.try_lock().map_err(|_| err("connection_busy"))?;
        let _process_lock = self.process_lock()?;
        self.current(epoch)?;
        self.busy.store(true, Ordering::SeqCst);
        let _busy = Busy(&self.busy);
        let active = self
            .vault
            .lock()
            .await
            .active
            .clone()
            .ok_or_else(|| err("sign_in_required"))?;
        let listed = self
            .catalog
            .lock()
            .await
            .as_ref()
            .is_some_and(|(e, id, models)| {
                *e == epoch && id == &active && models.iter().any(|m| m.slug == model)
            });
        if !listed {
            return Err(err("refresh_models_required"));
        }
        let (token, _) = self.access().await?;
        self.current(epoch)?;
        let mut response=self.cancellable(epoch,async {self.http.post("https://api.openai.com/v1/responses").bearer_auth(token).json(&serde_json::json!({"model":model,"input":[{"role":"user","content":input}],"store":false,"stream":true})).send().await.map_err(|_|err("network_unavailable"))}).await?;
        if !response.status().is_success() {
            return Err(provider_error(response).await);
        }
        let mut parser = TextStream::default();
        let mut size = 0;
        while let Some(chunk) = self
            .cancellable(epoch, async {
                response
                    .chunk()
                    .await
                    .map_err(|_| err("stream_interrupted"))
            })
            .await?
        {
            self.current(epoch)?;
            size += chunk.len();
            if size > MAX_REPLY {
                return Err(err("response_too_large"));
            }
            parser.push(&chunk)?;
        }
        self.current(epoch)?;
        parser.finish()
    }
    pub async fn disconnect(&self, client_id: &str) -> Result<ConnectionStatus, ConnectionError> {
        self.admission()?;
        self.cancel();
        let _lock = self.gate.lock().await;
        let _process_lock = self.process_lock()?;
        self.load().await?;
        let account = self
            .vault
            .lock()
            .await
            .accounts
            .get(client_id)
            .cloned()
            .ok_or_else(|| err("unknown_account"))?;
        self.busy.store(true, Ordering::SeqCst);
        let _busy = Busy(&self.busy);
        self.clear_account_tokens(client_id).await?;
        let revoke = if let Some(refresh) = &account.refresh_token {
            self.revoke(client_id, refresh).await
        } else {
            true
        };
        Ok(self
            .snapshot(if revoke {
                None
            } else {
                Some("revocation_unconfirmed".into())
            })
            .await)
    }
}

fn account_from_reply(
    client_id: String,
    identity: Claims,
    reply: TokenReply,
) -> Result<Account, ConnectionError> {
    if identity.sub.is_empty() || identity.exp <= now() {
        return Err(err("invalid_identity"));
    }
    Ok(Account {
        client_id,
        subject: identity.sub,
        email: identity.email,
        id_token: reply.id_token,
        access_token: Some(reply.access_token),
        refresh_token: reply.refresh_token,
        expires_at: now() + reply.expires_in,
        scopes: reply.scope.split_whitespace().map(str::to_owned).collect(),
    })
}
fn verify_identity(
    token: &str,
    client_id: &str,
    nonce: &str,
    keys: &JwkSet,
) -> Result<Claims, ConnectionError> {
    let header = decode_header(token).map_err(|_| err("invalid_identity"))?;
    if header.alg != Algorithm::RS256 {
        return Err(err("invalid_identity"));
    }
    let jwk = keys
        .find(
            header
                .kid
                .as_deref()
                .ok_or_else(|| err("invalid_identity"))?,
        )
        .ok_or_else(|| err("invalid_identity"))?;
    let key = DecodingKey::from_jwk(jwk).map_err(|_| err("invalid_identity"))?;
    let mut validation = Validation::new(Algorithm::RS256);
    validation.set_issuer(&[ISSUER]);
    validation.set_audience(&[client_id]);
    validation.leeway = 0;
    validation.set_required_spec_claims(&["exp", "iss", "aud", "sub"]);
    let claims = decode::<Claims>(token, &key, &validation)
        .map_err(|_| err("invalid_identity"))?
        .claims;
    let multiple_audiences = claims.aud.as_array().is_some_and(|a| a.len() > 1);
    if claims.nonce.as_deref() != Some(nonce)
        || claims.sub.is_empty()
        || claims.azp.as_ref().is_some_and(|p| p != client_id)
        || (multiple_audiences && claims.azp.as_deref() != Some(client_id))
    {
        return Err(err("invalid_identity"));
    }
    Ok(claims)
}
fn parse_callback(
    bytes: &[u8],
    redirect: &str,
    state: &str,
    client_id: &str,
) -> Result<(String, String), ConnectionError> {
    let request = std::str::from_utf8(bytes).map_err(|_| err("invalid_callback"))?;
    if !request.contains("\r\n\r\n") {
        return Err(err("invalid_callback"));
    }
    let mut lines = request.split("\r\n");
    let line = lines.next().ok_or_else(|| err("invalid_callback"))?;
    let parts: Vec<_> = line.split_whitespace().collect();
    if parts.len() != 3
        || parts[0] != "GET"
        || !parts[1].starts_with("/auth/callback?")
        || parts[2] != "HTTP/1.1"
    {
        return Err(err("invalid_callback"));
    }
    let expected = Url::parse(redirect).map_err(|_| err("invalid_callback"))?;
    let mut hosts = 0;
    for line in lines.take_while(|l| !l.is_empty()) {
        let Some((name, value)) = line.split_once(':') else {
            return Err(err("invalid_callback"));
        };
        if name.eq_ignore_ascii_case("host") {
            hosts += 1;
            if value.trim()
                != format!(
                    "127.0.0.1:{}",
                    expected.port().ok_or_else(|| err("invalid_callback"))?
                )
            {
                return Err(err("invalid_callback"));
            }
        }
        if name.eq_ignore_ascii_case("origin") {
            return Err(err("invalid_callback"));
        }
    }
    if hosts != 1 {
        return Err(err("invalid_callback"));
    }
    let url = expected
        .join(parts[1])
        .map_err(|_| err("invalid_callback"))?;
    if url.path() != "/auth/callback" || url.fragment().is_some() {
        return Err(err("invalid_callback"));
    }
    let mut params = BTreeMap::new();
    for (k, v) in url.query_pairs() {
        if params.insert(k.into_owned(), v.into_owned()).is_some() {
            return Err(err("invalid_callback"));
        }
    }
    if params.get("state").map(String::as_str) != Some(state) {
        return Err(err("invalid_callback"));
    }
    if params.contains_key("error") {
        return Err(err("access_denied"));
    }
    let issued = if client_id == "dynamic_agent_client" {
        params
            .get("client_id")
            .filter(|c| !c.is_empty() && c.as_str() != "dynamic_agent_client")
            .cloned()
            .ok_or_else(|| err("invalid_callback"))?
    } else {
        if params.get("client_id").is_some_and(|c| c != client_id) {
            return Err(err("invalid_callback"));
        }
        client_id.into()
    };
    let code = params
        .get("code")
        .filter(|c| !c.is_empty())
        .cloned()
        .ok_or_else(|| err("invalid_callback"))?;
    Ok((code, issued))
}
#[cfg(unix)]
fn open_process_lock(path: &std::path::Path) -> Result<std::fs::File, ConnectionError> {
    use std::os::unix::fs::{MetadataExt, OpenOptionsExt};
    let file = std::fs::OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .mode(0o600)
        .custom_flags(libc::O_NOFOLLOW)
        .open(path)
        .map_err(|_| err("credential_store_unavailable"))?;
    let metadata = file
        .metadata()
        .map_err(|_| err("credential_store_unavailable"))?;
    if !metadata.is_file()
        || metadata.uid() != unsafe { libc::geteuid() }
        || metadata.nlink() != 1
        || metadata.mode() & 0o077 != 0
    {
        return Err(err("credential_store_unavailable"));
    }
    file.try_lock().map_err(|_| err("connection_busy"))?;
    Ok(file)
}
#[cfg(not(unix))]
fn open_process_lock(_: &std::path::Path) -> Result<std::fs::File, ConnectionError> {
    Err(err("credential_store_unavailable"))
}
fn trusted_auth_url(raw: &str) -> Result<Url, ConnectionError> {
    let url = Url::parse(raw).map_err(|_| err("invalid_identity"))?;
    if url.scheme() != "https"
        || url.host_str() != Some("auth.openai.com")
        || url.port().is_some()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.fragment().is_some()
    {
        return Err(err("invalid_identity"));
    }
    Ok(url)
}
fn safe_machine(value: Option<&str>) -> Option<String> {
    value
        .filter(|s| {
            !s.is_empty()
                && s.len() <= 100
                && s.bytes()
                    .all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-')
        })
        .map(str::to_owned)
}
async fn provider_error(mut response: reqwest::Response) -> ConnectionError {
    let status = response.status().as_u16();
    let request_id = safe_machine(
        response
            .headers()
            .get("x-request-id")
            .and_then(|v| v.to_str().ok()),
    );
    let mut body = Vec::new();
    while let Ok(Some(chunk)) = response.chunk().await {
        if body.len() + chunk.len() > 32768 {
            body.clear();
            break;
        }
        body.extend_from_slice(&chunk);
    }
    let data: serde_json::Value = serde_json::from_slice(&body).unwrap_or(serde_json::Value::Null);
    let code = safe_machine(data.get("error").and_then(|v| {
        if v.is_string() {
            v.as_str()
        } else {
            v.get("code").and_then(|c| c.as_str())
        }
    }));
    let parameter = safe_machine(data.pointer("/error/param").and_then(|v| v.as_str()));
    let mut error = http_error(status);
    error.1 = Some(ProviderFailure {
        status,
        request_id,
        code,
        parameter,
    });
    error
}
fn http_error(status: u16) -> ConnectionError {
    err(match status {
        401 => "sign_in_required",
        403 => "plan_or_model_unavailable",
        429 => "usage_limit_reached",
        400 => "provider_request_rejected",
        _ => "provider_unavailable",
    })
}

#[derive(Default)]
struct TextStream {
    pending: Vec<u8>,
    event_data: Vec<String>,
    event_open: bool,
    skip_lf: bool,
    text: String,
    completed: bool,
    done: bool,
    failed: bool,
}
impl TextStream {
    fn push(&mut self, bytes: &[u8]) -> Result<(), ConnectionError> {
        if self.failed {
            return Err(err("invalid_stream"));
        }
        let result = self.push_inner(bytes);
        if result.is_err() {
            self.failed = true;
        }
        result
    }
    fn push_inner(&mut self, bytes: &[u8]) -> Result<(), ConnectionError> {
        // A CR, LF, or CRLF ends a line, even when CRLF spans chunks. Decode
        // only whole lines so a fragmented multibyte character stays intact.
        for &byte in bytes {
            if self.skip_lf {
                self.skip_lf = false;
                if byte == b'\n' {
                    continue;
                }
            }
            if byte == b'\r' || byte == b'\n' {
                self.skip_lf = byte == b'\r';
                let raw = std::mem::take(&mut self.pending);
                let line = std::str::from_utf8(&raw).map_err(|_| err("invalid_stream"))?;
                if line.is_empty() {
                    self.dispatch()?;
                    self.event_open = false;
                } else {
                    self.event_open = true;
                    if line.starts_with(':') {
                        continue;
                    }
                    let (field, value) = line.split_once(':').unwrap_or((line, ""));
                    if field == "data" {
                        // SSE removes exactly one optional ASCII space.
                        self.event_data
                            .push(value.strip_prefix(' ').unwrap_or(value).into());
                    }
                }
            } else {
                self.pending.push(byte);
            }
        }
        Ok(())
    }
    fn dispatch(&mut self) -> Result<(), ConnectionError> {
        if self.event_data.is_empty() {
            return Ok(());
        }
        let data = std::mem::take(&mut self.event_data).join("\n");
        if data == "[DONE]" {
            if !self.completed || self.done {
                return Err(err("invalid_stream"));
            }
            self.done = true;
            return Ok(());
        }
        if self.completed || self.done {
            return Err(err("invalid_stream"));
        }
        let event: serde_json::Value =
            serde_json::from_str(&data).map_err(|_| err("invalid_stream"))?;
        match event.get("type").and_then(|v| v.as_str()) {
            Some("response.output_text.delta") => {
                self.text.push_str(
                    event
                        .get("delta")
                        .and_then(|v| v.as_str())
                        .ok_or_else(|| err("invalid_stream"))?,
                );
            }
            Some("response.completed") => {
                if event.pointer("/response/status").and_then(|v| v.as_str()) != Some("completed") {
                    return Err(err("incomplete_response"));
                }
                self.completed = true;
            }
            Some("error" | "response.failed" | "response.incomplete") => {
                let detail = event
                    .get("error")
                    .or_else(|| event.pointer("/response/error"));
                let mut failure = err("incomplete_response");
                failure.1 = Some(ProviderFailure {
                    status: 200,
                    request_id: None,
                    code: safe_machine(detail.and_then(|v| v.get("code")).and_then(|v| v.as_str())),
                    parameter: safe_machine(
                        detail.and_then(|v| v.get("param")).and_then(|v| v.as_str()),
                    ),
                });
                return Err(failure);
            }
            Some(_) => {}
            None => return Err(err("invalid_stream")),
        }
        Ok(())
    }
    fn finish(self) -> Result<String, ConnectionError> {
        // EOF is not an event delimiter. Never trust a truncated terminal event
        // or return text after a parser error, even if completion was seen first.
        if self.failed
            || !self.completed
            || !self.pending.is_empty()
            || self.event_open
            || !self.event_data.is_empty()
            || self.text.trim().is_empty()
        {
            Err(err("incomplete_response"))
        } else {
            Ok(self.text)
        }
    }
}
#[cfg(all(target_os = "macos", not(test)))]
fn read_secret(service: &str) -> Result<Option<Vec<u8>>, ConnectionError> {
    match security_framework::passwords::get_generic_password(service, "chatgpt-connection-v1") {
        Ok(v) => Ok(Some(v)),
        Err(e) if e.code() == -25300 => Ok(None),
        Err(_) => Err(err("credential_store_unavailable")),
    }
}
#[cfg(all(target_os = "macos", not(test)))]
fn write_secret(service: &str, bytes: &[u8]) -> Result<(), ConnectionError> {
    security_framework::passwords::set_generic_password(service, "chatgpt-connection-v1", bytes)
        .map_err(|_| err("credential_store_unavailable"))
}
#[cfg(all(not(target_os = "macos"), not(test)))]
fn read_secret(_: &str) -> Result<Option<Vec<u8>>, ConnectionError> {
    Err(err("credential_store_unavailable"))
}
#[cfg(all(not(target_os = "macos"), not(test)))]
fn write_secret(_: &str, _: &[u8]) -> Result<(), ConnectionError> {
    Err(err("credential_store_unavailable"))
}

#[cfg(test)]
mod controller_tests {
    use super::*;
    fn account(id: &str, subject: &str) -> Account {
        Account {
            client_id: id.into(),
            subject: subject.into(),
            email: Some("same@example.test".into()),
            id_token: None,
            access_token: Some("SYNTHETIC_TOKEN_ONLY".into()),
            refresh_token: None,
            expires_at: now() + 300,
            scopes: vec![PLAN.into()],
        }
    }
    #[test]
    #[cfg(unix)]
    fn process_file_lock_excludes_other_handles_and_rejects_symlinks() {
        let path = std::env::temp_dir().join(format!("siwc-lock-test-{}", uuid::Uuid::new_v4()));
        let first = open_process_lock(&path).unwrap();
        assert_eq!(open_process_lock(&path).unwrap_err().0, "connection_busy");
        drop(first);
        drop(open_process_lock(&path).unwrap());
        std::fs::remove_file(&path).unwrap();
        let target = path.with_extension("target");
        std::fs::write(&target, b"synthetic nonsecret fixture").unwrap();
        std::os::unix::fs::symlink(&target, &path).unwrap();
        assert_eq!(
            open_process_lock(&path).unwrap_err().0,
            "credential_store_unavailable"
        );
        std::fs::remove_file(path).unwrap();
        std::fs::remove_file(target).unwrap();
    }
    #[test]
    #[cfg(unix)]
    fn process_lock_child_probe() {
        let Ok(path) = std::env::var("SIWC_SYNTHETIC_LOCK_PROBE") else {
            return;
        };
        assert_eq!(
            open_process_lock(std::path::Path::new(&path))
                .unwrap_err()
                .0,
            "connection_busy"
        );
    }
    #[test]
    #[cfg(unix)]
    fn separate_process_cannot_take_held_lock() {
        let path =
            std::env::temp_dir().join(format!("siwc-crossprocess-test-{}", uuid::Uuid::new_v4()));
        let held = open_process_lock(&path).unwrap();
        let result = std::process::Command::new(std::env::current_exe().unwrap())
            .args(["--exact", "controller_tests::process_lock_child_probe"])
            .env("SIWC_SYNTHETIC_LOCK_PROBE", &path)
            .output()
            .unwrap();
        assert!(result.status.success(), "synthetic child lock probe failed");
        drop(held);
        std::fs::remove_file(path).unwrap();
    }
    #[tokio::test]
    async fn reload_detects_another_process_account_switch() {
        let c = Controller::new("Test", "never-use-os-keychain", true).unwrap();
        c.loaded.store(true, Ordering::SeqCst);
        let mut restored = Vault::default();
        restored.active = Some("b".into());
        restored
            .accounts
            .insert("b".into(), account("b", "other-subject"));
        *c.test_store.lock().unwrap() = Some(serde_json::to_vec(&restored).unwrap());
        let old = c.epoch.load(Ordering::SeqCst);
        c.loaded.store(false, Ordering::SeqCst);
        c.load().await.unwrap();
        assert!(c.current(old).is_err());
        assert_eq!(
            c.snapshot(None).await.active_client_id.as_deref(),
            Some("b")
        );
    }
    #[tokio::test]
    async fn terminal_refresh_reconnects_but_temporary_failure_retains_session() {
        for code in [
            "invalid_grant",
            "invalid_client",
            "refresh_token_reused",
            "refresh_token_expired",
            "invalid_refresh_token",
            "token_expired",
            "refresh_token_invalidated",
        ] {
            let c = Controller::new("Test", "never-use-os-keychain", true).unwrap();
            c.loaded.store(true, Ordering::SeqCst);
            {
                let mut v = c.vault.lock().await;
                v.accounts.insert("a".into(), account("a", "s"));
                v.active = Some("a".into());
            }
            let error = ConnectionError(
                "provider_request_rejected".into(),
                Some(ProviderFailure {
                    status: 400,
                    request_id: Some("req_synthetic".into()),
                    code: Some(code.into()),
                    parameter: None,
                }),
            );
            let error = c.handle_refresh_failure("a", error).await.unwrap();
            assert_eq!(error.0, "sign_in_required");
            assert_eq!(error.1.unwrap().code.as_deref(), Some(code));
            let status = c.snapshot(None).await;
            assert!(!status.accounts[0].connected);
            assert!(status.active_client_id.is_none());
        }
        let c = Controller::new("Test", "never-use-os-keychain", true).unwrap();
        c.loaded.store(true, Ordering::SeqCst);
        {
            let mut v = c.vault.lock().await;
            v.accounts.insert("a".into(), account("a", "s"));
            v.active = Some("a".into());
        }
        let error = c
            .handle_refresh_failure(
                "a",
                ConnectionError(
                    "provider_unavailable".into(),
                    Some(ProviderFailure {
                        status: 503,
                        request_id: None,
                        code: Some("temporarily_unavailable".into()),
                        parameter: None,
                    }),
                ),
            )
            .await
            .unwrap();
        assert_eq!(error.0, "provider_unavailable");
        assert!(c.snapshot(None).await.accounts[0].connected);
    }
    #[tokio::test]
    async fn same_email_accounts_stay_separate_and_cancel_invalidates_catalog() {
        let c = Controller::new("Test", "never-use-os-keychain", true).unwrap();
        c.loaded.store(true, Ordering::SeqCst);
        {
            let mut v = c.vault.lock().await;
            v.accounts.insert("a".into(), account("a", "subjectA"));
            v.accounts.insert("b".into(), account("b", "subjectB"));
            v.active = Some("a".into());
        }
        c.save().await.unwrap();
        let epoch = c.epoch.load(Ordering::SeqCst);
        *c.catalog.lock().await = Some((
            epoch,
            "a".into(),
            vec![Model {
                slug: "fixture-model".into(),
                display_name: "Fixture".into(),
            }],
        ));
        c.select("b").await.unwrap();
        assert!(c.current(epoch).is_err());
        let status = c.status().await;
        assert_eq!(status.accounts.len(), 2);
        assert_eq!(status.active_client_id.as_deref(), Some("b"));
        assert_eq!(
            c.respond("fixture-model", "never sent")
                .await
                .unwrap_err()
                .0,
            "refresh_models_required"
        );
    }
    #[tokio::test]
    async fn busy_request_refused_instead_of_queueing_across_accounts() {
        let c = Controller::new("Test", "never-use-os-keychain", true).unwrap();
        let _lock = c.gate.lock().await;
        assert_eq!(c.models().await.unwrap_err().0, "connection_busy");
        assert_eq!(
            c.respond("model", "never sent").await.unwrap_err().0,
            "connection_busy"
        );
        assert!(!c.loaded.load(Ordering::SeqCst));
    }
    #[tokio::test]
    async fn cancellation_drops_pending_network_future() {
        let c = Controller::new("Test", "never-use-os-keychain", true).unwrap();
        let epoch = c.epoch.load(Ordering::SeqCst);
        c.cancel();
        let result = c
            .cancellable(epoch, std::future::pending::<Result<(), ConnectionError>>())
            .await;
        assert_eq!(result.unwrap_err().0, "cancelled");
    }
    #[tokio::test]
    async fn identity_only_cannot_send_inference() {
        let c = Controller::new("Test", "never-use-os-keychain", true).unwrap();
        c.loaded.store(true, Ordering::SeqCst);
        {
            let mut v = c.vault.lock().await;
            let mut a = account("a", "s");
            a.scopes.clear();
            v.accounts.insert("a".into(), a);
            v.active = Some("a".into());
        }
        assert_eq!(c.access().await.unwrap_err().0, "plan_permission_required");
    }
    #[tokio::test]
    async fn local_signout_preserves_registration_but_removes_all_tokens() {
        let c = Controller::new("Test", "never-use-os-keychain", true).unwrap();
        c.loaded.store(true, Ordering::SeqCst);
        {
            let mut v = c.vault.lock().await;
            v.host_id = Some("urn:uuid:fixture".into());
            v.accounts.insert("a".into(), account("a", "s"));
            v.active = Some("a".into());
        }
        c.clear_account_tokens("a").await.unwrap();
        let v = c.vault.lock().await;
        let a = v.accounts.get("a").unwrap();
        assert!(a.access_token.is_none() && a.refresh_token.is_none() && a.id_token.is_none());
        assert!(v.active.is_none());
        assert!(v.host_id.is_some());
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    fn callback(query: &str) -> Vec<u8> {
        format!(
            "GET /auth/callback?{} HTTP/1.1\r\nHost: 127.0.0.1:4567\r\n\r\n",
            query
        )
        .into_bytes()
    }
    #[test]
    fn callback_binds_state_and_registration() {
        let uri = "http://127.0.0.1:4567/auth/callback";
        assert_eq!(
            parse_callback(
                &callback("code=x&state=s&client_id=oaiapp_test"),
                uri,
                "s",
                "dynamic_agent_client"
            )
            .unwrap(),
            ("x".into(), "oaiapp_test".into())
        );
        for q in [
            "code=x&state=wrong&client_id=c",
            "code=x&state=s",
            "code=x&state=s&client_id=dynamic_agent_client",
            "code=x&state=s&state=s&client_id=c",
        ] {
            assert!(parse_callback(&callback(q), uri, "s", "dynamic_agent_client").is_err());
        }
    }
    #[test]
    fn returning_client_cannot_be_replaced() {
        let uri = "http://127.0.0.1:4567/auth/callback";
        assert!(parse_callback(
            &callback("code=x&state=s&client_id=other"),
            uri,
            "s",
            "saved"
        )
        .is_err());
        assert_eq!(
            parse_callback(&callback("code=x&state=s"), uri, "s", "saved")
                .unwrap()
                .1,
            "saved"
        );
    }
    #[test]
    fn callback_rejects_origin_host_path_and_post() {
        let valid = String::from_utf8(callback("code=x&state=s")).unwrap();
        for invalid in [
            valid.replace("GET ", "POST "),
            valid.replace("127.0.0.1:4567", "localhost:4567"),
            valid.replace("/auth/callback?", "/callback?"),
            valid.replace("\r\n\r\n", "\r\nOrigin: http://evil.test\r\n\r\n"),
        ] {
            assert!(parse_callback(
                invalid.as_bytes(),
                "http://127.0.0.1:4567/auth/callback",
                "s",
                "saved"
            )
            .is_err());
        }
    }
    #[test]
    fn denial_needs_valid_state() {
        assert_eq!(
            parse_callback(
                &callback("error=access_denied&state=s"),
                "http://127.0.0.1:4567/auth/callback",
                "s",
                "saved"
            )
            .unwrap_err(),
            err("access_denied")
        );
        assert_eq!(
            parse_callback(
                &callback("error=access_denied&state=bad"),
                "http://127.0.0.1:4567/auth/callback",
                "s",
                "saved"
            )
            .unwrap_err(),
            err("invalid_callback")
        );
    }
    #[test]
    fn incomplete_stream_never_returns_partial_text() {
        let mut p = TextStream::default();
        p.push(b"data: {\"type\":\"response.output_text.delta\",\"delta\":\"partial\"}\n\n")
            .unwrap();
        assert_eq!(p.finish().unwrap_err(), err("incomplete_response"));
    }
    #[test]
    fn fragmented_utf8_waits_for_complete_event() {
        let all="data: {\"type\":\"response.output_text.delta\",\"delta\":\"caf\u{e9}\"}\n\ndata: {\"type\":\"response.completed\",\"response\":{\"status\":\"completed\"}}\n\n";
        let mut p = TextStream::default();
        for b in all.as_bytes() {
            p.push(&[*b]).unwrap();
        }
        assert_eq!(p.finish().unwrap(), "café");
    }
    #[test]
    fn failed_or_incomplete_completion_denied() {
        for event in [
            "{\"type\":\"response.failed\"}",
            "{\"type\":\"response.incomplete\"}",
            "{\"type\":\"response.completed\",\"response\":{\"status\":\"incomplete\"}}",
        ] {
            let mut p = TextStream::default();
            assert!(p.push(format!("data: {}\n\n", event).as_bytes()).is_err());
        }
    }
    const DELTA_EVENT: &str =
        "data: {\"type\":\"response.output_text.delta\",\"delta\":\"ok\"}\n\n";
    const COMPLETED_EVENT: &str =
        "data: {\"type\":\"response.completed\",\"response\":{\"status\":\"completed\"}}\n\n";
    #[test]
    fn sse_multiline_data_waits_for_blank_line() {
        let mut p = TextStream::default();
        p.push(b": heartbeat\nevent: response.output_text.delta\ndata: {\"type\":\"response.output_text.delta\",\ndata: \"delta\":\"ok\"}\n").unwrap();
        assert!(p.text.is_empty());
        p.push(b"\n").unwrap();
        assert_eq!(p.text, "ok");
        p.push(COMPLETED_EVENT.as_bytes()).unwrap();
        assert_eq!(p.finish().unwrap(), "ok");
    }
    #[test]
    fn sse_all_line_endings_and_chunk_boundaries() {
        for ending in ["\n", "\r\n", "\r"] {
            let stream = format!("{}{}", DELTA_EVENT, COMPLETED_EVENT).replace('\n', ending);
            for split in 0..=stream.len() {
                let mut p = TextStream::default();
                p.push(&stream.as_bytes()[..split]).unwrap();
                p.push(&stream.as_bytes()[split..]).unwrap();
                assert_eq!(p.finish().unwrap(), "ok");
            }
        }
    }
    #[test]
    fn sse_truncated_event_cannot_complete_or_follow_completion() {
        for tail in [
            COMPLETED_EVENT.trim_end_matches('\n'),
            COMPLETED_EVENT.trim_end_matches('\n').to_owned().as_str(),
        ] {
            let mut p = TextStream::default();
            p.push(DELTA_EVENT.as_bytes()).unwrap();
            p.push(tail.as_bytes()).unwrap();
            assert!(p.finish().is_err());
        }
        let mut p = TextStream::default();
        p.push(format!("{}{}data: partial", DELTA_EVENT, COMPLETED_EVENT).as_bytes())
            .unwrap();
        assert!(p.finish().is_err());
        let mut p = TextStream::default();
        p.push(format!("{}{}", DELTA_EVENT, COMPLETED_EVENT.trim_end_matches('\n')).as_bytes())
            .unwrap();
        p.push(b"\n").unwrap();
        assert!(!p.completed);
        assert!(p.finish().is_err());
    }
    #[test]
    fn sse_duplicate_terminal_and_post_terminal_data_poison_stream() {
        for extra in [
            COMPLETED_EVENT,
            DELTA_EVENT,
            "data: {\"type\":\"response.failed\"}\n\n",
            "data: {\"type\":\"unknown\"}\n\n",
        ] {
            let mut p = TextStream::default();
            p.push(format!("{}{}", DELTA_EVENT, COMPLETED_EVENT).as_bytes())
                .unwrap();
            assert!(p.push(extra.as_bytes()).is_err());
            assert!(p.finish().is_err());
        }
    }
    #[test]
    fn sse_done_is_not_completion_and_must_not_repeat() {
        let mut p = TextStream::default();
        assert!(p.push(b"data: [DONE]\n\n").is_err());
        let mut p = TextStream::default();
        p.push(format!("{}{}data: [DONE]\n\n", DELTA_EVENT, COMPLETED_EVENT).as_bytes())
            .unwrap();
        assert_eq!(p.finish().unwrap(), "ok");
        let mut p = TextStream::default();
        assert!(p
            .push(
                format!(
                    "{}{}data: [DONE]\n\ndata: [DONE]\n\n",
                    DELTA_EVENT, COMPLETED_EVENT
                )
                .as_bytes()
            )
            .is_err());
        assert!(p.finish().is_err());
    }
    #[test]
    fn sse_late_failure_preserves_only_machine_details() {
        let mut p = TextStream::default();
        p.push(DELTA_EVENT.as_bytes()).unwrap();
        let failure = p.push(b"data: {\"type\":\"response.failed\",\"response\":{\"error\":{\"code\":\"subscription_sharing_usage_limit_exceeded\",\"param\":\"model\",\"message\":\"SENSITIVE DIAGNOSTIC\"}}}\n\n").unwrap_err();
        assert_eq!(failure.0, "incomplete_response");
        let details = failure.1.as_ref().unwrap();
        assert_eq!(details.status, 200);
        assert_eq!(
            details.code.as_deref(),
            Some("subscription_sharing_usage_limit_exceeded")
        );
        assert_eq!(details.parameter.as_deref(), Some("model"));
        assert!(!serde_json::to_string(&failure)
            .unwrap()
            .contains("SENSITIVE"));
        assert!(p.finish().is_err());
    }
    #[test]
    fn sse_invalid_utf8_json_and_missing_type_fail_closed() {
        for invalid in [
            b"data: \xff\n\n".as_slice(),
            b"data: {\n\n",
            b"data: {}\n\n",
            b"data\n\n",
        ] {
            let mut p = TextStream::default();
            assert!(p.push(invalid).is_err());
            assert!(p.finish().is_err());
        }
    }
    #[tokio::test]
    async fn admission_gate_does_not_touch_storage_or_open_browser() {
        let c = Controller::new("Test", "never-created-test-service", false).unwrap();
        assert!(!c.status().await.available);
        assert_eq!(
            c.connect(|_| panic!("browser must not open"), None)
                .await
                .unwrap_err(),
            err("provider_admission_required")
        );
        assert!(c.models().await.is_err());
        assert!(c.respond("model", "test").await.is_err());
        assert!(!c.loaded.load(Ordering::SeqCst));
    }
    #[test]
    fn summary_cannot_serialize_credentials() {
        let a = Account {
            client_id: "c".into(),
            subject: "s".into(),
            email: None,
            id_token: Some("SECRET_ID".into()),
            access_token: Some("SECRET_ACCESS".into()),
            refresh_token: Some("SECRET_REFRESH".into()),
            expires_at: 0,
            scopes: vec![],
        };
        let text = serde_json::to_string(&a.summary()).unwrap();
        assert!(!text.contains("SECRET"));
        assert!(!a.summary().plan_enabled);
    }
}

#[cfg(test)]
#[path = "jwt_tests.rs"]
mod jwt_tests;
