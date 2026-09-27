use client_workspace_connector::{approval_matches, Config};
use serde_json::{json, Value};

fn fixture() -> Value {
    json!({
        "version": 1, "client_id": "synthetic-client", "hostname": "workspace.example.com",
        "access_team": "synthetic-team", "access_audience": "a".repeat(64),
        "allowed_email": "operator@example.com",
        "tunnel_id": "11111111-2222-4333-8444-555555555555",
        "credentials_file": "/synthetic/tunnel.json", "resources": "/synthetic/release",
        "codex_bin": "/synthetic/bin/codex", "client_home": "/synthetic/home",
        "state_dir": "/synthetic/connector", "port": 21934
    })
}

#[test]
fn explicit_config_is_required_and_unknown_authority_is_rejected() {
    let valid = fixture();
    for key in valid.as_object().unwrap().keys() {
        let mut missing = valid.clone();
        missing.as_object_mut().unwrap().remove(key);
        assert!(
            Config::parse(&missing.to_string()).is_err(),
            "missing {key}"
        );
    }
    let mut extra = valid.clone();
    extra["command"] = json!("sh -c unsafe");
    assert!(Config::parse(&extra.to_string()).is_err());
    assert!(Config::parse(&valid.to_string()).is_ok());
}

#[test]
fn rejects_ambiguous_or_injectable_config() {
    for (key, values) in [
        (
            "hostname",
            vec![
                "http://example.com",
                "*.example.com",
                "example.com/path",
                "localhost",
                "example.com\n",
            ],
        ),
        (
            "access_team",
            vec!["", "https://team.cloudflareaccess.com", "a/b"],
        ),
        ("access_audience", vec!["", "a,b", "\n"]),
        (
            "allowed_email",
            vec!["", "*@example.com", "a@b\nx", " a@b.com"],
        ),
        ("client_id", vec!["../other", "", "client\n"]),
        ("tunnel_id", vec!["--help", "not-a-uuid"]),
        ("state_dir", vec!["relative", "/", "/a/../b"]),
    ] {
        for value in values {
            let mut invalid = fixture();
            invalid[key] = json!(value);
            assert!(
                Config::parse(&invalid.to_string()).is_err(),
                "{key}={value:?}"
            );
        }
    }
    for value in [0, 80, 65536] {
        let mut invalid = fixture();
        invalid["port"] = json!(value);
        assert!(Config::parse(&invalid.to_string()).is_err());
    }
}

#[test]
fn tunnel_has_one_exact_route_access_validation_and_deny_fallback() {
    let config = Config::parse(&fixture().to_string()).unwrap();
    let tunnel = config.tunnel_config();
    assert_eq!(tunnel["ingress"].as_array().unwrap().len(), 2);
    assert_eq!(tunnel["ingress"][0]["hostname"], "workspace.example.com");
    assert_eq!(tunnel["ingress"][0]["service"], "http://127.0.0.1:21934");
    assert_eq!(
        tunnel["ingress"][0]["originRequest"]["access"],
        json!({
            "required": true, "teamName": "synthetic-team", "audTag": ["a".repeat(64)]
        })
    );
    assert_eq!(tunnel["ingress"][1]["service"], "http_status:404");
    assert!(tunnel.get("token").is_none());
}

#[test]
fn runtime_environment_preserves_origin_auth_and_signed_delivery_boundary() {
    let config = Config::parse(&fixture().to_string()).unwrap();
    let env = config.runtime_env("b".repeat(64).as_str());
    assert_eq!(env["HOST"], "127.0.0.1");
    assert_eq!(env["CLIENT_WORKSPACE_REMOTE"], "1");
    assert_eq!(env["CLIENT_WORKSPACE_DESKTOP"], "1");
    assert_eq!(
        env["CLIENT_WORKSPACE_LOOPBACK_ORIGIN"],
        "http://127.0.0.1:21934"
    );
    assert_eq!(env["CLIENT_WORKSPACE_CAPABILITY_TOKEN"], "b".repeat(64));
    assert_eq!(env["CLIENT_WORKSPACE_MANAGED_CONNECTOR"], "1");
    assert_eq!(
        env["CLIENT_WORKSPACE_REMOTE_ORIGIN"],
        "https://workspace.example.com"
    );
    assert_eq!(
        env["CLIENT_WORKSPACE_ACCESS_TEAM_DOMAIN"],
        "https://synthetic-team.cloudflareaccess.com"
    );
    assert_eq!(env["CLIENT_WORKSPACE_ACCESS_EMAIL"], "operator@example.com");
    assert_eq!(
        env["CLIENT_WORKSPACE_TRUST_KEYRING_FILE"],
        "/synthetic/release/trust/client-workspace-trust-keyring.json"
    );
    for forbidden in ["ORIGIN", "OPENAI_API_KEY", "CODEX_HOME", "TUNNEL_TOKEN"] {
        assert!(!env.contains_key(forbidden));
    }
}

#[test]
fn approval_is_exact_and_bound_to_client() {
    assert!(approval_matches(
        "synthetic-client",
        "CONNECT synthetic-client\n"
    ));
    for answer in [
        "yes",
        "CONNECT other\n",
        "CONNECT synthetic-client extra",
        "",
        "CONNECT synthetic-client\nignored",
    ] {
        assert!(!approval_matches("synthetic-client", answer));
    }
}
