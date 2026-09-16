# CREATE SOMETHING attended Mac support

Owner: Micah. Tracking: [CRE-2014](https://linear.app/createsomething/issue/CRE-2014/ship-rustdesk-production-endpoint-and-grant-apple-silicon-onboarding).

RustDesk provides machine access. Local agents, Composio authentication and Git remain separate. Clients personally approve account/OAuth actions. The shared kit supplies the official Apple Silicon client, a native server-settings import and a short guide for any client who needs attended support. It does not configure permanent passwords, install a client startup service, enroll Grant automatically, or provide Pro tenant management/audit features.

## Deployed endpoint

- DNS-only A: `support.createsomething.io` → `198.199.76.7` (Cloudflare, createsomething.io).
- DigitalOcean Droplet `600906577`, `cs-rustdesk-pilot-01`, NYC1, Ubuntu 24.04, 1 vCPU / 1 GB / 25 GB; approved $6/month base plus applicable tax/overages. No extra paid services added.
- RustDesk OSS 1.1.16, immutable multiarch image in `compose.yaml`.
- TCP 21115–21117 and UDP 21116 publicly reachable; SSH TCP 22 key-only. UFW default-deny blocks web-client ports 21118/21119 despite internal listeners. Host networking is intentional.
- `/opt/rustdesk/data` holds the server keys and SQLite database. Directory 0700, private key 0600. Never put its contents in Git or a client bundle.
- Server public key: `7SYSc0h6a+0ibKDmAwDXwZo9dkvNOMMSvGtZbU2BT+Q=`.
- Native client traffic goes directly to DigitalOcean. Cloudflare Tunnel/orange-cloud HTTP proxy is not in this TCP/UDP path.

The rendezvous process still advertises `198.199.76.7:21117`, the tested relay. Client imports explicitly use the hostname for ID and relay. These resolve to the same services and keys; no relay policy or transport changed. On a future server move, restore keys/data, update the advertised relay and DNS, then repeat a real remote session before cutover.

## Client delivery

Use [the client support procedure](CLIENT-SUPPORT.md) for each engagement. [Client record fields](client-record.md) belong in the client's Linear project; the shared kit carries no client identity.

Run `python3 ops/rustdesk/package.py`. The script downloads the exact official ARM64 DMG, verifies its pinned SHA-256, checks the configuration payload and its reference from the guide, and creates a ZIP outside Git in `~/.codex/artifacts/client-support/apple-silicon/`.

Deliver the ZIP privately to the authorized client contact when sending is approved. The client opens `START-HERE.html`, installs the official app, grants macOS permissions, imports the settings, and uses a one-time password for an agreed session. Building the kit does not send it or grant access.

Test each client device after installation and a restart to Ready. Confirm screen display, pointer movement and typing with the support operator. Have the client quit RustDesk, then confirm the session ends. Keep RustDesk closed between attended sessions. Disconnecting one session alone does not prove permanent revocation; remove permissions or uninstall when support ends. Do not claim unattended support, client isolation policies or centralized approval from the OSS server.

## Health and recovery

Server `rustdesk-backup.timer` runs `backup.py` every six hours. SQLite's backup API takes a consistent snapshot without stopping support. The archive contains compose, the server key pair, and the database. It is age-encrypted using only the public recipient in `/etc/rustdesk-backup.recipient`. Up to 120 snapshots are retained in `/var/backups/rustdesk` (normally 30 days).

The operator Mac has:

```text
~/Library/Application Support/CREATE SOMETHING/RustDesk Operations/
  recovery.agekey              # secret, 0600; never send to clients or commit
  recipient.txt                # public encryption recipient
  backups/*.tar.age            # encrypted off-host copies
  check-and-pull.sh
  status.txt                   # latest health result
  monitor.log / monitor-error.log
  restore-verification.txt
~/Library/LaunchAgents/io.createsomething.rustdesk-operations.plist
```

The LaunchAgent runs hourly while this user is logged in and awake. It checks public TCP ports, both containers, backup age (<450 minutes), disk reporting and successful off-host copy. Its first scheduled run exited 0. It writes a local status receipt; **there is no independent pager/email alert or 24/7 availability guarantee**. Review the receipt before each support session. The Mac must be online to pull snapshots. A lost Mac/key can prevent recovery; keep a separately secured copy of `recovery.agekey` under the owner's normal recovery process. That additional escrow is not established by this release.

```bash
cat "$HOME/Library/Application Support/CREATE SOMETHING/RustDesk Operations/status.txt"
bash "$HOME/Library/Application Support/CREATE SOMETHING/RustDesk Operations/check-and-pull.sh"
ssh -i ~/.ssh/id_ed25519_createsomething root@198.199.76.7 \
  'cd /opt/rustdesk && docker compose ps && systemctl list-timers rustdesk-backup.timer'
```

SSH disables password and keyboard-interactive authentication and permits root only with keys (`/etc/ssh/sshd_config.d/00-cs-rustdesk.conf`, MaxAuthTries 3). This is a single host with key-only administration, not a high-availability cluster. Docker restart policies recover exited containers; periodic checks do not replace an external monitor. Coordinate OS updates/reboots outside a support session.

### Recovery procedure

1. Select the latest **known-good** encrypted archive from the operator backup directory. Decrypt using `age -d -i` and the local recovery identity into a private temporary directory. Confirm SQLite `PRAGMA integrity_check` is `ok` and the public key equals the value above. Never print the private key.
2. Prepare/rebuild an Ubuntu host with Docker Compose, age, SSH key-only auth and the stated firewall rules. Preserve existing data before replacing it. Do not create fresh RustDesk keys over the recovered keys.
3. Stop RustDesk, restore `compose.yaml` and `data/` beneath `/opt/rustdesk`, root-owned with directory 0700 and private key 0600. If the IP changed, update compose's advertised relay and the DNS-only A record. Start with `docker compose up -d` from `/opt/rustdesk`.
4. Install the backup script, units and public recipient again. Run one backup and off-host pull; verify both containers, DNS and ports.
5. Connect a real operator/client pair using the released hostname/config. Verify screen/control/disconnect before resuming client support.

A local isolated restore was exercised from the encrypted off-host archive: decryption, exact key match, database integrity/peer record, and both pinned-image binaries listening with no published ports. This proves recovery of the data and service startup, not a live replacement-host cutover.

### Rollback

The hostname is additive. Previous client settings (`198.199.76.7` and `198.199.76.7:21117`, same public key, blank API) remain the fallback. The deployed server compose/relay behavior was preserved. To disable the new backup job: `systemctl disable --now rustdesk-backup.timer` on the server. To disable the local monitor: `launchctl bootout gui/$(id -u) "$HOME/Library/LaunchAgents/io.createsomething.rustdesk-operations.plist"`. Preserve recovery files and existing snapshots. Removing a DNS record does not stop the server or revoke client access. Stopping the Droplet does not stop DigitalOcean billing.

## Evidence — September 16, 2026 UTC

- Cellular iPhone test 03:49:13–03:51:38: server paired relay, Mac screen visible, user confirmed control, relay closed after disconnect. This was Micah's Mac, not Grant's.
- Cloudflare DNS UI: A record, DNS only; public 1.1.1.1 readback `198.199.76.7`; TCP 21115/21116/21117 reachable.
- Native RustDesk 1.4.9 export/import: both hostname fields populated, API empty, matching public key, successful apply. Quit/relaunch → Ready. Saved public settings match the shipped import and a live server TCP 21116 connection was observed.
- Official ARM64 app: `spctl --assess --type execute` accepted, Notarized Developer ID, team HZF9JMC8YN. DMG SHA-256 `f7935597b247d42c8f2a2ed71176a9f5868018cd9e1a33b8096418a668c8caf0`.
- Encrypted archive `rustdesk-20260916T040252Z.tar.age` restored successfully; both binaries started from recovered data in isolated local Docker. The network-disabled test logged “Failed to generate new id” but loaded the existing server key/database and listened successfully. No test listener was published and test containers/plaintext were removed.
- Hourly LaunchAgent first run 04:06:42 passed; six-hour server timer active; SSH reconnected after hardening.

Sources: [RustDesk configuration/import](https://rustdesk.com/docs/en/self-host/client-configuration/), [OSS Docker](https://rustdesk.com/docs/en/self-host/rustdesk-server-oss/docker/), [official 1.4.9 release](https://github.com/rustdesk/rustdesk/releases/tag/1.4.9).
