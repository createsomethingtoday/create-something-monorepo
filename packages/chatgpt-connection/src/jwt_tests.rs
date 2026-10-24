//! Public synthetic fixtures, never real credentials or signing keys.
use super::*;
use jsonwebtoken::{encode, EncodingKey, Header};

fn claims() -> serde_json::Value {
    serde_json::json!({"iss": ISSUER, "aud": "oaiapp_synthetic", "sub": "synthetic-subject", "exp": now()+3600, "iat": now(), "nonce": "synthetic-nonce"})
}
fn keys() -> JwkSet {
    serde_json::from_str(include_str!("../tests/fixtures/synthetic-jwks.json")).unwrap()
}
fn signed(value: &serde_json::Value) -> String {
    let mut header = Header::new(Algorithm::RS256);
    header.kid = Some("synthetic-test-key".into());
    let key = EncodingKey::from_rsa_pem(include_bytes!(
        "../tests/fixtures/synthetic-rsa-test-only.pem"
    ))
    .unwrap();
    encode(&header, value, &key).unwrap()
}
fn accepted(token: &str) -> bool {
    verify_identity(token, "oaiapp_synthetic", "synthetic-nonce", &keys()).is_ok()
}

#[test]
fn valid_signed_synthetic_identity_is_accepted() {
    assert!(accepted(&signed(&claims())));
}

#[test]
fn signed_identity_rejects_wrong_or_missing_required_claims() {
    for (field, wrong) in [
        ("iss", serde_json::json!("https://attacker.invalid")),
        ("aud", serde_json::json!("another-client")),
        ("nonce", serde_json::json!("another-attempt")),
        ("exp", serde_json::json!(now() - 3600)),
        ("sub", serde_json::json!("")),
    ] {
        let mut value = claims();
        value[field] = wrong;
        assert!(!accepted(&signed(&value)), "accepted wrong {field}");
        let mut value = claims();
        value.as_object_mut().unwrap().remove(field);
        assert!(!accepted(&signed(&value)), "accepted missing {field}");
    }
}

#[test]
fn signature_tampering_unknown_key_and_algorithm_confusion_are_rejected() {
    let valid = signed(&claims());
    let mut parts: Vec<String> = valid.split('.').map(str::to_owned).collect();
    let mut signature = URL_SAFE_NO_PAD.decode(&parts[2]).unwrap();
    signature[0] ^= 1;
    parts[2] = URL_SAFE_NO_PAD.encode(signature);
    assert!(!accepted(&parts.join(".")));
    let mut unknown = Header::new(Algorithm::RS256);
    unknown.kid = Some("unknown-key".into());
    let key = EncodingKey::from_rsa_pem(include_bytes!(
        "../tests/fixtures/synthetic-rsa-test-only.pem"
    ))
    .unwrap();
    assert!(!accepted(&encode(&unknown, &claims(), &key).unwrap()));
    let mut symmetric = Header::new(Algorithm::HS256);
    symmetric.kid = Some("synthetic-test-key".into());
    assert!(!accepted(
        &encode(
            &symmetric,
            &claims(),
            &EncodingKey::from_secret(b"synthetic-public-test-data")
        )
        .unwrap()
    ));
    let mut no_key_id = Header::new(Algorithm::RS256);
    no_key_id.kid = None;
    assert!(!accepted(&encode(&no_key_id, &claims(), &key).unwrap()));
}

#[test]
fn multiple_audiences_require_the_matching_authorized_party() {
    let mut value = claims();
    value["aud"] = serde_json::json!(["oaiapp_synthetic", "another-client"]);
    assert!(!accepted(&signed(&value)));
    value["azp"] = serde_json::json!("another-client");
    assert!(!accepted(&signed(&value)));
    value["azp"] = serde_json::json!("oaiapp_synthetic");
    assert!(accepted(&signed(&value)));
}
